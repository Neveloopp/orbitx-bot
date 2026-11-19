import { type Lang } from './errors.js';
import { type Logger, type LogLevel } from './logger.js';
export interface PollingOptions {
    timeoutSeconds?: number;
    concurrency?: number;
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
}
export interface BotConfig {
    key: string;
    baseUrl?: string;
    prefixes?: readonly string[];
    owners?: readonly (string | number)[];
    polling?: PollingOptions;
    request?: RequestOptions;
    logger?: Logger | LogLevel | false;
    language?: Lang;
}
export interface ResolvedConfig {
    readonly key: string;
    readonly baseUrl: string;
    readonly prefixes: readonly string[];
    readonly owners: ReadonlySet<string>;
    readonly polling: Required<PollingOptions>;
    readonly request: {
        readonly timeoutMs: number;
        readonly retries: number;
        readonly maxFileBytes: number | null;
        readonly headers: Readonly<Record<string, string>>;
        readonly fetch: typeof fetch;
    };
    readonly logger: Logger;
    readonly language: Lang;
}
export declare const DEFAULT_PREFIXES: readonly string[];
/** Validates the options and fills the defaults. / Valida las opciones y completa los valores por defecto. */
export declare function resolveConfig(input: BotConfig): ResolvedConfig;
