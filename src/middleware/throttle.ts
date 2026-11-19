import type { Context } from '../core/context.js';
import type { Middleware } from '../core/types.js';

export interface ThrottleOptions {
  limit?: number;
  windowMs?: number;
  key?: (ctx: Context) => string | null;
  skip?: (ctx: Context) => boolean;
  onLimit?: (ctx: Context, info: { retryAfterMs: number }) => unknown;
}

interface Window {
  count: number;
  resetAt: number;
}

const PURGE_AT = 1000;

/** Limits how many updates one person can send in a time window. / Limita cuántas actualizaciones puede enviar una persona en una ventana de tiempo. */
export function throttle(options: ThrottleOptions = {}): Middleware {
  const limit = Math.max(1, options.limit ?? 5);
  const windowMs = Math.max(1, options.windowMs ?? 10_000);
  const windows = new Map<string, Window>();

  const purge = (now: number): void => {
    for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
  };

  return async (ctx, next) => {
    const key = options.key ? options.key(ctx) : ctx.from ? String(ctx.from.id) : null;
    if (key === null || options.skip?.(ctx)) return next();
    const now = Date.now();
    if (windows.size > PURGE_AT) purge(now);
    let window = windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      windows.set(key, window);
    }
    window.count++;
    if (window.count <= limit) return next();
    if (window.count === limit + 1) await options.onLimit?.(ctx, { retryAfterMs: window.resetAt - now });
  };
}
