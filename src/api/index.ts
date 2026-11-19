import type { CacheStats } from '../cache/store.js';
import type { ResolvedConfig } from '../config.js';
import { Transport } from '../http/transport.js';
import { AccountApi } from './account.js';
import { ChatsApi } from './chats.js';
import { ApiCore } from './core.js';
import { MediaApi } from './media.js';
import { MembersApi } from './members.js';
import { MessagesApi } from './messages.js';

export class Api {
  readonly messages: MessagesApi;
  readonly media: MediaApi;
  readonly chats: ChatsApi;
  readonly members: MembersApi;
  readonly account: AccountApi;
  readonly #core: ApiCore;

  constructor(config: ResolvedConfig) {
    const transport = new Transport({
      baseUrl: config.baseUrl,
      key: config.key,
      timeoutMs: config.request.timeoutMs,
      retries: config.request.retries,
      headers: config.request.headers,
      fetch: config.request.fetch,
      logger: config.logger,
    });
    this.#core = new ApiCore(config, transport);
    this.messages = new MessagesApi(this.#core);
    this.media = new MediaApi(this.#core);
    this.chats = new ChatsApi(this.#core);
    this.members = new MembersApi(this.#core);
    this.account = new AccountApi(this.#core);
  }

  /** Calls any method of the bot API by its name. / Llama a cualquier método de la API de bots por su nombre. */
  call<T = unknown>(method: string, params: object = {}): Promise<T> {
    return this.#core.call<T>(method, params);
  }

  get transport(): Transport {
    return this.#core.transport;
  }

  /** Counters of the memory cache (hits, misses, bytes, budget). / Contadores de la caché en memoria (aciertos, fallos, bytes, presupuesto). */
  get cache(): CacheStats {
    return this.#core.reads.stats();
  }

  /** Drops what was kept in memory: everything, or only what depends on the tags. / Descarta lo guardado en memoria: todo, o solo lo que depende de las etiquetas. */
  invalidate(...tags: string[]): void {
    if (tags.length === 0) this.#core.reads.clear();
    else this.#core.reads.invalidate(...tags);
  }

  /** Forgets what is kept about a chat (after a change made outside this bot). / Olvida lo guardado de un chat (tras un cambio hecho fuera de este bot). */
  invalidateChat(chat: string | number): void {
    this.#core.reads.invalidateChat(chat);
  }

  /** Opens connections ahead of time so the first requests skip the handshake. / Abre conexiones por adelantado para que las primeras peticiones se salten el handshake. */
  warm(count = 2): Promise<number> {
    return this.#core.transport.warm(count);
  }
}
