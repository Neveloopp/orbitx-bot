import { ConfigError } from './errors.js';
import { resolveLogger } from './logger.js';
import { DEFAULT_BASE_URL, KEY_PATTERN } from './protocol.js';
export const DEFAULT_PREFIXES = ['/', '.', '!', '#'];
const RESERVED_HEADERS = new Set(['authorization', 'content-type']);
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
function number(name, value, fallback, min) {
    if (value === undefined)
        return fallback;
    if (!Number.isFinite(value) || value < min) {
        throw new ConfigError('CONFIG_INVALID', `${name} must be a number >= ${min}`);
    }
    return value;
}
function validateKey(key) {
    if (typeof key !== 'string' || key.trim() === '') {
        throw new ConfigError('KEY_MISSING', 'the bot key is missing');
    }
    const clean = key.trim();
    if (!KEY_PATTERN.test(clean)) {
        throw new ConfigError('KEY_MALFORMED', 'the bot key does not have the oxb_ format');
    }
    return clean;
}
function validateBaseUrl(value) {
    const clean = (value ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    let url;
    try {
        url = new URL(clean);
    }
    catch {
        throw new ConfigError('CONFIG_INVALID', `baseUrl is not a valid URL: ${clean}`);
    }
    const secure = url.protocol === 'https:';
    const local = url.protocol === 'http:' && LOOPBACK.has(url.hostname);
    if (!secure && !local) {
        throw new ConfigError('CONFIG_INVALID', 'baseUrl must use https (http is only allowed on localhost)');
    }
    return clean;
}
function validatePrefixes(value) {
    const list = value ?? DEFAULT_PREFIXES;
    if (list.length === 0 || list.some((p) => typeof p !== 'string')) {
        throw new ConfigError('CONFIG_INVALID', "prefixes must be a list of texts (use [''] for no prefix)");
    }
    return [...list].sort((a, b) => b.length - a.length);
}
/** Validates the options and fills the defaults. / Valida las opciones y completa los valores por defecto. */
export function resolveConfig(input) {
    if (input === null || typeof input !== 'object') {
        throw new ConfigError('CONFIG_INVALID', 'createBot() needs an options object: { key }');
    }
    const polling = input.polling ?? {};
    const request = input.request ?? {};
    const minBackoffMs = number('polling.minBackoffMs', polling.minBackoffMs, 1000, 100);
    const maxBackoffMs = number('polling.maxBackoffMs', polling.maxBackoffMs, 30_000, minBackoffMs);
    const concurrency = Math.floor(number('polling.concurrency', polling.concurrency, 8, 1));
    const fetchImpl = request.fetch ?? globalThis.fetch;
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
            headers: Object.fromEntries(Object.entries(request.headers ?? {}).filter(([name]) => !RESERVED_HEADERS.has(name.toLowerCase()))),
            fetch: fetchImpl,
        },
        logger: resolveLogger(input.logger),
        language: input.language ?? 'en',
    };
}
