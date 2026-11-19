import { resolveConfig, type BotConfig } from './config.js';
import { Bot } from './core/bot.js';
import { ConfigError } from './errors.js';

export interface EnvBotConfig extends Omit<BotConfig, 'key'> {
  variable?: string;
}

/** Creates a bot from its key or from an options object. / Crea un bot desde su clave o desde un objeto de opciones. */
export function createBot(input: string | BotConfig): Bot {
  const config: BotConfig = typeof input === 'string' ? { key: input } : input;
  return new Bot(resolveConfig(config));
}

/** Creates a bot reading its key from an environment variable (ORBITX_BOT_KEY by default). / Crea un bot leyendo su clave de una variable de entorno (ORBITX_BOT_KEY por defecto). */
export function createBotFromEnv(options: EnvBotConfig = {}): Bot {
  const { variable = 'ORBITX_BOT_KEY', ...rest } = options;
  const key = process.env[variable];
  if (key === undefined || key.trim() === '') {
    throw new ConfigError('KEY_MISSING', `the environment variable ${variable} is not set`);
  }
  return createBot({ ...rest, key });
}
