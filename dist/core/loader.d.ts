import type { Bot } from './bot.js';
export interface LoadOptions {
    recursive?: boolean;
    extensions?: readonly string[];
}
export interface ModuleLike {
    register(bot: Bot): unknown;
}
/** Imports every module of a folder and mounts it on the bot. / Importa cada módulo de una carpeta y lo monta en el bot. */
export declare function loadModules(bot: Bot, dir: string, options?: LoadOptions): Promise<string[]>;
