import { Api } from '../api/index.js';
import { AuthError, describeError, OrbitxError, StateError } from '../errors.js';
import { METHOD, UPDATE_KINDS } from '../protocol.js';
import { VERSION } from '../version.js';
import { sleep } from '../utils/async.js';
import { Context } from './context.js';
import { loadModules } from './loader.js';
import { Poller } from './poller.js';
import { Router } from './router.js';
import { Scheduler } from './scheduler.js';
import { Waiters } from './waiters.js';
const LONG_POLL_MARGIN_MS = 15_000;
/** A bot: handlers, the API and the loop that listens. / Un bot: manejadores, la API y el ciclo que escucha. */
export class Bot extends Router {
    config;
    api;
    logger;
    me = null;
    #scheduler;
    #waiters = new Waiters();
    #pipeline;
    #startHooks = [];
    #stopHooks = [];
    #tasks = [];
    #timers = new Set();
    #errorHandler;
    #poller = null;
    #finished = null;
    #running = false;
    #ticking = false;
    constructor(config) {
        super({ scope: 'all' });
        this.config = config;
        this.logger = config.logger;
        this.api = new Api(config);
        this.#scheduler = new Scheduler(config.polling.concurrency);
        this.#pipeline = this.middleware();
        this.#errorHandler = (error, ctx) => this.#logFailure(error, ctx);
    }
    get running() {
        return this.#running;
    }
    /** What to do with an error of a handler (by default it is logged). / Qué hacer con el error de un manejador (por defecto se registra). */
    onError(handler) {
        this.#errorHandler = handler;
        return this;
    }
    /** Runs once the bot is connected and before it listens. / Corre cuando el bot ya conectó y antes de escuchar. */
    onStart(hook) {
        this.#startHooks.push(hook);
        return this;
    }
    /** Runs when the bot stops, after the handlers in progress. / Corre cuando el bot se detiene, después de los manejadores en curso. */
    onStop(hook) {
        this.#stopHooks.push(hook);
        return this;
    }
    /** Repeats a task while the bot runs. / Repite una tarea mientras el bot corre. */
    every(everyMs, run, options = {}) {
        this.#tasks.push({ everyMs: Math.max(1, everyMs), run, immediate: options.immediate ?? false });
        return this;
    }
    /** Imports every module of a folder and mounts it. / Importa cada módulo de una carpeta y lo monta. */
    loadModules(dir, options) {
        return loadModules(this, dir, options);
    }
    /** Sends the same message to many chats, one after another. / Envía el mismo mensaje a muchos chats, uno tras otro. */
    async broadcast(chats, text, options = {}) {
        const { delayMs = 100, ...send } = options;
        const report = { sent: [], failed: [] };
        for (const chat of new Set(chats)) {
            try {
                await this.api.messages.send(chat, text, send);
                report.sent.push(chat);
            }
            catch (error) {
                if (error instanceof AuthError)
                    throw error;
                report.failed.push({ chat, error });
            }
            if (delayMs > 0)
                await sleep(delayMs);
        }
        return report;
    }
    /** Waits for the next message of the author of `ctx`. / Espera el siguiente mensaje del autor de `ctx`. */
    waitFor(ctx, options = {}) {
        return this.#scheduler.suspend(this.#waiters.wait(ctx, options));
    }
    cancelWait(ctx) {
        this.#waiters.cancel(ctx);
    }
    /** Starts listening; resolves after stop(). / Empieza a escuchar; termina después de stop(). */
    async start(options = {}) {
        if (this.#running)
            throw new StateError('ALREADY_RUNNING', 'the bot is already running');
        this.#running = true;
        const poller = new Poller({
            minBackoffMs: this.config.polling.minBackoffMs,
            maxBackoffMs: this.config.polling.maxBackoffMs,
            fetchUpdates: (offset, signal) => this.#fetchUpdates(offset, signal),
            onUpdate: (update) => this.#feed(update),
            onError: (error) => void this.#report(error),
        });
        this.#poller = poller;
        let release;
        this.#finished = new Promise((resolve) => (release = resolve));
        const detach = options.handleSignals ? this.#attachSignals(options.signals) : () => undefined;
        try {
            this.me = await this.api.account.me();
            this.#announce();
            for (const hook of this.#startHooks)
                await hook(this);
            this.#startTasks();
            await poller.run();
        }
        catch (error) {
            this.logger.error(describeError(error, this.config.language));
            throw error;
        }
        finally {
            detach();
            this.#stopTasks();
            this.#waiters.clear();
            const drained = await this.#scheduler.idle(this.config.polling.graceMs);
            if (!drained)
                this.logger.warn('some handlers were still running when the grace time ended');
            for (const hook of this.#stopHooks) {
                try {
                    await hook(this);
                }
                catch (error) {
                    await this.#report(error);
                }
            }
            this.#running = false;
            this.#poller = null;
            this.logger.info('stopped');
            release();
        }
    }
    /** Stops listening and waits for the handlers in progress. / Deja de escuchar y espera a los manejadores en curso. */
    async stop() {
        this.#poller?.stop();
        await this.#finished;
    }
    /** Runs one update through the middlewares and handlers (also for tests). / Pasa una actualización por los middlewares y manejadores (también para pruebas). */
    async handle(update) {
        const ctx = this.#context(update);
        if (ctx === null || this.#waiters.offer(ctx))
            return;
        await this.#dispatch(ctx);
    }
    async #feed(update) {
        const ctx = this.#context(update);
        if (ctx === null || this.#waiters.offer(ctx))
            return;
        await this.#scheduler.submit(String(ctx.chatId), () => this.#dispatch(ctx));
    }
    #context(update) {
        const ctx = new Context(this, update);
        const me = this.me;
        if (me && ctx.from && String(ctx.from.id) === String(me.id))
            return null;
        return ctx;
    }
    async #dispatch(ctx) {
        try {
            await this.#pipeline(ctx, async () => undefined);
        }
        catch (error) {
            await this.#report(error, ctx);
        }
    }
    #fetchUpdates(offset, signal) {
        const seconds = this.config.polling.timeoutSeconds;
        return this.api.transport.call(METHOD.getUpdates, { offset, timeout: seconds, allowedUpdates: UPDATE_KINDS }, { timeoutMs: seconds * 1000 + LONG_POLL_MARGIN_MS, retries: 0, signal });
    }
    async #report(error, ctx) {
        try {
            await this.#errorHandler(error, ctx);
        }
        catch (inner) {
            this.logger.error('the error handler failed', inner);
        }
    }
    #logFailure(error, ctx) {
        const where = ctx ? `${ctx.type}${ctx.command ? ` /${ctx.command}` : ''} in ${ctx.chatId} · ` : '';
        const stack = !(error instanceof OrbitxError) && error instanceof Error && error.stack ? `\n${error.stack}` : '';
        this.logger.error(`${where}${describeError(error, this.config.language)}${stack}`);
    }
    #announce() {
        const who = this.me?.handle ? `@${this.me.handle}` : String(this.me?.id ?? '');
        this.logger.info(`orbitx-bot ${VERSION} · connected as ${who}`);
        this.logger.info(`listening · long poll ${this.config.polling.timeoutSeconds}s · ${this.config.polling.concurrency} workers`);
    }
    #attachSignals(signals = ['SIGINT', 'SIGTERM']) {
        const handler = (signal) => {
            this.logger.info(`${signal} received, stopping`);
            void this.stop();
        };
        for (const signal of signals)
            process.once(signal, handler);
        return () => {
            for (const signal of signals)
                process.off(signal, handler);
        };
    }
    #startTasks() {
        this.#ticking = true;
        for (const task of this.#tasks) {
            const tick = async () => {
                if (!this.#ticking)
                    return;
                try {
                    await task.run(this);
                }
                catch (error) {
                    await this.#report(error);
                }
                arm();
            };
            const arm = () => {
                if (!this.#ticking)
                    return;
                const timer = setTimeout(() => {
                    this.#timers.delete(timer);
                    void tick();
                }, task.everyMs);
                timer.unref();
                this.#timers.add(timer);
            };
            if (task.immediate)
                void tick();
            else
                arm();
        }
    }
    #stopTasks() {
        this.#ticking = false;
        for (const timer of this.#timers)
            clearTimeout(timer);
        this.#timers.clear();
    }
}
