import { Agent as HttpAgent, request as httpRequest, type IncomingMessage } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { createGunzip } from 'node:zlib';

export interface FastFetchOptions {
  maxSockets?: number;
  keepAliveMs?: number;
}

export interface FastFetch {
  fetch: typeof fetch;
  destroy(): void;
}

const EMPTY_BODY = new Set([101, 204, 205, 304]);

const DROPPED_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding']);

function abortError(): Error {
  const error = new Error('This operation was aborted');
  error.name = 'AbortError';
  return error;
}

function toHeaders(raw: IncomingMessage['headers']): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined || DROPPED_HEADERS.has(name)) continue;
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
  }
  return headers;
}

/** A fetch over keep-alive sockets: no new TCP/TLS handshake while the server keeps the connection open. / Un fetch sobre sockets keep-alive: sin nuevo handshake TCP/TLS mientras el servidor mantenga la conexión abierta. */
export function createFastFetch(options: FastFetchOptions = {}): FastFetch {
  const agentOptions = {
    keepAlive: true,
    keepAliveMsecs: options.keepAliveMs ?? 15_000,
    maxSockets: options.maxSockets ?? 64,
    maxFreeSockets: Math.max(2, Math.min(options.maxSockets ?? 64, 32)),
    scheduling: 'lifo' as const,
  };
  const http = new HttpAgent(agentOptions);
  const https = new HttpsAgent(agentOptions);

  const run = (input: string | URL | Request, init: RequestInit = {}): Promise<Response> =>
    new Promise<Response>((resolve, reject) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      const secure = url.protocol === 'https:';
      if (!secure && url.protocol !== 'http:') return reject(new TypeError(`unsupported protocol ${url.protocol}`));

      const signal = init.signal ?? undefined;
      if (signal?.aborted) return reject(abortError());

      const body = init.body === undefined || init.body === null ? undefined : (init.body as string | Uint8Array);
      const headers = new Headers(init.headers);
      if (!headers.has('accept-encoding')) headers.set('accept-encoding', 'gzip');
      if (body !== undefined) headers.set('content-length', String(Buffer.byteLength(body)));

      let settled = false;
      const finish = (action: () => void): void => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', onAbort);
        action();
      };

      const req = (secure ? httpsRequest : httpRequest)(
        url,
        { method: init.method ?? 'GET', headers: Object.fromEntries(headers), agent: secure ? https : http },
        (res: IncomingMessage) => {
          const source = res.headers['content-encoding'] === 'gzip' ? res.pipe(createGunzip()) : res;
          const chunks: Buffer[] = [];
          source.on('data', (chunk: Buffer) => chunks.push(chunk));
          source.on('error', (error) => finish(() => reject(error)));
          res.on('error', (error) => finish(() => reject(error)));
          source.on('end', () =>
            finish(() => {
              const status = res.statusCode ?? 0;
              resolve(
                new Response(EMPTY_BODY.has(status) ? null : Buffer.concat(chunks), {
                  status,
                  statusText: res.statusMessage ?? '',
                  headers: toHeaders(res.headers),
                }),
              );
            }),
          );
        },
      );

      const onAbort = (): void => {
        req.destroy(abortError());
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      req.on('socket', (socket) => {
        socket.setNoDelay(true);
        socket.setKeepAlive(true, agentOptions.keepAliveMsecs);
      });
      req.on('error', (error) => finish(() => reject(error)));
      req.end(body);
    });

  return {
    fetch: run as typeof fetch,
    destroy: () => {
      http.destroy();
      https.destroy();
    },
  };
}
