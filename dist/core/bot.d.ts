import { Api } from '../api/index.js';
import type { ResolvedConfig } from '../config.js';
import type { Logger } from '../logger.js';
import type { BotAccount, Id, Update } from '../types/entities.js';
import type { SendOptions } from '../types/options.js';
import { Context, type WaitOptions } from './context.js';
import { type LoadOptions } from './loader.js';
import { Router } from './router.js';
import type { ErrorHandler } from './types.js';
export interface StartOptions {
    handleSignals?: boolean;
    signals?: readonly NodeJS.Signals[];
}
export interface BroadcastOptions extends SendOptions {
    delayMs?: number;
}
export interface BroadcastReport {
    sent: Id[];
    failed: Array<{
        chat: Id;
        error: unknown;
    }>;
}
export type Lifecycle = (bot: Bot) => unknown;
export interface EveryOptions {
    immediate?: boolean;
}
/** A bot: handlers, the API and the loop that listens. / Un bot: manejadores, la API y el ciclo que escucha. */
export declare class Bot extends Router {
    #private;
    readonly config: ResolvedConfig;
    readonly api: Api;
    readonly logger: Logger;
    me: BotAccount | null;
    constructor(config: ResolvedConfig);
    get running(): boolean;
    /** What to do with an error of a handler (by default it is logged). / Qué hacer con el error de un manejador (por defecto se registra). */
    onError(handler: ErrorHandler): this;
    /** Runs once the bot is connected and before it listens. / Corre cuando el bot ya conectó y antes de escuchar. */
    onStart(hook: Lifecycle): this;
    /** Runs when the bot stops, after the handlers in progress. / Corre cuando el bot se detiene, después de los manejadores en curso. */
    onStop(hook: Lifecycle): this;
    /** Repeats a task while the bot runs. / Repite una tarea mientras el bot corre. */
    every(everyMs: number, run: Lifecycle, options?: EveryOptions): this;
    /** Imports every module of a folder and mounts it. / Importa cada módulo de una carpeta y lo monta. */
    loadModules(dir: string, options?: LoadOptions): Promise<string[]>;
    /** Sends the same message to many chats, one after another. / Envía el mismo mensaje a muchos chats, uno tras otro. */
    broadcast(chats: Iterable<Id>, text: string, options?: BroadcastOptions): Promise<BroadcastReport>;
    /** Waits for the next message of the author of `ctx`. / Espera el siguiente mensaje del autor de `ctx`. */
    waitFor(ctx: Context, options?: WaitOptions): Promise<Context | null>;
    cancelWait(ctx: Context): void;
    /** Starts listening; resolves after stop(). / Empieza a escuchar; termina después de stop(). */
    start(options?: StartOptions): Promise<void>;
    /** Stops listening and waits for the handlers in progress. / Deja de escuchar y espera a los manejadores en curso. */
    stop(): Promise<void>;
    /** Runs one update through the middlewares and handlers (also for tests). / Pasa una actualización por los middlewares y manejadores (también para pruebas). */
    handle(update: Update): Promise<void>;
}
