import type { Context } from '../core/context.js';
import type { Router } from '../core/router.js';
import type { Handler } from '../core/types.js';

export interface HelpOptions {
  title?: string;
  prefix?: string;
  empty?: string;
}

/** The list of documented commands of a router as text. / La lista de comandos documentados de un router como texto. */
export function helpText(router: Router, options: HelpOptions = {}): string {
  const prefix = options.prefix ?? '/';
  const lines = router
    .commands()
    .filter((command) => !command.hidden && command.description)
    .map((command) => `${prefix}${command.names[0]} — ${command.description}`);
  if (lines.length === 0) return options.empty ?? '—';
  return options.title ? `${options.title}\n\n${lines.join('\n')}` : lines.join('\n');
}

/** A ready-made handler for a help command. / Un manejador listo para un comando de ayuda. */
export function helpHandler(router: Router, options: HelpOptions = {}): Handler {
  return (ctx: Context) => {
    const prefix = options.prefix ?? ctx.bot.config.prefixes.find((p) => p !== '') ?? '';
    return ctx.reply(helpText(router, { ...options, prefix }));
  };
}
