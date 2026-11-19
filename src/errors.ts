export type Lang = 'en' | 'es';

export interface Hint {
  readonly en: string;
  readonly es: string;
}

export type ErrorCode =
  | 'KEY_MISSING'
  | 'KEY_MALFORMED'
  | 'CONFIG_INVALID'
  | 'MODULE_INVALID'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'BAD_RESPONSE'
  | 'API'
  | 'KEY_REJECTED'
  | 'FILE_INVALID'
  | 'FILE_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'DOWNLOAD_FAILED'
  | 'NO_MESSAGE'
  | 'NO_JOIN_REQUEST'
  | 'NEXT_CALLED_TWICE'
  | 'ALREADY_RUNNING';

const HINTS: Record<ErrorCode, Hint> = {
  KEY_MISSING: {
    en: 'Pass the key from «Bot ORBITX» in ORBITX SPACE: createBot({ key: process.env.ORBITX_BOT_KEY }).',
    es: 'Pasa la clave de «Bot ORBITX» en ORBITX SPACE: createBot({ key: process.env.ORBITX_BOT_KEY }).',
  },
  KEY_MALFORMED: {
    en: 'A key looks like oxb_<10 characters>_<40 characters>. Copy it again, without spaces or quotes.',
    es: 'Una clave se ve como oxb_<10 caracteres>_<40 caracteres>. Cópiala de nuevo, sin espacios ni comillas.',
  },
  CONFIG_INVALID: {
    en: 'Check the options passed to createBot().',
    es: 'Revisa las opciones que pasaste a createBot().',
  },
  MODULE_INVALID: {
    en: 'A module must export default a Router, a function (bot) => void or { register(bot) }.',
    es: 'Un módulo debe exportar por defecto un Router, una función (bot) => void o { register(bot) }.',
  },
  NETWORK: {
    en: 'The server could not be reached. Check the connection and the baseUrl option.',
    es: 'No se pudo llegar al servidor. Revisa la conexión y la opción baseUrl.',
  },
  TIMEOUT: {
    en: 'The server took too long. Raise request.timeoutMs or try again.',
    es: 'El servidor tardó demasiado. Sube request.timeoutMs o intenta de nuevo.',
  },
  ABORTED: {
    en: 'The request was cancelled before it finished.',
    es: 'La petición se canceló antes de terminar.',
  },
  BAD_RESPONSE: {
    en: 'The server answered something that is not the bot API JSON. Check baseUrl.',
    es: 'El servidor respondió algo que no es el JSON de la API de bots. Revisa baseUrl.',
  },
  API: {
    en: 'The API refused the request. Read error.code and error.message.',
    es: 'La API rechazó la petición. Lee error.code y error.message.',
  },
  KEY_REJECTED: {
    en: 'The server refused the key. It may have been regenerated or the bot deleted.',
    es: 'El servidor rechazó la clave. Pudo regenerarse o el bot pudo eliminarse.',
  },
  FILE_INVALID: {
    en: 'A file is a Buffer, a path, a URL, { url } or { data, name }.',
    es: 'Un archivo es un Buffer, una ruta, una URL, { url } o { data, name }.',
  },
  FILE_NOT_FOUND: {
    en: 'The file does not exist or cannot be read. Check the path.',
    es: 'El archivo no existe o no se puede leer. Revisa la ruta.',
  },
  FILE_TOO_LARGE: {
    en: 'The file is bigger than request.maxFileBytes.',
    es: 'El archivo es más grande que request.maxFileBytes.',
  },
  DOWNLOAD_FAILED: {
    en: 'The file could not be downloaded from its URL.',
    es: 'No se pudo descargar el archivo desde su URL.',
  },
  NO_MESSAGE: {
    en: 'This update has no message (for example a join request). Use bot.api with explicit ids.',
    es: 'Esta actualización no tiene mensaje (por ejemplo una solicitud de ingreso). Usa bot.api con ids explícitos.',
  },
  NO_JOIN_REQUEST: {
    en: 'approve() and decline() only work on join_request updates.',
    es: 'approve() y decline() solo funcionan en actualizaciones join_request.',
  },
  NEXT_CALLED_TWICE: {
    en: 'A middleware called next() more than once. Call it a single time.',
    es: 'Un middleware llamó a next() más de una vez. Llámalo una sola vez.',
  },
  ALREADY_RUNNING: {
    en: 'The bot is already running. Call stop() first.',
    es: 'El bot ya está en marcha. Llama a stop() primero.',
  },
};

