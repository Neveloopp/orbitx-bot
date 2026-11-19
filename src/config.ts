import { ConfigError, type Lang } from './errors.js';
import { resolveLogger, type Logger, type LogLevel } from './logger.js';
import { autoConcurrency } from './cache/memory.js';
import { DEFAULT_TTL_MS, type CacheKind, type CacheTtl } from './cache/reads.js';
import { createFastFetch } from './http/fast-fetch.js';
import { DEFAULT_BASE_URL, KEY_PATTERN } from './protocol.js';

export interface PollingOptions {
  timeoutSeconds?: number;
  concurrency?: number | 'auto';
  minBackoffMs?: number;
  maxBackoffMs?: number;
  graceMs?: number;
}

export interface RequestOptions {
  timeoutMs?: number;
  retries?: number;
  maxFileBytes?: number;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
  keepAlive?: boolean;
  maxSockets?: number;
  warmSockets?: number;
  keepWarmMs?: number;
}

export interface CacheOptions {
  enabled?: boolean;
  fraction?: number;
  minBytes?: number;
  maxBytes?: number;
  ttlMs?: Partial<Record<CacheKind, number>>;
}

export interface BotConfig {
  key: string;
  baseUrl?: string;
  prefixes?: readonly string[];
  owners?: readonly (string | number)[];
  polling?: PollingOptions;
  request?: RequestOptions;
  cache?: boolean | CacheOptions;
  logger?: Logger | LogLevel | false;
  language?: Lang;
}

export interface ResolvedConfig {
  readonly key: string;
  readonly baseUrl: string;
  readonly prefixes: readonly string[];
  readonly owners: ReadonlySet<string>;
  readonly polling: Required<Omit<PollingOptions, 'concurrency'>> & { readonly concurrency: number };
  readonly request: {
    readonly timeoutMs: number;
    readonly retries: number;
    readonly maxFileBytes: number | null;
    readonly headers: Readonly<Record<string, string>>;
    readonly fetch: typeof fetch;
    readonly keepAlive: boolean;
    readonly warmSockets: number;
    readonly keepWarmMs: number;
  };
  readonly cache: {
    readonly enabled: boolean;
    readonly fraction: number;
    readonly minBytes: number;
    readonly maxBytes: number;
    readonly ttlMs: CacheTtl;
  };
  readonly logger: Logger;
  readonly language: Lang;
}

export const DEFAULT_PREFIXES: readonly string[] = ['/', '.', '!', '#'];

const MIB = 1024 * 1024;

const RESERVED_HEADERS = new Set(['authorization', 'content-type']);

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

function number(name: string, value: number | undefined, fallback: number, min: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < min) {
    throw new ConfigError('CONFIG_INVALID', `${name} must be a number >= ${min}`);
  }
  return value;
}

function validateKey(key: unknown): string {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new ConfigError('KEY_MISSING', 'the bot key is missing');
  }
  const clean = key.trim();
  if (!KEY_PATTERN.test(clean)) {
    throw new ConfigError('KEY_MALFORMED', 'the bot key does not have the oxb_ format');
  }
  return clean;
}

function validateBaseUrl(value: string | undefined): string {
  const clean = (value ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(clean);
  } catch {
    throw new ConfigError('CONFIG_INVALID', `baseUrl is not a valid URL: ${clean}`);
  }
  const secure = url.protocol === 'https:';
  const local = url.protocol === 'http:' && LOOPBACK.has(url.hostname);
  if (!secure && !local) {
    throw new ConfigError('CONFIG_INVALID', 'baseUrl must use https (http is only allowed on localhost)');
  }
  return clean;
}

function validatePrefixes(value: readonly string[] | undefined): readonly string[] {
  const list = value ?? DEFAULT_PREFIXES;
  if (list.length === 0 || list.some((p) => typeof p !== 'string')) {
    throw new ConfigError('CONFIG_INVALID', "prefixes must be a list of texts (use [''] for no prefix)");
  }
  return [...list].sort((a, b) => b.length - a.length);
}

