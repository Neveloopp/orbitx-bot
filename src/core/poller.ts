import { AuthError } from '../errors.js';
import type { Update } from '../types/entities.js';
import { sleep } from '../utils/async.js';

export interface PollerOptions {
  minBackoffMs: number;
  maxBackoffMs: number;
  fetchUpdates(offset: number, signal: AbortSignal): Promise<Update[]>;
  onUpdate(update: Update): Promise<void>;
  onError(error: unknown): void;
  onRecover?(failures: number): void;
}

/** Asks the server for updates again and again until stopped. / Pide actualizaciones al servidor una y otra vez hasta que se detiene. */
export class Poller {
  readonly #options: PollerOptions;
  readonly #controller = new AbortController();
  #offset = 0;

  constructor(options: PollerOptions) {
    this.#options = options;
  }

  get stopped(): boolean {
    return this.#controller.signal.aborted;
  }

  async run(): Promise<void> {
    const { signal } = this.#controller;
    const { minBackoffMs, maxBackoffMs } = this.#options;
    let wait = minBackoffMs;
    let failures = 0;
    while (!signal.aborted) {
      let updates: Update[];
      try {
        const answer = await this.#options.fetchUpdates(this.#offset, signal);
        updates = Array.isArray(answer) ? answer : [];
        wait = minBackoffMs;
        if (failures > 0) this.#options.onRecover?.(failures);
        failures = 0;
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof AuthError) throw error;
        failures++;
        this.#options.onError(error);
        await sleep(wait, signal);
        wait = Math.min(wait * 2, maxBackoffMs);
        continue;
      }
      for (const update of updates) {
        if (signal.aborted) return;
        this.#offset = update.updateId + 1;
        await this.#options.onUpdate(update);
      }
    }
  }

  stop(): void {
    this.#controller.abort();
  }
}
