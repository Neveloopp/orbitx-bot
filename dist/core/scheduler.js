import { AsyncLocalStorage } from 'node:async_hooks';
import { settledWithin } from '../utils/async.js';
/** Runs updates of the same chat in order and different chats side by side. / Corre las actualizaciones de un mismo chat en orden y de chats distintos en paralelo. */
export class Scheduler {
    #limit;
    #maxBacklog;
    #chains = new Map();
    #active = new Set();
    #slotWaiters = [];
    #roomWaiters = [];
    #inside = new AsyncLocalStorage();
    #running = 0;
    #backlog = 0;
    constructor(limit) {
        this.#limit = Math.max(1, Math.floor(limit));
        this.#maxBacklog = this.#limit * 4;
    }
    async submit(key, task) {
        while (this.#backlog >= this.#maxBacklog) {
            await new Promise((resolve) => this.#roomWaiters.push(resolve));
        }
        this.#backlog++;
        const previous = this.#chains.get(key) ?? Promise.resolve();
        const next = previous.then(() => new Promise((open) => {
            const run = this.#execute(task, { open });
            this.#active.add(run);
            void run.finally(() => this.#active.delete(run));
        }));
        this.#chains.set(key, next);
        void next.then(() => {
            if (this.#chains.get(key) === next)
                this.#chains.delete(key);
        });
    }
    /** Frees the worker and the chat while `work` waits (for example for an answer from a person). / Libera al trabajador y al chat mientras `work` espera (por ejemplo la respuesta de una persona). */
    async suspend(work) {
        const gate = this.#inside.getStore();
        if (!gate)
            return work;
        gate.open();
        this.#release();
        this.#leaveBacklog();
        try {
            return await work;
        }
        finally {
            this.#backlog++;
            await this.#acquire();
        }
    }
    /** True when everything finished before the time ran out. / True si todo terminó antes de acabarse el tiempo. */
    async idle(timeoutMs) {
        const deadline = Date.now() + timeoutMs;
        while (this.#chains.size > 0 || this.#active.size > 0) {
            const left = deadline - Date.now();
            if (left <= 0)
                return false;
            await settledWithin(Promise.allSettled([...this.#chains.values(), ...this.#active]), left);
        }
        return true;
    }
    async #execute(task, gate) {
        await this.#acquire();
        try {
            await this.#inside.run(gate, task);
        }
        catch {
            return;
        }
        finally {
            this.#release();
            this.#leaveBacklog();
            gate.open();
        }
    }
    async #acquire() {
        if (this.#running < this.#limit) {
            this.#running++;
            return;
        }
        await new Promise((resolve) => this.#slotWaiters.push(resolve));
    }
    #release() {
        const waiting = this.#slotWaiters.shift();
        if (waiting)
            waiting();
        else
            this.#running--;
    }
    #leaveBacklog() {
        this.#backlog--;
        this.#roomWaiters.shift()?.();
    }
}
