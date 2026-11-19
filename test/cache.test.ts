import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoConcurrency, createBudget } from '../src/cache/memory.js';
import { ReadLayer, DEFAULT_TTL_MS, stableKey } from '../src/cache/reads.js';
import { ByteCache } from '../src/cache/store.js';
import { messageUpdate } from '../src/testing.js';
import { makeBot, sleep } from './helpers.js';

const MIB = 1024 * 1024;

test('ByteCache: evicts the least recently used when over budget', () => {
  const cache = new ByteCache(() => 100);
  cache.set('a', 1, 40, 10_000);
  cache.set('b', 2, 40, 10_000);
  cache.get('a');
  cache.set('c', 3, 40, 10_000);
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.stats().evictions, 1);
});

test('ByteCache: refuses entries bigger than half the budget and expires by TTL', async () => {
  const cache = new ByteCache(() => 100);
  assert.equal(cache.set('big', 1, 51, 1000), false);
  cache.set('short', 1, 10, 20);
  await sleep(40);
  assert.equal(cache.get('short'), undefined);
  assert.equal(cache.stats().bytes, 0);
});

test('ByteCache: invalidates by tag', () => {
  const cache = new ByteCache(() => 1000);
  cache.set('x', 1, 10, 1000, ['chat:1']);
  cache.set('y', 2, 10, 1000, ['chat:2']);
  assert.equal(cache.invalidate('chat:1'), 1);
  assert.equal(cache.get('x'), undefined);
  assert.equal(cache.get('y'), 2);
});

test('budget follows the free memory inside its limits', () => {
  let free = 1000 * MIB;
  const budget = createBudget({ fraction: 0.2, minBytes: 8 * MIB, maxBytes: 100 * MIB }, () => free);
  assert.equal(budget(), 100 * MIB);
  const small = createBudget({ fraction: 0.2, minBytes: 8 * MIB, maxBytes: 100 * MIB }, () => 10 * MIB);
  assert.equal(small(), 8 * MIB);
  const mid = createBudget({ fraction: 0.5, minBytes: 1, maxBytes: 100 * MIB }, () => (free = 60 * MIB));
  assert.equal(mid(), 30 * MIB);
  const broken = createBudget({ fraction: 0.2, minBytes: 8 * MIB, maxBytes: 100 * MIB }, () => {
    throw new Error('probe failed');
  });
  assert.equal(broken(), 8 * MIB);
});

test('autoConcurrency stays between 8 and 64', () => {
  assert.equal(autoConcurrency(() => 0), 8);
  const high = autoConcurrency(() => 100 * 1024 * MIB);
  assert.ok(high >= 8 && high <= 64);
});

