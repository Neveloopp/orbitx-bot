import { AuthError } from '../errors.js';
import { sleep } from '../utils/async.js';
/** Asks the server for updates again and again until stopped. / Pide actualizaciones al servidor una y otra vez hasta que se detiene. */
export class Poller {
    #options;
    #controller = new AbortController();
    #offset = 0;
    constructor(options) {
        this.#options = options;
    }
    get stopped() {
        return this.#controller.signal.aborted;
    }
    async run() {
        const { signal } = this.#controller;
        const { minBackoffMs, maxBackoffMs } = this.#options;
        let wait = minBackoffMs;
        while (!signal.aborted) {
            let updates;
            try {
                const answer = await this.#options.fetchUpdates(this.#offset, signal);
                updates = Array.isArray(answer) ? answer : [];
                wait = minBackoffMs;
            }
            catch (error) {
                if (signal.aborted)
                    return;
                if (error instanceof AuthError)
                    throw error;
                this.#options.onError(error);
                await sleep(wait, signal);
                wait = Math.min(wait * 2, maxBackoffMs);
                continue;
            }
            for (const update of updates) {
                if (signal.aborted)
                    return;
                this.#offset = update.updateId + 1;
                await this.#options.onUpdate(update);
            }
        }
    }
    stop() {
        this.#controller.abort();
    }
}
