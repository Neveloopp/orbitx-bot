export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

const PALETTE = {
  brand: '38;5;99',
  accent: '38;5;45',
  dim: '38;5;244',
  debug: '38;5;244',
  info: '38;5;45',
  warn: '38;5;214',
  error: '38;5;203',
} as const;

function colorEnabled(stream: NodeJS.WriteStream): boolean {
  if (process.env['NO_COLOR']) return false;
  const force = process.env['FORCE_COLOR'];
  if (force !== undefined && force !== '0') return true;
  return Boolean(stream.isTTY);
}

function paint(enabled: boolean, code: string, text: string): string {
  return enabled ? `\u001b[${code}m${text}\u001b[0m` : text;
}

function clock(): string {
  return new Date().toTimeString().slice(0, 8);
}

function metaText(meta: unknown): string {
  if (meta === undefined) return '';
  if (meta instanceof Error) return ` ${meta.message}`;
  if (typeof meta === 'string') return ` ${meta}`;
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
}

export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

/** Branded console logger. / Logger de consola con la identidad de ORBITX. */
export function createLogger(level: LogLevel = 'info'): Logger {
  if (level === 'silent') return silentLogger;
  const threshold = RANK[level];

  const write = (name: Exclude<LogLevel, 'silent'>, message: string, meta?: unknown): void => {
    if (RANK[name] < threshold) return;
    const stream = name === 'warn' || name === 'error' ? process.stderr : process.stdout;
    const color = colorEnabled(stream);
    const tag = paint(color, PALETTE.brand, '◉ ORBITX');
    const time = paint(color, PALETTE.dim, clock());
    const label = paint(color, PALETTE[name], name.padEnd(5));
    stream.write(`${tag}  ${time}  ${label}  ${message}${metaText(meta)}\n`);
  };

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
  };
}

export function resolveLogger(option: Logger | LogLevel | false | undefined): Logger {
  if (option === false) return silentLogger;
  if (option === undefined) return createLogger('info');
  if (typeof option === 'string') return createLogger(option);
  return option;
}
