import type { Context } from '../core/context.js';
import type { Middleware } from '../core/types.js';
export interface ThrottleOptions {
    limit?: number;
    windowMs?: number;
    key?: (ctx: Context) => string | null;
    skip?: (ctx: Context) => boolean;
    onLimit?: (ctx: Context, info: {
        retryAfterMs: number;
    }) => unknown;
}
/** Limits how many updates one person can send in a time window. / Limita cuántas actualizaciones puede enviar una persona en una ventana de tiempo. */
export declare function throttle(options?: ThrottleOptions): Middleware;
