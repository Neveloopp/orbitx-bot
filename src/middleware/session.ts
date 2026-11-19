import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Context } from '../core/context.js';
import type { Middleware } from '../core/types.js';
import { FileError } from '../errors.js';
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
export class MemoryStore implements SessionStore {
  protected readonly entries = new Map<string, Stored>();
  readonly #ttlMs: number | null;
  readonly #maxEntries: number;

  constructor(options: MemoryStoreOptions = {}) {
    this.#ttlMs = options.ttlMs ?? null;
    this.#maxEntries = options.maxEntries ?? 10_000;
  }

  get(key: string): SessionData | undefined {
    const stored = this.entries.get(key);
    if (!stored) return undefined;
    if (stored.expiresAt !== null && stored.expiresAt <= Date.now()) {
      this.delete(key);
      return undefined;
    }
    return stored.value;
  }

  set(key: string, value: SessionData): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.#ttlMs === null ? null : Date.now() + this.#ttlMs });
    while (this.entries.size > this.#maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.delete(oldest);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}

export interface JsonFileStoreOptions extends MemoryStoreOptions {
  flushMs?: number;
}

/** Sessions saved in a JSON file, so they survive restarts. / Sesiones guardadas en un archivo JSON para sobrevivir a los reinicios. */
export class JsonFileStore extends MemoryStore {
  readonly #path: string;
  readonly #flushMs: number;
  #timer: NodeJS.Timeout | null = null;

  private constructor(path: string, options: JsonFileStoreOptions) {
    super(options);
    this.#path = path;
    this.#flushMs = options.flushMs ?? 1000;
  }

  static async open(path: string, options: JsonFileStoreOptions = {}): Promise<JsonFileStore> {
    const store = new JsonFileStore(path, options);
    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch {
      return store;
    }
    try {
      const saved = JSON.parse(raw) as Record<string, Stored>;
      const now = Date.now();
      for (const [key, stored] of Object.entries(saved)) {
        if (stored.expiresAt === null || stored.expiresAt > now) store.entries.set(key, stored);
      }
    } catch (error) {
      throw new FileError('FILE_INVALID', `${path} is not a valid session file`, { cause: error });
    }
    return store;
  }

  override set(key: string, value: SessionData): void {
    super.set(key, value);
    this.#schedule();
  }

  override delete(key: string): void {
    super.delete(key);
    this.#schedule();
  }

  /** Writes the sessions to disk now. / Escribe las sesiones en disco ahora. */
  async flush(): Promise<void> {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    const temp = `${this.#path}.tmp`;
    await mkdir(dirname(this.#path), { recursive: true });
    await writeFile(temp, JSON.stringify(Object.fromEntries(this.entries)), { mode: 0o600 });
    await rename(temp, this.#path);
  }

  async close(): Promise<void> {
    await this.flush();
  }

  #schedule(): void {
    if (this.#timer) return;
    this.#timer = setTimeout(() => void this.flush().catch(() => undefined), this.#flushMs);
    this.#timer.unref();
  }
}

export interface SessionOptions {
  store?: SessionStore;
  scope?: 'member' | 'user' | 'chat';
  key?: (ctx: Context) => string | null;
  initial?: () => SessionData;
}

function defaultKey(ctx: Context, scope: 'member' | 'user' | 'chat'): string | null {
  if (scope === 'chat') return `chat:${ctx.chatId}`;
  if (!ctx.from) return null;
  return scope === 'user' ? `user:${ctx.from.id}` : `member:${ctx.chatId}:${ctx.from.id}`;
}

/** Gives every handler a ctx.session that is kept between updates. / Da a cada manejador un ctx.session que se conserva entre actualizaciones. */
export function session(options: SessionOptions = {}): Middleware {
  const store = options.store ?? new MemoryStore({ ttlMs: 24 * 60 * 60 * 1000 });
  const scope = options.scope ?? 'member';
  return async (ctx, next) => {
    const key = options.key ? options.key(ctx) : defaultKey(ctx, scope);
    if (key === null) return next();
    ctx.session = (await store.get(key)) ?? options.initial?.() ?? {};
    try {
      await next();
    } finally {
      await store.set(key, ctx.session);
    }
  };
}