function resolveCache(input: boolean | CacheOptions | undefined): ResolvedConfig['cache'] {
  const options: CacheOptions = typeof input === 'object' ? input : {};
  const minBytes = number('cache.minBytes', options.minBytes, 8 * MIB, 0);
  const maxBytes = number('cache.maxBytes', options.maxBytes, 512 * MIB, minBytes);
  const fraction = number('cache.fraction', options.fraction, 0.2, 0.01);
  if (fraction > 1) throw new ConfigError('CONFIG_INVALID', 'cache.fraction must be between 0.01 and 1');
  const ttlMs: CacheTtl = { ...DEFAULT_TTL_MS };
  for (const [kind, value] of Object.entries(options.ttlMs ?? {})) {
    if (!(kind in ttlMs)) throw new ConfigError('CONFIG_INVALID', `cache.ttlMs.${kind} is not a cache kind`);
    ttlMs[kind as CacheKind] = number(`cache.ttlMs.${kind}`, value, 0, 0);
  }
  return { enabled: input !== false && options.enabled !== false, fraction, minBytes, maxBytes, ttlMs };
}

/** Validates the options and fills the defaults. / Valida las opciones y completa los valores por defecto. */
export function resolveConfig(input: BotConfig): ResolvedConfig {
  if (input === null || typeof input !== 'object') {
    throw new ConfigError('CONFIG_INVALID', 'createBot() needs an options object: { key }');
  }
  const polling = input.polling ?? {};
  const request = input.request ?? {};
  const minBackoffMs = number('polling.minBackoffMs', polling.minBackoffMs, 1000, 100);
  const maxBackoffMs = number('polling.maxBackoffMs', polling.maxBackoffMs, 30_000, minBackoffMs);
  const concurrency =
    polling.concurrency === 'auto'
      ? autoConcurrency()
      : Math.floor(number('polling.concurrency', polling.concurrency, 8, 1));
  const keepAlive = request.keepAlive ?? true;
  const maxSockets = Math.floor(number('request.maxSockets', request.maxSockets, 64, 1));
  const fetchImpl = request.fetch ?? (keepAlive ? createFastFetch({ maxSockets }).fetch : globalThis.fetch);
  if (typeof fetchImpl !== 'function') {
    throw new ConfigError('CONFIG_INVALID', 'fetch is not available: use Node.js 18+ or pass request.fetch');
  }

  return {
    key: validateKey(input.key),
    baseUrl: validateBaseUrl(input.baseUrl),
    prefixes: validatePrefixes(input.prefixes),
    owners: new Set((input.owners ?? []).map((o) => String(o).replace(/^@/, '').toLowerCase())),
    polling: {
      timeoutSeconds: number('polling.timeoutSeconds', polling.timeoutSeconds, 50, 0),
      concurrency,
      minBackoffMs,
      maxBackoffMs,
      graceMs: number('polling.graceMs', polling.graceMs, 10_000, 0),
    },
    request: {
      timeoutMs: number('request.timeoutMs', request.timeoutMs, 30_000, 1),
      retries: Math.floor(number('request.retries', request.retries, 2, 0)),
      maxFileBytes: request.maxFileBytes === undefined ? null : number('request.maxFileBytes', request.maxFileBytes, 0, 1),
      headers: Object.fromEntries(
        Object.entries(request.headers ?? {}).filter(([name]) => !RESERVED_HEADERS.has(name.toLowerCase())),
      ),
      fetch: fetchImpl,
      keepAlive,
      warmSockets: Math.floor(number('request.warmSockets', request.warmSockets, 2, 0)),
      keepWarmMs: number('request.keepWarmMs', request.keepWarmMs, 0, 0),
    },
    cache: resolveCache(input.cache),
    logger: resolveLogger(input.logger),
    language: input.language ?? 'en',
  };
}
