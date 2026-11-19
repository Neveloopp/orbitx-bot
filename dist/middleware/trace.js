/** Logs every update and how long its handler took (debug level). / Registra cada actualización y cuánto tardó su manejador (nivel debug). */
export function trace() {
    return async (ctx, next) => {
        const started = Date.now();
        const label = ctx.command ? `/${ctx.command}` : ctx.type;
        const who = ctx.from?.handle ? `@${ctx.from.handle}` : String(ctx.from?.id ?? '-');
        try {
            await next();
        }
        finally {
            ctx.bot.logger.debug(`${label} · ${who} · ${Date.now() - started} ms`);
        }
    };
}
