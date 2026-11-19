import type { Next, Middleware } from './types.js';
import type { Context } from './context.js';
/** Chains middlewares: each one decides to call next(). / Encadena middlewares: cada uno decide si llama a next(). */
export declare function compose(stack: readonly Middleware[]): (ctx: Context, done: Next) => Promise<void>;
