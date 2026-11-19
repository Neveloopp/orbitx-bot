import {
  AbortedError,
  ApiError,
  AuthError,
  BadResponseError,
  NetworkError,
  OrbitxError,
  RequestTimeoutError,
} from '../errors.js';
import type { Logger } from '../logger.js';
import { authorization, METHOD, methodUrl, READ_ONLY_METHODS } from '../protocol.js';
import { sleep } from '../utils/async.js';

export interface TransportOptions {
  baseUrl: string;
  key: string;
  timeoutMs: number;
  retries: number;
  headers: Readonly<Record<string, string>>;
  fetch: typeof fetch;
  logger: Logger;
}

export interface CallOptions {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

interface Envelope<T> {
  ok: boolean;
  result?: T;
  error?: { code?: string; message?: string };
}

function backoff(attempt: number, hint: number | null): number {
  if (hint !== null) return Math.min(hint, 30_000);
  return Math.min(250 * 2 ** attempt, 4000) + Math.floor(Math.random() * 120);
}

export class Transport {
  readonly #options: TransportOptions;
  #lastActivity = Date.now();

  constructor(options: TransportOptions) {
    this.#options = options;
  }

  /** Milliseconds since the last request other than the long poll. / Milisegundos desde la última petición que no fue el long poll. */
  idleMs(): number {
    return Date.now() - this.#lastActivity;
  }

  /** Opens `count` connections at once with a cheap call; failures are ignored. Returns how many worked. / Abre `count` conexiones a la vez con una llamada barata; ignora los fallos. Devuelve cuántas funcionaron. */
  async warm(count: number): Promise<number> {
    const calls = Array.from({ length: Math.max(0, Math.floor(count)) }, () =>
      this.#once(METHOD.getMe, methodUrl(this.#options.baseUrl, METHOD.getMe), { body: '{}', type: 'application/json' }, { retries: 0 }, (res) =>
        this.#unwrap<unknown>(res, METHOD.getMe),
      ).then(
        () => true,
        () => false,
      ),
    );
    return (await Promise.all(calls)).filter(Boolean).length;
  }

  /** Calls one API method with a JSON body. / Llama a un método de la API con cuerpo JSON. */
  call<T>(method: string, params: object = {}, options: CallOptions = {}): Promise<T> {
    return this.#send(
      method,
      methodUrl(this.#options.baseUrl, method),
      { body: JSON.stringify(params), type: 'application/json' },
      options,
      (res) => this.#unwrap<T>(res, method),
    );
  }

  /** Calls a method that answers with a file. / Llama a un método que responde con un archivo. */
  bytes(method: string, params: object = {}, options: CallOptions = {}): Promise<Buffer> {
    return this.#send(
      method,
      methodUrl(this.#options.baseUrl, method),
      { body: JSON.stringify(params), type: 'application/json' },
      options,
      async (res) => {
        if (!res.ok) return this.#unwrap<never>(res, method);
        return Buffer.from(await res.arrayBuffer());
      },
    );
  }

  /** Sends a file as the body; the other parameters go in the query. / Envía un archivo como cuerpo; los demás parámetros van en la query. */
  upload<T>(
    method: string,
    params: Record<string, unknown>,
    data: Uint8Array,
    options: CallOptions = {},
  ): Promise<T> {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      query.set(name, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    return this.#send(
      method,
      methodUrl(this.#options.baseUrl, method, query),
      { body: data, type: 'application/octet-stream' },
      options,
      (res) => this.#unwrap<T>(res, method),
    );
  }

  async #send<T>(
    method: string,
    url: string,
    payload: { body: string | Uint8Array; type: string },
    options: CallOptions,
    read: (res: Response) => Promise<T>,
  ): Promise<T> {
    const maxRetries = options.retries ?? this.#options.retries;
    const readOnly = READ_ONLY_METHODS.has(method);
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.#once(method, url, payload, options, read);
      } catch (error) {
        const again =
          error instanceof OrbitxError &&
          error.retryable &&
          (readOnly || error.status === 429) &&
          attempt < maxRetries &&
          !options.signal?.aborted;
        if (!again) throw error;
        const wait = backoff(attempt, (error as OrbitxError).retryAfterMs);
        this.#options.logger.debug(`${method} failed, retrying in ${wait} ms`, error);
        await sleep(wait, options.signal);
      }
    }
  }

  async #once<T>(
    method: string,
    url: string,
    payload: { body: string | Uint8Array; type: string },
    options: CallOptions,
    read: (res: Response) => Promise<T>,
  ): Promise<T> {
    if (method !== METHOD.getUpdates) this.#lastActivity = Date.now();
    const timeoutMs = options.timeoutMs ?? this.#options.timeoutMs;
    const external = options.signal;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = (): void => controller.abort();
    if (external?.aborted) controller.abort();
    else external?.addEventListener('abort', onAbort, { once: true });

    try {
      const res = await this.#options.fetch(url, {
        method: 'POST',
        headers: {
          ...this.#options.headers,
          authorization: authorization(this.#options.key),
          'content-type': payload.type,
        },
        body: payload.body as RequestInit['body'],
        signal: controller.signal,
      });
      return await read(res);
    } catch (error) {
      if (error instanceof OrbitxError) throw error;
      if (timedOut) throw new RequestTimeoutError(method, timeoutMs, error);
      if (external?.aborted) throw new AbortedError(method, error);
      throw new NetworkError(method, error);
    } finally {
      if (method !== METHOD.getUpdates) this.#lastActivity = Date.now();
      clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    }
  }

  async #unwrap<T>(res: Response, method: string): Promise<T> {
    let body: Envelope<T> | null = null;
    try {
      body = JSON.parse(await res.text()) as Envelope<T>;
    } catch {
      body = null;
    }
    if (body === null || typeof body !== 'object' || typeof body.ok !== 'boolean') {
      throw new BadResponseError(method, res.status);
    }
    if (!body.ok) {
      const { code, message } = body.error ?? {};
      if (res.status === 401) throw new AuthError(method, code, message);
      const seconds = Number(res.headers.get('retry-after'));
      const extra = Number.isFinite(seconds) && seconds > 0 ? { retryAfterMs: seconds * 1000 } : {};
      throw new ApiError(method, res.status, code, message, extra);
    }
    return body.result as T;
  }
}
