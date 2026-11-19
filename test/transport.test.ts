import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AbortedError,
  ApiError,
  AuthError,
  BadResponseError,
  createBot,
  FileError,
  NetworkError,
  RequestTimeoutError,
} from '../src/index.js';
import { fail, json, KEY, ok } from './helpers.js';

type Step = (url: string, init: RequestInit) => Response | Promise<Response>;

function scripted(steps: Step[]): { fetch: typeof fetch; urls: string[]; inits: RequestInit[] } {
  const urls: string[] = [];
  const inits: RequestInit[] = [];
  let index = 0;
  const impl = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    urls.push(String(input));
    inits.push(init);
    const step = steps[Math.min(index++, steps.length - 1)];
    if (!step) throw new Error('no step');
    return step(String(input), init);
  };
  return { fetch: impl as typeof fetch, urls, inits };
}

const botWith = (fetchImpl: typeof fetch, request: Record<string, unknown> = {}) =>
  createBot({ key: KEY, logger: false, request: { fetch: fetchImpl, retries: 2, ...request } });

test('sends the key and a JSON body, and unwraps the result', async () => {
  const net = scripted([() => ok({ seq: 7 })]);
  const result = await botWith(net.fetch).api.messages.send('c1', 'hola', { replyTo: 3 });
  assert.deepEqual(result, { seq: 7 });
  assert.equal(net.urls[0], 'https://ctrl.orbitxspace.com/apiuser/bot/v1/sendMessage');
  const init = net.inits[0] as { headers: Record<string, string>; body: string };
  assert.equal(init.headers['authorization'], `Bearer ${KEY}`);
  assert.deepEqual(JSON.parse(init.body), { chatId: 'c1', text: 'hola', replyTo: 3 });
});

test('a Keyboard is turned into rows before it is sent', async () => {
  const net = scripted([() => ok()]);
  const { Keyboard, button } = await import('../src/index.js');
  const keyboard = new Keyboard().row(button('A', 'a'), button('B', { url: 'https://x.y' }, { style: 'danger' }));
  await botWith(net.fetch).api.messages.send('c1', 'hi', { buttons: keyboard });
  const body = JSON.parse((net.inits[0] as { body: string }).body) as { buttons: unknown };
  assert.deepEqual(body.buttons, [
    [
      { text: 'A', data: 'a' },
      { text: 'B', url: 'https://x.y', style: 'danger' },
    ],
  ]);
});

test('API errors keep the remote code and message', async () => {
  const net = scripted([() => fail('BOT_CHAT_NOT_FOUND', 'no such chat', 404)]);
  await assert.rejects(botWith(net.fetch).api.chats.get('zzz'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'BOT_CHAT_NOT_FOUND');
    assert.equal(error.status, 404);
    assert.equal(error.method, 'getChat');
    assert.equal(error.retryable, false);
    return true;
  });
});

test('401 becomes an AuthError', async () => {
  const net = scripted([() => fail('BOT_KEY_INVALID', 'bad key', 401)]);
  await assert.rejects(botWith(net.fetch).api.account.me(), (error: unknown) => {
    assert.ok(error instanceof AuthError);
    assert.match(error.explain('es'), /rechaz/i);
    return true;
  });
});

test('a non-JSON answer is a BadResponseError', async () => {
  const net = scripted([() => new Response('<html>oops</html>', { status: 502 })]);
  await assert.rejects(botWith(net.fetch, { retries: 0 }).api.account.me(), BadResponseError);
});

test('read-only calls are retried on 5xx', async () => {
  const net = scripted([() => fail('X', 'boom', 503), () => ok({ id: 'bot' })]);
  const me = await botWith(net.fetch).api.account.me();
  assert.equal(me.id, 'bot');
  assert.equal(net.urls.length, 2);
});

test('writes are never retried after a 5xx (no double sends)', async () => {
  const net = scripted([() => fail('X', 'boom', 500), () => ok()]);
  await assert.rejects(botWith(net.fetch).api.messages.send('c', 'x'), ApiError);
  assert.equal(net.urls.length, 1);
});

