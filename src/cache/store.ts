export interface CacheStats {
  enabled: boolean;
  entries: number;
  bytes: number;
  budgetBytes: number;
  hits: number;
  misses: number;
  coalesced: number;
  evictions: number;
}

interface Entry {
  value: unknown;
  bytes: number;
  expiresAt: number;
  tags: readonly string[];
}

const SWEEP_MS = 15_000;

/** An in-memory cache that stays inside a byte budget and drops the least recently used first. / Una caché en memoria que respeta un presupuesto de bytes y descarta primero lo menos usado. */
export class ByteCache {
  readonly #entries = new Map<string, Entry>();
  readonly #byTag = new Map<string, Set<string>>();
  readonly #budget: () => number;
  #bytes = 0;
  #hits = 0;
  #misses = 0;
  #coalesced = 0;
  #evictions = 0;
  #sweeper: NodeJS.Timeout | null = null;

  constructor(budget: () => number) {
    this.#budget = budget;
  }

  get<T>(key: string): T | undefined {
    const entry = this.#entries.get(key);
    if (entry === undefined) {
      this.#misses++;
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.#remove(key, entry);
      this.#misses++;
      return undefined;
    }
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    this.#hits++;
    return entry.value as T;
  }

  set(key: string, value: unknown, bytes: number, ttlMs: number, tags: readonly string[] = []): boolean {
    this.delete(key);
    const budget = this.#budget();
    if (ttlMs <= 0 || bytes > budget / 2) return false;
    this.#entries.set(key, { value, bytes, expiresAt: Date.now() + ttlMs, tags });
    this.#bytes += bytes;
    for (const tag of tags) {
      const keys = this.#byTag.get(tag) ?? new Set<string>();
      keys.add(key);
      this.#byTag.set(tag, keys);
    }
    this.#fit(budget);
    this.#arm();
    return true;
  }

  delete(key: string): void {
    const entry = this.#entries.get(key);
    if (entry !== undefined) this.#remove(key, entry);
  }

  invalidate(tag: string): number {
    const keys = this.#byTag.get(tag);
    if (keys === undefined) return 0;
    let removed = 0;
    for (const key of [...keys]) {
      const entry = this.#entries.get(key);
      if (entry !== undefined) {
        this.#remove(key, entry);
        removed++;
      }
    }
    return removed;
  }

  clear(): void {
    this.#entries.clear();
    this.#byTag.clear();
    this.#bytes = 0;
  }

  trim(): void {
    const now = Date.now();
    for (const [key, entry] of this.#entries) if (entry.expiresAt <= now) this.#remove(key, entry);
    this.#fit(this.#budget());
  }

  noteCoalesced(): void {
    this.#coalesced++;
  }

  stats(enabled = true): CacheStats {
    return {
      enabled,
      entries: this.#entries.size,
      bytes: this.#bytes,
      budgetBytes: this.#budget(),
      hits: this.#hits,
      misses: this.#misses,
      coalesced: this.#coalesced,
      evictions: this.#evictions,
    };
  }

  #remove(key: string, entry: Entry): void {
    this.#entries.delete(key);
    this.#bytes -= entry.bytes;
    for (const tag of entry.tags) {
      const keys = this.#byTag.get(tag);
      if (keys === undefined) continue;
      keys.delete(key);
      if (keys.size === 0) this.#byTag.delete(tag);
    }
  }

  #fit(budget: number): void {
    for (const [key, entry] of this.#entries) {
      if (this.#bytes <= budget) return;
      this.#remove(key, entry);
      this.#evictions++;
    }
  }

  #arm(): void {
    if (this.#sweeper !== null) return;
    this.#sweeper = setInterval(() => this.trim(), SWEEP_MS);
    this.#sweeper.unref();
  }
}
