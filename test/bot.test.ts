import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { AuthError, ConfigError, createBot, StateError } from '../src/index.js';
import { messageUpdate } from '../src/testing.js';
import { fail, fakeServer, KEY, makeBot, ok, sleep, until } from './helpers.js';

test('start() connects, answers updates, and stop() ends it cleanly', async () => {
  const server = fakeServer([[messageUpdate('/ping')]]);
  const bot = createBot({ key: KEY, logger: false, request: { fetch: server.fetch } });
  const hooks: string[] = [];
  bot.onStart(() => void hooks.push('start'));
  bot.onStop(() => void hooks.push('stop'));
  bot.onCommand('ping', (ctx) => ctx.reply('pong'));

  const running = bot.start();
  await until(() => server.sent.length === 1);
  assert.equal(bot.running, true);
  assert.equal(bot.me?.handle, 'testbot');
  assert.equal(server.sent[0]?.method, 'sendMessage');
  assert.equal(server.sent[0]?.params['text'], 'pong');

  await bot.stop();
  await running;
  assert.equal(bot.running, false);
  assert.deepEqual(hooks, ['start', 'stop']);
});

test('start() twice is an error', async () => {
  const server = fakeServer([]);
  const bot = createBot({ key: KEY, logger: false, request: { fetch: server.fetch } });
  const running = bot.start();
  await until(() => server.polls > 0);
  await assert.rejects(bot.start(), StateError);
  await bot.stop();
  await running;
});

test('a rejected key stops start() with an AuthError', async () => {
  const bot = createBot({
    key: KEY,
    logger: false,
    request: { fetch: (async () => fail('BOT_KEY_INVALID', 'bad key', 401)) as typeof fetch },
  });
  await assert.rejects(bot.start(), AuthError);
  assert.equal(bot.running, false);
});

test('the poller survives network errors and keeps going', async () => {
  let failures = 0;
  const errors: unknown[] = [];
  const server = fakeServer([[messageUpdate('/ping')]]);
  const inner = server.fetch;
  const flaky = (async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).endsWith('getUpdates') && failures < 2) {
      failures++;
      throw new TypeError('fetch failed');
    }
    return inner(input, init);
  }) as typeof fetch;
  const bot = createBot({
    key: KEY,
    logger: false,
    polling: { minBackoffMs: 100, maxBackoffMs: 100 },
    request: { fetch: flaky, retries: 0 },
  });
  bot.onError((error) => void errors.push(error));
  bot.onCommand('ping', (ctx) => ctx.reply('pong'));
  const running = bot.start();
  await until(() => server.sent.length === 1, 3000);
  assert.equal(errors.length, 2);
  await bot.stop();
  await running;
});

test('ctx.ask waits for the answer of the same person, even with one worker', async () => {
  const sent: string[] = [];
  const server = fakeServer(
    [[messageUpdate('/hello', { chat: { id: 'g1', type: 'group' } })], [messageUpdate('Ana', { chat: { id: 'g1', type: 'group' } })]],
    () => server.sent.length > 0 || server.polls <= 1,
  );
  const bot = createBot({ key: KEY, logger: false, polling: { concurrency: 1 }, request: { fetch: server.fetch } });
  bot.onCommand('hello', async (ctx) => {
    const answer = await ctx.ask('Your name?', { timeoutMs: 3000 });
    sent.push(answer ? answer.text : 'nobody');
    await ctx.reply(`Hi ${answer?.text}`, { quote: false });
  });
  const running = bot.start();
  try {
    await until(() => server.sent.length === 2, 3000);
    assert.deepEqual(sent, ['Ana']);
    assert.equal(server.sent[1]?.params['text'], 'Hi Ana');
  } finally {
    await bot.stop();
    await running;
  }
});

test('ask returns null when nobody answers; waitNext honours a filter', async () => {
  const { bot } = makeBot();
  const results: Array<string | null> = [];
  bot.onCommand('q', async (ctx) => {
    const answer = await ctx.ask('?', { timeoutMs: 30 });
    results.push(answer ? answer.text : null);
  });
  await bot.handle(messageUpdate('/q'));
  assert.deepEqual(results, [null]);

  const filtered: string[] = [];
  bot.onCommand('n', async (ctx) => {
    const answer = await ctx.waitNext({ timeoutMs: 1000, filter: (c) => /^\d+$/.test(c.text) });
    filtered.push(answer?.text ?? 'none');
  });
  const pending = bot.handle(messageUpdate('/n'));
  await sleep(10);
  await bot.handle(messageUpdate('abc'));
  await bot.handle(messageUpdate('42'));
  await pending;
  assert.deepEqual(filtered, ['42']);
});

test('different chats run side by side, the same chat stays in order', async () => {
  const log: string[] = [];
  const server = fakeServer([
    [
      messageUpdate('/slow', { chat: { id: 'A' } }),
      messageUpdate('/fast', { chat: { id: 'A' } }),
      messageUpdate('/fast', { chat: { id: 'B' } }),
    ],
  ]);
  const bot = createBot({ key: KEY, logger: false, request: { fetch: server.fetch } });
  bot.onCommand('slow', async (ctx) => {
    await sleep(80);
    log.push(`slow-${ctx.chatId}`);
  });
  bot.onCommand('fast', (ctx) => void log.push(`fast-${ctx.chatId}`));
  const running = bot.start();
  await until(() => log.length === 3);
  assert.deepEqual(log, ['fast-B', 'slow-A', 'fast-A']);
  await bot.stop();
  await running;
});