test('a 429 is retried for writes, honouring Retry-After', async () => {
  const net = scripted([() => fail('SLOW', 'slow down', 429, { 'retry-after': '0.001' }), () => ok({ seq: 1 })]);
  const started = Date.now();
  await botWith(net.fetch).api.messages.send('c', 'x');
  assert.equal(net.urls.length, 2);
  assert.ok(Date.now() - started < 1500);
});

test('network failures and timeouts have their own errors', async () => {
  const down = scripted([() => Promise.reject(new TypeError('fetch failed'))]);
  await assert.rejects(botWith(down.fetch, { retries: 0 }).api.messages.send('c', 'x'), NetworkError);

  const slow = scripted([
    (_url, init) =>
      new Promise<Response>((_, reject) => {
        (init.signal as AbortSignal).addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
  ]);
  await assert.rejects(botWith(slow.fetch, { timeoutMs: 30, retries: 0 }).api.messages.send('c', 'x'), RequestTimeoutError);
});

test('an external signal cancels with AbortedError', async () => {
  const slow = scripted([
    (_url, init) =>
      new Promise<Response>((_, reject) => {
        (init.signal as AbortSignal).addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
  ]);
  const controller = new AbortController();
  const bot = botWith(slow.fetch);
  const pending = bot.api.transport.call('getUpdates', {}, { signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(pending, AbortedError);
});

test('uploads send the bytes as the body and the options in the query', async () => {
  const net = scripted([() => ok({ seq: 2 })]);
  const bot = botWith(net.fetch);
  await bot.api.media.photo('c1', { data: new Uint8Array([1, 2, 3]), name: 'a.png' }, { caption: 'hi', replyTo: 4 });
  const url = new URL(net.urls[0] as string);
  assert.equal(url.pathname.endsWith('/sendPhoto'), true);
  assert.equal(url.searchParams.get('chatId'), 'c1');
  assert.equal(url.searchParams.get('caption'), 'hi');
  assert.equal(url.searchParams.get('name'), 'a.png');
  const init = net.inits[0] as { headers: Record<string, string>; body: Uint8Array };
  assert.equal(init.headers['content-type'], 'application/octet-stream');
  assert.deepEqual([...init.body], [1, 2, 3]);
});

test('files: missing path, bad input and size limit are FileErrors', async () => {
  const bot = botWith(scripted([() => ok()]).fetch, { maxFileBytes: 2 });
  await assert.rejects(bot.api.media.photo('c', '/definitely/not/here.png'), (e: unknown) => e instanceof FileError && e.code === 'FILE_NOT_FOUND');
  await assert.rejects(bot.api.media.photo('c', 42 as never), (e: unknown) => e instanceof FileError && e.code === 'FILE_INVALID');
  await assert.rejects(bot.api.media.photo('c', new Uint8Array(5)), (e: unknown) => e instanceof FileError && e.code === 'FILE_TOO_LARGE');
  await assert.rejects(bot.api.media.photo('c', 'ftp://x/y.png'), (e: unknown) => e instanceof FileError);
});

test('downloads a URL once and uploads its bytes', async () => {
  const net = scripted([
    (url) => (url.startsWith('https://cdn.test/') ? new Response(new Uint8Array([9, 9]), { status: 200 }) : ok({ seq: 1 })),
    () => ok({ seq: 1 }),
  ]);
  await botWith(net.fetch).api.media.document('c', 'https://cdn.test/files/report.pdf');
  assert.equal(net.urls[0], 'https://cdn.test/files/report.pdf');
  assert.equal(new URL(net.urls[1] as string).searchParams.get('name'), 'report.pdf');
});

test('binary answers come back as a Buffer, errors as ApiError', async () => {
  const good = scripted([() => new Response(new Uint8Array([1, 2]), { status: 200 })]);
  const bytes = await botWith(good.fetch).api.media.download('c', 5);
  assert.ok(Buffer.isBuffer(bytes));
  assert.deepEqual([...bytes], [1, 2]);

  const bad = scripted([() => json({ ok: false, error: { code: 'NO_FILE', message: 'gone' } }, 404)]);
  await assert.rejects(botWith(bad.fetch).api.media.download('c', 5), ApiError);
});
