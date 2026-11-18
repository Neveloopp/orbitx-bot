export type Lang = 'en' | 'es';
export interface Hint {
    readonly en: string;
    readonly es: string;
}
export type ErrorCode = 'KEY_MISSING' | 'KEY_MALFORMED' | 'CONFIG_INVALID' | 'MODULE_INVALID' | 'NETWORK' | 'TIMEOUT' | 'ABORTED' | 'BAD_RESPONSE' | 'API' | 'KEY_REJECTED' | 'FILE_INVALID' | 'FILE_NOT_FOUND' | 'FILE_TOO_LARGE' | 'DOWNLOAD_FAILED' | 'NO_MESSAGE' | 'NO_JOIN_REQUEST' | 'NEXT_CALLED_TWICE' | 'ALREADY_RUNNING';
export interface ErrorInit {
    status?: number;
    method?: string;
    retryable?: boolean;
    retryAfterMs?: number;
    cause?: unknown;
    hint?: Hint;
}
export declare class OrbitxError extends Error {
    readonly code: string;
    readonly status: number;
    readonly method: string | null;
    readonly retryable: boolean;
    readonly retryAfterMs: number | null;
    readonly hint: Hint;
    constructor(code: ErrorCode | (string & {}), message: string, init?: ErrorInit);
    /** Message plus what to do about it, in English or Spanish. / Mensaje y qué hacer, en inglés o español. */
    explain(lang?: Lang): string;
    toJSON(): Record<string, unknown>;
}
export declare class ConfigError extends OrbitxError {
}
export declare class StateError extends OrbitxError {
}
export declare class FileError extends OrbitxError {
}
export declare class NetworkError extends OrbitxError {
    constructor(method: string, cause: unknown);
}
export declare class RequestTimeoutError extends OrbitxError {
    constructor(method: string, timeoutMs: number, cause?: unknown);
}
export declare class AbortedError extends OrbitxError {
    constructor(method: string, cause?: unknown);
}
export declare class BadResponseError extends OrbitxError {
    constructor(method: string, status: number);
}
export interface ApiErrorExtra {
    retryAfterMs?: number;
    hint?: Hint;
}
export declare class ApiError extends OrbitxError {
    constructor(method: string, status: number, remoteCode?: string, remoteMessage?: string, extra?: ApiErrorExtra);
}
export declare class AuthError extends ApiError {
    constructor(method: string, remoteCode?: string, remoteMessage?: string);
}
export declare function isRetryable(error: unknown): boolean;
export declare function describeError(error: unknown, lang?: Lang): string;
