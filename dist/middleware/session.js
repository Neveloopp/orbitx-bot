import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { FileError } from '../errors.js';
/** Sessions kept in memory; they are lost when the bot restarts. / Sesiones en memoria; se pierden cuando el bot se reinicia. */
export class MemoryStore {
    entries = new Map();
    #ttlMs;
    #maxEntries;
    constructor(options = {}) {
        this.#ttlMs = options.ttlMs ?? null;
        this.#maxEntries = options.maxEntries ?? 10_000;
    }
    get(key) {
        const stored = this.entries.get(key);
        if (!stored)
            return undefined;
        if (stored.expiresAt !== null && stored.expiresAt <= Date.now()) {
            this.delete(key);
            return undefined;
        }
        return stored.value;
    }
    set(key, value) {
        this.entries.delete(key);
        this.entries.set(key, { value, expiresAt: this.#ttlMs === null ? null : Date.now() + this.#ttlMs });
        while (this.entries.size > this.#maxEntries) {
            const oldest = this.entries.keys().next().value;
            if (oldest === undefined)
                break;
            this.delete(oldest);
        }
    }
    delete(key) {
        this.entries.delete(key);
    }
}
/** Sessions saved in a JSON file, so they survive restarts. / Sesiones guardadas en un archivo JSON para sobrevivir a los reinicios. */
export class JsonFileStore extends MemoryStore {
    #path;
    #flushMs;
    #timer = null;
    constructor(path, options) {
        super(options);
        this.#path = path;
        this.#flushMs = options.flushMs ?? 1000;
    }
    static async open(path, options = {}) {
        const store = new JsonFileStore(path, options);
        let raw;
        try {
            raw = await readFile(path, 'utf8');
        }
        catch {
            return store;
        }
        try {
            const saved = JSON.parse(raw);
            const now = Date.now();
            for (const [key, stored] of Object.entries(saved)) {
                if (stored.expiresAt === null || stored.expiresAt > now)
                    store.entries.set(key, stored);
            }
        }
        catch (error) {
            throw new FileError('FILE_INVALID', `${path} is not a valid session file`, { cause: error });
        }
        return store;
    }
    set(key, value) {
        super.set(key, value);
        this.#schedule();
    }
    delete(key) {
        super.delete(key);
        this.#schedule();
    }
    /** Writes the sessions to disk now. / Escribe las sesiones en disco ahora. */
    async flush() {
        if (this.#timer)
            clearTimeout(this.#timer);
        this.#timer = null;
        const temp = `${this.#path}.tmp`;
        await mkdir(dirname(this.#path), { recursive: true });
        await writeFile(temp, JSON.stringify(Object.fromEntries(this.entries)), { mode: 0o600 });
        await rename(temp, this.#path);
    }
    async close() {
        await this.flush();
    }
    #schedule() {
        if (this.#timer)
            return;
        this.#timer = setTimeout(() => void this.flush().catch(() => undefined), this.#flushMs);
        this.#timer.unref();
    }
}
function defaultKey(ctx, scope) {
    if (scope === 'chat')
        return `chat:${ctx.chatId}`;
    if (!ctx.from)
        return null;
    return scope === 'user' ? `user:${ctx.from.id}` : `member:${ctx.chatId}:${ctx.from.id}`;
}
/** Gives every handler a ctx.session that is kept between updates. / Da a cada manejador un ctx.session que se conserva entre actualizaciones. */
export function session(options = {}) {
    const store = options.store ?? new MemoryStore({ ttlMs: 24 * 60 * 60 * 1000 });
    const scope = options.scope ?? 'member';
    return async (ctx, next) => {
        const key = options.key ? options.key(ctx) : defaultKey(ctx, scope);
        if (key === null)
            return next();
        ctx.session = (await store.get(key)) ?? options.initial?.() ?? {};
        try {
            await next();
        }
        finally {
            await store.set(key, ctx.session);
        }
    };
}
