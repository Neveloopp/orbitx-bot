import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import {
  JsonFileStore,
  Keyboard,
  MemoryStore,
  button,
  chunk,
  copy,
  link,
  menu,
  option,
  paginate,
  section,
  session,
  splitText,
  throttle,
  trace,
} from '../src/index.js';
import { messageUpdate } from '../src/testing.js';
import { makeBot, sleep } from './helpers.js';

test('session keeps data between updates of the same member only', async () => {
  const { bot } = makeBot();
  bot.use(session());
  const seen: Array<[string, number]> = [];
  bot.onCommand('count', (ctx) => {
    ctx.session['n'] = Number(ctx.session['n'] ?? 0) + 1;
    seen.push([String(ctx.from?.id), ctx.session['n'] as number]);
  });
  await bot.handle(messageUpdate('/count', { from: { id: 'a' } }));
  await bot.handle(messageUpdate('/count', { from: { id: 'a' } }));
  await bot.handle(messageUpdate('/count', { from: { id: 'b' } }));
  assert.deepEqual(seen, [['a', 1], ['a', 2], ['b', 1]]);
});

test('session saves even when the handler throws', async () => {
  const { bot } = makeBot();
  bot.use(session());
  bot.onError(() => undefined);
  let last = 0;
  bot.onCommand('x', (ctx) => {
    ctx.session['n'] = Number(ctx.session['n'] ?? 0) + 1;
    last = ctx.session['n'] as number;
    throw new Error('after write');
  });
  await bot.handle(messageUpdate('/x'));
  await bot.handle(messageUpdate('/x'));
  assert.equal(last, 2);
});

test('MemoryStore expires entries and caps its size', async () => {
  const store = new MemoryStore({ ttlMs: 20, maxEntries: 2 });
  store.set('a', { v: 1 });
  store.set('b', { v: 2 });
  store.set('c', { v: 3 });
  assert.equal(store.get('a'), undefined);
  assert.deepEqual(store.get('c'), { v: 3 });
  await sleep(40);
  assert.equal(store.get('c'), undefined);
});

test('JsonFileStore survives a restart and ignores expired data', async () => {
  const path = join(mkdtempSync(join(tmpdir(), 'orbitx-store-')), 'nested', 'sessions.json');
  const first = await JsonFileStore.open(path);
  first.set('k', { name: 'Ana' });
  await first.close();
  assert.match(readFileSync(path, 'utf8'), /Ana/);
  const second = await JsonFileStore.open(path);
  assert.deepEqual(second.get('k'), { name: 'Ana' });

  const ttlPath = join(dirname(path), 'ttl.json');
  const short = await JsonFileStore.open(ttlPath, { ttlMs: 10 });
  short.set('x', { a: 1 });
  await short.close();
  await sleep(30);
  assert.equal((await JsonFileStore.open(ttlPath, { ttlMs: 10 })).get('x'), undefined);
});

test('throttle lets `limit` updates through per window and warns once', async () => {
  const { bot } = makeBot();
  const warned: number[] = [];
  let handled = 0;
  bot.use(throttle({ limit: 2, windowMs: 60, onLimit: (_ctx, info) => void warned.push(info.retryAfterMs) }));
  bot.onCommand('x', () => void handled++);
  for (let i = 0; i < 5; i++) await bot.handle(messageUpdate('/x', { from: { id: 'a' } }));
  await bot.handle(messageUpdate('/x', { from: { id: 'b' } }));
  assert.equal(handled, 3);
  assert.equal(warned.length, 1);
  await sleep(80);
  await bot.handle(messageUpdate('/x', { from: { id: 'a' } }));
  assert.equal(handled, 4);
});

test('trace logs a line per update at debug level', async () => {
  const lines: string[] = [];
  const logger = { debug: (m: string) => void lines.push(m), info() {}, warn() {}, error() {} };
  const { bot } = makeBot({}, { logger });
  bot.use(trace());
  bot.onCommand('x', () => undefined);
  await bot.handle(messageUpdate('/x'));
  assert.match(lines[0] ?? '', /^\/x · @tester · \d+ ms$/);
});

test('splitText respects the size and prefers line breaks', () => {
  const text = `${'a'.repeat(30)}\n${'b'.repeat(30)}\n${'c'.repeat(30)}`;
  const parts = splitText(text, 40);
  assert.deepEqual(parts, ['a'.repeat(30), 'b'.repeat(30), 'c'.repeat(30)]);
  assert.ok(splitText('x'.repeat(100), 30).every((p) => p.length <= 30));
  assert.equal(splitText('x'.repeat(100), 30).join(''), 'x'.repeat(100));
  assert.deepEqual(splitText('short', 4000), ['short']);
  assert.deepEqual(splitText('', 10), ['']);
});

test('keyboard helpers build the shapes the API expects', () => {
  assert.deepEqual(button('A', 'a'), { text: 'A', data: 'a' });
  assert.deepEqual(button('A', 'a', { style: 'primary' }), { text: 'A', data: 'a', style: 'primary' });
  assert.deepEqual(link('Web', 'https://x.y'), { text: 'Web', url: 'https://x.y' });
  assert.deepEqual(copy('Code', '1234'), { text: 'Code', copy: '1234' });
  assert.deepEqual(menu('Open', [section('Audio', [option('MP3', 'mp3', { tag: 'MP3' })])], { title: 'Pick' }), {
    button: 'Open',
    title: 'Pick',
    sections: [{ title: 'Audio', options: [{ data: 'mp3', title: 'MP3', tag: 'MP3' }] }],
  });
  assert.deepEqual(section(undefined, []), { options: [] });
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  const keyboard = Keyboard.grid([button('1', '1'), button('2', '2'), button('3', '3')], 2).row(link('x', 'https://x.y'));
  assert.equal(keyboard.rows.length, 3);
  keyboard.rows[0]?.pop();
  assert.equal(keyboard.rows[0]?.length, 2);
});

test('paginate clamps pages and reports neighbours', () => {
  const items = Array.from({ length: 11 }, (_, i) => i);
  assert.deepEqual(paginate(items, 1, 5), { items: [0, 1, 2, 3, 4], page: 1, pages: 3, hasPrev: false, hasNext: true });
  assert.deepEqual(paginate(items, 99, 5), { items: [10], page: 3, pages: 3, hasPrev: true, hasNext: false });
  assert.deepEqual(paginate([], 1, 5), { items: [], page: 1, pages: 1, hasPrev: false, hasNext: false });
});