test('stableKey ignores the order of the keys', () => {
  assert.equal(stableKey('m', { a: 1, b: { c: 2, d: 3 } }), stableKey('m', { b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(stableKey('m', { a: 1 }), stableKey('m', { a: 2 }));
});

function layer(): ReadLayer {
  return new ReadLayer(new ByteCache(() => 10 * MIB), true, DEFAULT_TTL_MS);
}

test('ReadLayer: ten equal reads at once make one request', async () => {
  const reads = layer();
  let calls = 0;
  const load = async (): Promise<{ n: number }> => {
    calls++;
    await sleep(10);
    return { n: calls };
  };
  const all = await Promise.all(Array.from({ length: 10 }, () => reads.json('chat', 'k', [], load)));
  assert.equal(calls, 1);
  assert.equal(reads.stats().coalesced, 9);
  assert.ok(all.every((value) => value.n === 1));
  await reads.json('chat', 'k', [], load);
  assert.equal(calls, 1);
  assert.equal(reads.stats().hits, 1);
});

test('ReadLayer: callers cannot change what is cached', async () => {
  const reads = layer();
  const first = await reads.json('chat', 'k', [], async () => ({ list: [1] }));
  first.list.push(2);
  const second = await reads.json('chat', 'k', [], async () => ({ list: [] as number[] }));
  assert.deepEqual(second.list, [1]);
  const bytes = await reads.bytes('file', 'b', [], async () => Buffer.from('abc'));
  bytes[0] = 0;
  assert.equal((await reads.bytes('file', 'b', [], async () => Buffer.from('zzz'))).toString(), 'abc');
});

test('ReadLayer: a write during a read keeps the stale answer out of the cache', async () => {
  const reads = layer();
  let version = 1;
  const slow = reads.json('chat', 'k', ['chat:1'], async () => {
    const seen = version;
    await sleep(20);
    return seen;
  });
  version = 2;
  reads.invalidate('chat:1');
  assert.equal(await slow, 1);
  assert.equal(await reads.json('chat', 'k', ['chat:1'], async () => version), 2);
});

test('ReadLayer: errors are not cached and ttl 0 or disabled skip the cache', async () => {
  const reads = layer();
  await assert.rejects(reads.json('chat', 'k', [], async () => Promise.reject(new Error('boom'))));
  assert.equal(await reads.json('chat', 'k', [], async () => 'fine'), 'fine');
  let calls = 0;
  const off = new ReadLayer(new ByteCache(() => MIB), false, DEFAULT_TTL_MS);
  await off.json('chat', 'k', [], async () => ++calls);
  await off.json('chat', 'k', [], async () => ++calls);
  assert.equal(calls, 2);
  const zero = new ReadLayer(new ByteCache(() => MIB), true, { ...DEFAULT_TTL_MS, chat: 0 });
  await zero.json('chat', 'k', [], async () => ++calls);
  await zero.json('chat', 'k', [], async () => ++calls);
  assert.equal(calls, 4);
});

test('api: repeated reads hit the cache and writes drop it', async () => {
  const { bot, calls } = makeBot({ getChat: (p) => ({ id: p['chatId'], name: 'x' }), setChatInfo: () => ({}) });
  await bot.api.chats.get('c1');
  await bot.api.chats.get('c1');
  await Promise.all([bot.api.chats.get('c1'), bot.api.chats.get('c1')]);
  assert.equal(calls.filter((c) => c.method === 'getChat').length, 1);
  await bot.api.chats.info('c1', { name: 'new' });
  await bot.api.chats.get('c1');
  assert.equal(calls.filter((c) => c.method === 'getChat').length, 2);
  assert.equal(bot.api.cache.hits >= 3, true);
});

test('api: cache:false always asks the API', async () => {
  const { bot, calls } = makeBot({}, { cache: false });
  await bot.api.account.me();
  await bot.api.account.me();
  assert.equal(calls.filter((c) => c.method === 'getMe').length, 2);
  assert.equal(bot.api.cache.enabled, false);
});

test('api: members and chats are cached per chat; group events invalidate them', async () => {
  const { bot, calls } = makeBot({ getChatMembers: () => [{ id: 'u1' }] });
  await bot.api.members.list('g1');
  await bot.api.members.list('g1');
  await bot.api.members.list('g2');
  assert.equal(calls.filter((c) => c.method === 'getChatMembers').length, 2);
  const joined = messageUpdate('', { chat: { id: 'g1' } });
  if (joined.message) joined.message.event = { type: 'member_added' } as never;
  await bot.handle(joined);
  await bot.api.members.list('g1');
  assert.equal(calls.filter((c) => c.method === 'getChatMembers').length, 3);
});

test('api: call() is never cached and the join requests are not either', async () => {
  const { bot, calls } = makeBot({ getJoinRequests: () => [] });
  await bot.api.chats.joinRequests('g1');
  await bot.api.chats.joinRequests('g1');
  await bot.api.call('getMe');
  await bot.api.call('getMe');
  assert.equal(calls.filter((c) => c.method === 'getJoinRequests').length, 2);
  assert.equal(calls.filter((c) => c.method === 'getMe').length, 2);
});

test('api: invalidate() clears everything or only some tags', async () => {
  const { bot, calls } = makeBot({ getChat: () => ({}) });
  await bot.api.chats.get('a');
  await bot.api.chats.get('b');
  bot.api.invalidate('chat:a');
  await bot.api.chats.get('a');
  await bot.api.chats.get('b');
  assert.equal(calls.filter((c) => c.method === 'getChat').length, 3);
  bot.api.invalidate();
  await bot.api.chats.get('b');
  assert.equal(calls.filter((c) => c.method === 'getChat').length, 4);
});

test('transport: warm opens that many connections and idleMs ignores the long poll', async () => {
  const { bot, calls } = makeBot();
  assert.equal(await bot.api.warm(3), 3);
  assert.equal(calls.filter((c) => c.method === 'getMe').length, 3);
  await sleep(30);
  assert.ok(bot.api.transport.idleMs() >= 25);
  await bot.api.transport.call('getUpdates', {});
  assert.ok(bot.api.transport.idleMs() >= 25);
  await bot.api.transport.call('sendMessage', {});
  assert.ok(bot.api.transport.idleMs() < 25);
});

test('config: cache options are validated', async () => {
  const { resolveConfig } = await import('../src/config.js');
  const key = `oxb_${'a'.repeat(10)}_${'B'.repeat(40)}`;
  assert.throws(() => resolveConfig({ key, cache: { fraction: 2 } }), /cache.fraction/);
  assert.throws(() => resolveConfig({ key, cache: { ttlMs: { nope: 1 } as never } }), /not a cache kind/);
  assert.equal(resolveConfig({ key, cache: { ttlMs: { chat: 1 } } }).cache.ttlMs.chat, 1);
  assert.equal(resolveConfig({ key, cache: false }).cache.enabled, false);
  const auto = resolveConfig({ key, polling: { concurrency: 'auto' } }).polling.concurrency;
  assert.ok(auto >= 8 && auto <= 64);
});