const OUTAGE_HINT: Hint = {
  en: 'The server or the proxy in front of it is failing for a moment (a 5xx page, such as 520, is not from your bot). The library retries by itself; nothing to fix unless it lasts.',
  es: 'El servidor o el proxy que tiene delante falla un momento (una página 5xx, como la 520, no viene de tu bot). La librería reintenta sola; no hay nada que arreglar salvo que dure.',
};

export interface ErrorInit {
  status?: number;
  method?: string;
  retryable?: boolean;
  retryAfterMs?: number;
  cause?: unknown;
  hint?: Hint;
}

export class OrbitxError extends Error {
  readonly code: string;
  readonly status: number;
  readonly method: string | null;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;
  readonly hint: Hint;

  constructor(code: ErrorCode | (string & {}), message: string, init: ErrorInit = {}) {
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = new.target.name;
    this.code = code;
    this.status = init.status ?? 0;
    this.method = init.method ?? null;
    this.retryable = init.retryable ?? false;
    this.retryAfterMs = init.retryAfterMs ?? null;
    this.hint = init.hint ?? HINTS[code as ErrorCode] ?? HINTS.API;
  }

  /** Message plus what to do about it, in English or Spanish. / Mensaje y qué hacer, en inglés o español. */
  explain(lang: Lang = 'en'): string {
    return `${this.message} → ${this.hint[lang]}`;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      status: this.status,
      method: this.method,
      message: this.message,
      retryable: this.retryable,
    };
  }
}

export class ConfigError extends OrbitxError {}

export class StateError extends OrbitxError {}

export class FileError extends OrbitxError {}

export class NetworkError extends OrbitxError {
  constructor(method: string, cause: unknown) {
    super('NETWORK', `${method}: could not reach the server`, { method, cause, retryable: true });
  }
}

export class RequestTimeoutError extends OrbitxError {
  constructor(method: string, timeoutMs: number, cause?: unknown) {
    super('TIMEOUT', `${method}: no answer after ${timeoutMs} ms`, {
      method,
      cause,
      retryable: true,
    });
  }
}

export class AbortedError extends OrbitxError {
  constructor(method: string, cause?: unknown) {
    super('ABORTED', `${method}: cancelled`, { method, cause });
  }
}

export class BadResponseError extends OrbitxError {
  constructor(method: string, status: number) {
    super('BAD_RESPONSE', `${method}: unexpected answer (HTTP ${status})`, {
      method,
      status,
      retryable: status >= 500,
      ...(status >= 500 ? { hint: OUTAGE_HINT } : {}),
    });
  }
}

export interface ApiErrorExtra {
  retryAfterMs?: number;
  hint?: Hint;
}

export class ApiError extends OrbitxError {
  constructor(
    method: string,
    status: number,
    remoteCode?: string,
    remoteMessage?: string,
    extra: ApiErrorExtra = {},
  ) {
    super(remoteCode || `HTTP_${status}`, remoteMessage || `${method}: HTTP ${status}`, {
      method,
      status,
      retryable: status === 429 || status >= 500,
      ...extra,
    });
  }
}

export class AuthError extends ApiError {
  constructor(method: string, remoteCode?: string, remoteMessage?: string) {
    super(method, 401, remoteCode, remoteMessage, { hint: HINTS.KEY_REJECTED });
  }
}

export function isRetryable(error: unknown): boolean {
  return error instanceof OrbitxError && error.retryable;
}

export function describeError(error: unknown, lang: Lang = 'en'): string {
  if (error instanceof OrbitxError) return `[${error.code}] ${error.explain(lang)}`;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
