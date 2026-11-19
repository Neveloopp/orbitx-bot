export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export interface Logger {
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
}
export declare const silentLogger: Logger;
/** Branded console logger. / Logger de consola con la identidad de ORBITX. */
export declare function createLogger(level?: LogLevel): Logger;
export declare function resolveLogger(option: Logger | LogLevel | false | undefined): Logger;