test('stop() waits for handlers that are still running', async () => {
  const server = fakeServer([[messageUpdate('/work')]]);
  const bot = createBot({ key: KEY, logger: false, request: { fetch: server.fetch } });
  let finished = false;
  bot.onCommand('work', async () => {
    await sleep(100);
    finished = true;
  });
  const running = bot.start();
  await until(() => server.polls >= 2);
  await bot.stop();
  await running;
  assert.equal(finished, true);
});

test('every() repeats while running and stops with the bot', async () => {
  const server = fakeServer([]);
  const bot = createBot({ key: KEY, logger: false, request: { fetch: server.fetch } });
  let ticks = 0;
  bot.every(20, () => void ticks++, { immediate: true });
  const running = bot.start();
  await until(() => ticks >= 3);
  await bot.stop();
  await running;
  const after = ticks;
  await sleep(80);
  assert.equal(ticks, after);
});

test('broadcast reports who got it and who failed, without repeating chats', async () => {
  const seen: unknown[] = [];
  const bot = createBot({
    key: KEY,
    logger: false,
    request: {
      fetch: (async (_url: string, init: RequestInit) => {
        const { chatId } = JSON.parse(String(init.body)) as { chatId: string };
        seen.push(chatId);
        return chatId === 'bad' ? fail('NO_CHAT', 'nope', 404) : ok({});
      }) as unknown as typeof fetch,
    },
  });
  const report = await bot.broadcast(['a', 'bad', 'a', 'b'], 'hello', { delayMs: 0 });
  assert.deepEqual(report.sent, ['a', 'b']);
  assert.equal(report.failed.length, 1);
  assert.equal(report.failed[0]?.chat, 'bad');
  assert.deepEqual(seen, ['a', 'bad', 'b']);
});

test('loadModules mounts routers, functions and register objects from a folder', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'orbitx-mods-'));
  const routerFile = new URL('../src/index.js', import.meta.url).href;
  writeFileSync(
    join(dir, 'a-router.mjs'),
    `import { Router } from '${routerFile}';\nexport default new Router().onCommand('a', (ctx) => ctx.state.seen = (ctx.state.seen ?? '') + 'a');\n`,
  );
  writeFileSync(join(dir, 'b-fn.mjs'), `export default (bot) => bot.onCommand('b', (ctx) => ctx.state.seen = 'b');\n`);
  writeFileSync(join(dir, 'c-obj.mjs'), `export default { register(bot) { bot.onCommand('c', (ctx) => ctx.state.seen = 'c'); } };\n`);
  writeFileSync(join(dir, '_ignored.mjs'), `throw new Error('must not load');\n`);
  const { bot } = makeBot();
  const loaded = await bot.loadModules(dir);
  assert.deepEqual(
    loaded.map((f) => f.split('/').pop()),
    ['a-router.mjs', 'b-fn.mjs', 'c-obj.mjs'],
  );
  const seen: unknown[] = [];
  bot.use(async (ctx, next) => {
    await next();
    seen.push(ctx.state['seen']);
  });
  for (const command of ['/a', '/b', '/c']) await bot.handle(messageUpdate(command));
  assert.deepEqual(seen, ['a', 'b', 'c']);

  writeFileSync(join(dir, 'd-bad.mjs'), `export default 42;\n`);
  await assert.rejects(makeBot().bot.loadModules(dir), (e: unknown) => e instanceof ConfigError && e.code === 'MODULE_INVALID');
  await assert.rejects(makeBot().bot.loadModules(join(dir, 'missing')), ConfigError);
});

test('a 520 page while polling is a short warning by default, with a hint, and recovery is logged', async () => {
  const lines: string[] = [];
  const logger = {
    debug() {},
    info: (m: string) => void lines.push(`info ${m}`),
    warn: (m: string) => void lines.push(`warn ${m}`),
    error: (m: string) => void lines.push(`error ${m}`),
  };
  let polls = 0;
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const method = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).pathname.split('/').pop();
    if (method === 'getMe') return ok({ id: 'bot-1' });
    polls++;
    if (polls <= 2) return new Response('<html>error code: 520</html>', { status: 520 });
    if (polls === 3) return ok([]);
    return new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))));
  }) as typeof fetch;
  const bot = createBot({ key: KEY, logger, request: { fetch: fetchImpl }, polling: { minBackoffMs: 100 } });
  const running = bot.start();
  await until(() => lines.some((l) => l.includes('connection restored')), 3000);
  await bot.stop();
  await running;
  assert.equal(lines.filter((l) => l.startsWith('warn') && l.includes('HTTP 520')).length, 1);
  assert.ok(lines.some((l) => l.includes('retries by itself')));
  assert.ok(!lines.some((l) => l.startsWith('error')));
});
