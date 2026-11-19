import type { Id } from '../types/entities.js';
import type { ByteCache, CacheStats } from './store.js';

export type CacheKind = 'me' | 'user' | 'chat' | 'members' | 'chats' | 'file' | 'photo' | 'download';

export type CacheTtl = Record<CacheKind, number>;

export const DEFAULT_TTL_MS: CacheTtl = {
  me: 300_000,
  user: 60_000,
  chat: 15_000,
  members: 15_000,
  chats: 10_000,
  file: 600_000,
  photo: 300_000,
  download: 300_000,
};

interface Flight {
  promise: Promise<unknown>;
  tags: readonly string[];
}

export function stableKey(method: string, params: unknown): string {
  const sort = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sort);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([name, inner]) => [name, sort(inner)]),
      );
    }
    return value;
  };
  return `${method}:${JSON.stringify(sort(params))}`;
}

const jsonSize = (value: unknown): number => (JSON.stringify(value) ?? '').length * 2 + 64;

/** Answers repeated reads from memory and merges identical requests made at the same time. / Responde lecturas repetidas desde memoria y fusiona peticiones idénticas hechas a la vez. */
export class ReadLayer {
  readonly #store: ByteCache;
  readonly #enabled: boolean;
  readonly #ttl: CacheTtl;
  readonly #flights = new Map<string, Flight>();
  readonly #epochs = new Map<string, number>();

  constructor(store: ByteCache, enabled: boolean, ttl: CacheTtl) {
    this.#store = store;
    this.#enabled = enabled;
    this.#ttl = ttl;
  }

  json<T>(kind: CacheKind, key: string, tags: readonly string[], load: () => Promise<T>): Promise<T> {
    return this.#run(kind, key, tags, load, jsonSize, (value) => structuredClone(value));
  }

  bytes(kind: CacheKind, key: string, tags: readonly string[], load: () => Promise<Buffer>): Promise<Buffer> {
    return this.#run(kind, key, tags, load, (value) => value.byteLength, (value) => Buffer.from(value));
  }

  /** Forgets what depends on these tags (after a write that changes it). / Olvida lo que depende de estas etiquetas (tras una escritura que lo cambia). */
  invalidate(...tags: string[]): void {
    for (const tag of tags) {
      this.#epochs.set(tag, (this.#epochs.get(tag) ?? 0) + 1);
      this.#store.invalidate(tag);
    }
    for (const [key, flight] of this.#flights) {
      if (flight.tags.some((tag) => tags.includes(tag))) this.#flights.delete(key);
    }
  }

  invalidateChat(chat: Id): void {
    this.invalidate(`chat:${chat}`, `files:${chat}`, 'chats');
  }

  clear(): void {
    this.#store.clear();
    this.#flights.clear();
  }

  stats(): CacheStats {
    return this.#store.stats(this.#enabled);
  }

  async #run<T>(
    kind: CacheKind,
    key: string,
    tags: readonly string[],
    load: () => Promise<T>,
    measure: (value: T) => number,
    copy: (value: T) => T,
  ): Promise<T> {
    const ttl = this.#ttl[kind];
    if (!this.#enabled || ttl <= 0) return load();

    const hit = this.#store.get<T>(key);
    if (hit !== undefined) return copy(hit);

    let flight = this.#flights.get(key);
    if (flight !== undefined) {
      this.#store.noteCoalesced();
    } else {
      const seen = tags.map((tag) => this.#epochs.get(tag) ?? 0);
      const promise: Promise<T> = load()
        .then((value) => {
          const unchanged = tags.every((tag, index) => (this.#epochs.get(tag) ?? 0) === seen[index]);
          if (unchanged && value !== undefined) this.#store.set(key, value, measure(value), ttl, tags);
          return value;
        })
        .finally(() => {
          if (this.#flights.get(key) === flight) this.#flights.delete(key);
        });
      flight = { promise, tags };
      this.#flights.set(key, flight);
    }
    return copy((await flight.promise) as T);
  }
}
