import type { Context, WaitOptions } from './context.js';

interface Pending {
  filter: ((ctx: Context) => boolean) | null;
  settle(value: Context | null): void;
}

const DEFAULT_TIMEOUT_MS = 60_000;

function keyOf(ctx: Context): string | null {
  return ctx.from ? `${ctx.chatId}:${ctx.from.id}` : null;
}

/** People the bot is waiting an answer from. / Personas de las que el bot espera una respuesta. */
export class Waiters {
  readonly #pending = new Map<string, Pending>();

  wait(ctx: Context, options: WaitOptions = {}): Promise<Context | null> {
    const key = keyOf(ctx);
    if (key === null) return Promise.resolve(null);
    this.#pending.get(key)?.settle(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => entry.settle(null), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      const entry: Pending = {
        filter: options.filter ?? null,
        settle: (value) => {
          clearTimeout(timer);
          if (this.#pending.get(key) === entry) this.#pending.delete(key);
          resolve(value);
        },
      };
      this.#pending.set(key, entry);
    });
  }

  /** Gives the update to whoever waits for it; true if it was taken. / Entrega la actualización a quien la espera; true si fue tomada. */
  offer(ctx: Context): boolean {
    if (ctx.type !== 'message' || ctx.event) return false;
    const key = keyOf(ctx);
    const entry = key === null ? undefined : this.#pending.get(key);
    if (!entry || (entry.filter && !entry.filter(ctx))) return false;
    entry.settle(ctx);
    return true;
  }

  cancel(ctx: Context): void {
    const key = keyOf(ctx);
    if (key !== null) this.#pending.get(key)?.settle(null);
  }

  clear(): void {
    for (const entry of [...this.#pending.values()]) entry.settle(null);
  }
}
