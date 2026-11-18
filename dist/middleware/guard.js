const CHECKS = {
    owner: (ctx) => ctx.isOwner,
    admin: (ctx) => ctx.isAdmin,
    staff: (ctx) => ctx.isAdmin || ctx.isOwner,
    group: (ctx) => ctx.isGroup,
    private: (ctx) => ctx.isPrivate,
};
function firstFailure(rules, ctx) {
    return [].concat(rules).find((rule) => !CHECKS[rule](ctx)) ?? null;
}
/** Lets an update through only if every rule holds. / Deja pasar una actualización solo si se cumplen todas las reglas. */
export function guard(rules, options = {}) {
    return async (ctx, next) => {
        const failed = firstFailure(rules, ctx);
        if (failed === null)
            return next();
        await options.onDeny?.(ctx, failed);
    };
}
/** Wraps one handler with the same rules. / Envuelve un manejador con las mismas reglas. */
export function restrict(rules, handler, options = {}) {
    return async (ctx) => {
        const failed = firstFailure(rules, ctx);
        if (failed === null)
            return handler(ctx);
        await options.onDeny?.(ctx, failed);
    };
}
