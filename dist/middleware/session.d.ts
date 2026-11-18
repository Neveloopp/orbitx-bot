import type { Context } from '../core/context.js';
import type { Middleware } from '../core/types.js';
import type { SessionData } from '../types/entities.js';
export interface SessionStore {
    get(key: string): SessionData | undefined | Promise<SessionData | undefined>;
    set(key: string, value: SessionData): void | Promise<void>;
    delete(key: string): void | Promise<void>;
}
export interface MemoryStoreOptions {
    ttlMs?: number;
    maxEntries?: number;
}
interface Stored {
    value: SessionData;
    expiresAt: number | null;
}
/** Sessions kept in memory; they are lost when the bot restarts. / Sesiones en memoria; se pierden cuando el bot se reinicia. */
export declare class MemoryStore implements SessionStore {
    #private;
    protected readonly entries: Map<string, Stored>;
    constructor(options?: MemoryStoreOptions);
    get(key: string): SessionData | undefined;
    set(key: string, value: SessionData): void;
    delete(key: string): void;
}
export interface JsonFileStoreOptions extends MemoryStoreOptions {
    flushMs?: number;
}
/** Sessions saved in a JSON file, so they survive restarts. / Sesiones guardadas en un archivo JSON para sobrevivir a los reinicios. */
export declare class JsonFileStore extends MemoryStore {
    #private;
    private constructor();
    static open(path: string, options?: JsonFileStoreOptions): Promise<JsonFileStore>;
    set(key: string, value: SessionData): void;
    delete(key: string): void;
    /** Writes the sessions to disk now. / Escribe las sesiones en disco ahora. */
    flush(): Promise<void>;
    close(): Promise<void>;
}
export interface SessionOptions {
    store?: SessionStore;
    scope?: 'member' | 'user' | 'chat';
    key?: (ctx: Context) => string | null;
    initial?: () => SessionData;
}
/** Gives every handler a ctx.session that is kept between updates. / Da a cada manejador un ctx.session que se conserva entre actualizaciones. */
export declare function session(options?: SessionOptions): Middleware;
export {};
