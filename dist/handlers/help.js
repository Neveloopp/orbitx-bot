/** The list of documented commands of a router as text. / La lista de comandos documentados de un router como texto. */
export function helpText(router, options = {}) {
    const prefix = options.prefix ?? '/';
    const lines = router
        .commands()
        .filter((command) => !command.hidden && command.description)
        .map((command) => `${prefix}${command.names[0]} — ${command.description}`);
    if (lines.length === 0)
        return options.empty ?? '—';
    return options.title ? `${options.title}\n\n${lines.join('\n')}` : lines.join('\n');
}
/** A ready-made handler for a help command. / Un manejador listo para un comando de ayuda. */
export function helpHandler(router, options = {}) {
    return (ctx) => {
        const prefix = options.prefix ?? ctx.bot.config.prefixes.find((p) => p !== '') ?? '';
        return ctx.reply(helpText(router, { ...options, prefix }));
    };
}
