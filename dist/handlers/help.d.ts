import type { Router } from '../core/router.js';
import type { Handler } from '../core/types.js';
export interface HelpOptions {
    title?: string;
    prefix?: string;
    empty?: string;
}
/** The list of documented commands of a router as text. / La lista de comandos documentados de un router como texto. */
export declare function helpText(router: Router, options?: HelpOptions): string;
/** A ready-made handler for a help command. / Un manejador listo para un comando de ayuda. */
export declare function helpHandler(router: Router, options?: HelpOptions): Handler;
