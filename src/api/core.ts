import { createBudget } from '../cache/memory.js';
import { stableKey, type CacheKind, ReadLayer } from '../cache/reads.js';
import { ByteCache } from '../cache/store.js';
import type { ResolvedConfig } from '../config.js';
import { resolveFile, type FileLimits } from '../http/files.js';
import { Transport, type CallOptions } from '../http/transport.js';
import { toRows, type Keyboard } from '../ui/keyboard.js';
import type { Button, FileInput } from '../types/options.js';

export class ApiCore {
  readonly transport: Transport;
  readonly store: ByteCache;
  readonly reads: ReadLayer;
  readonly #limits: FileLimits;

  constructor(config: ResolvedConfig, transport: Transport) {
    this.transport = transport;
    this.store = new ByteCache(createBudget(config.cache));
    this.reads = new ReadLayer(this.store, config.cache.enabled, config.cache.ttlMs);
    this.#limits = {
      fetch: config.request.fetch,
      timeoutMs: config.request.timeoutMs,
      maxBytes: config.request.maxFileBytes,
      reads: this.reads,
    };
  }

  /** A read that is answered from memory when it is fresh and shared when it is already in flight. / Una lectura que se responde desde memoria si está fresca y se comparte si ya va en camino. */
  read<T>(kind: CacheKind, method: string, params: object, tags: readonly string[]): Promise<T> {
    return this.reads.json<T>(kind, stableKey(method, params), tags, () => this.transport.call<T>(method, params));
  }

  readBytes(kind: CacheKind, method: string, params: object, tags: readonly string[]): Promise<Buffer> {
    return this.reads.bytes(kind, stableKey(method, params), tags, () => this.transport.bytes(method, params));
  }

  call<T>(method: string, params: object = {}, options?: CallOptions): Promise<T> {
    return this.transport.call<T>(method, params, options);
  }

  bytes(method: string, params: object = {}, options?: CallOptions): Promise<Buffer> {
    return this.transport.bytes(method, params, options);
  }

  async upload<T>(
    method: string,
    params: Record<string, unknown>,
    file: FileInput,
    options?: CallOptions,
  ): Promise<T> {
    const { data, name } = await resolveFile(file, this.#limits);
    const merged = { ...params, name: params['name'] || name || undefined };
    return this.transport.upload<T>(method, merged, data, options);
  }
}

export function withRows(options: {
  buttons?: Button[][] | Keyboard;
  [key: string]: unknown;
}): Record<string, unknown> {
  const { buttons, ...rest } = options;
  return buttons === undefined ? rest : { ...rest, buttons: toRows(buttons) };
}
