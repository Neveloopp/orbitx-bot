import { createBot, type Bot, type BotConfig, type Update } from '../src/index.js';
import { fakeFetch, type FakeRoutes, type RecordedCall } from '../src/testing.js';

export const KEY = `oxb_${'a'.repeat(10)}_${'B'.repeat(40)}`;

export function makeBot(routes: FakeRoutes = {}, config: Partial<BotConfig> = {}): { bot: Bot; calls: RecordedCall[] } {
  const { fetch, calls } = fakeFetch({ getMe: () => ({ id: 'bot-1', handle: 'testbot' }), ...routes });
  const bot = createBot({ key: KEY, logger: false, request: { fetch }, ...config });
  return { bot, calls };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export const ok = (result: unknown = {}, status = 200): Response => json({ ok: true, result }, status);

export const fail = (code: string, message: string, status: number, headers: Record<string, string> = {}): Response =>
  json({ ok: false, error: { code, message } }, status, headers);

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function until(check: () => boolean, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('timed out waiting for a condition');
    await sleep(5);
  }
}

export interface FakeServer {
  fetch: typeof fetch;
  sent: RecordedCall[];
  polls: number;
}

export function fakeServer(batches: Array<Update[] | (() => Update[])>, gate: () => boolean = () => true): FakeServer {
  const server: FakeServer = { fetch: undefined as never, sent: [], polls: 0 };
  server.fetch = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = url.pathname.split('/').pop() ?? '';
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    if (method === 'getMe') return ok({ id: 'bot-1', handle: 'testbot' });
    if (method === 'getUpdates') {
      server.polls++;
      const next = batches[0];
      if (next !== undefined && gate()) {
        batches.shift();
        return ok(typeof next === 'function' ? next() : next);
      }
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }
    server.sent.push({ method, params: body });
    return ok({ seq: server.sent.length });
  }) as typeof fetch;
  return server;
}
