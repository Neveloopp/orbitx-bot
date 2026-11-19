import type { Context } from '../core/context.js';
import type { Handler, Middleware } from '../core/types.js';

export type Rule = 'owner' | 'admin' | 'staff' | 'group' | 'private';

export interface GuardOptions {
  onDeny?: (ctx: Context, rule: Rule) => unknown;
}

const CHECKS: Record<Rule, (ctx: Context) => boolean> = {
  owner: (ctx) => ctx.isOwner,
  admin: (ctx) => ctx.isAdmin,
  staff: (ctx) => ctx.isAdmin || ctx.isOwner,
  group: (ctx) => ctx.isGroup,
  private: (ctx) => ctx.isPrivate,
};

function firstFailure(rules: Rule | readonly Rule[], ctx: Context): Rule | null {
  return ([] as Rule[]).concat(rules).find((rule) => !CHECKS[rule](ctx)) ?? null;
}

/** Lets an update through only if every rule holds. / Deja pasar una actualización solo si se cumplen todas las reglas. */
export function guard(rules: Rule | readonly Rule[], options: GuardOptions = {}): Middleware {
  return async (ctx, next) => {
    const failed = firstFailure(rules, ctx);
    if (failed === null) return next();
    await options.onDeny?.(ctx, failed);
  };
}

/** Wraps one handler with the same rules. / Envuelve un manejador con las mismas reglas. */
export function restrict(rules: Rule | readonly Rule[], handler: Handler, options: GuardOptions = {}): Handler {
  return async (ctx) => {
    const failed = firstFailure(rules, ctx);
    if (failed === null) return handler(ctx);
    await options.onDeny?.(ctx, failed);
  };
}
