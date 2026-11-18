import { type BotConfig } from './config.js';
import { Bot } from './core/bot.js';
export interface EnvBotConfig extends Omit<BotConfig, 'key'> {
    variable?: string;
}
/** Creates a bot from its key or from an options object. / Crea un bot desde su clave o desde un objeto de opciones. */
export declare function createBot(input: string | BotConfig): Bot;
/** Creates a bot reading its key from an environment variable (ORBITX_BOT_KEY by default). / Crea un bot leyendo su clave de una variable de entorno (ORBITX_BOT_KEY por defecto). */
export declare function createBotFromEnv(options?: EnvBotConfig): Bot;
