import type { Context } from '../core/context.js';
import type { Handler, Middleware } from '../core/types.js';
export type Rule = 'owner' | 'admin' | 'staff' | 'group' | 'private';
export interface GuardOptions {
    onDeny?: (ctx: Context, rule: Rule) => unknown;
}
/** Lets an update through only if every rule holds. / Deja pasar una actualización solo si se cumplen todas las reglas. */
export declare function guard(rules: Rule | readonly Rule[], options?: GuardOptions): Middleware;
/** Wraps one handler with the same rules. / Envuelve un manejador con las mismas reglas. */
export declare function restrict(rules: Rule | readonly Rule[], handler: Handler, options?: GuardOptions): Handler;
