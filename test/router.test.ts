import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Router, StateError, guard, helpText, restrict } from '../src/index.js';
import { callbackUpdate, joinRequestUpdate, messageUpdate } from '../src/testing.js';
import { makeBot } from './helpers.js';

test('commands match any prefix, any case, and with aliases', async () => {
  const { bot } = makeBot();
  const seen: string[] = [];
  bot.onCommand(['ping', 'p'], (ctx) => void seen.push(`${ctx.command}:${ctx.argText}`));
  for (const text of ['/ping', '.PING a b', '!p x', '#Ping']) await bot.handle(messageUpdate(text));
  await bot.handle(messageUpdate('ping'));
  await bot.handle(messageUpdate('/pong'));
  assert.deepEqual(seen, ['ping:', 'ping:a b', 'p:x', 'ping:']);
});

test('custom prefixes: the longest wins, and an empty prefix means no prefix', async () => {
  const { bot } = makeBot({}, { prefixes: ['!', '!!', ''] });
  const seen: string[] = [];
  bot.onCommand('hi', (ctx) => void seen.push(ctx.command ?? ''));
  await bot.handle(messageUpdate('!!hi'));
  await bot.handle(messageUpdate('hi there'));
  assert.deepEqual(seen, ['hi', 'hi']);
});

test('command suffix @bot is ignored', async () => {
  const { bot } = makeBot();
  let hit = false;
  bot.onCommand('start', () => void (hit = true));
  await bot.handle(messageUpdate('/start@testbot'));
  assert.equal(hit, true);
});

test('onText: exact words ignore case, RegExp keeps its groups and is not stateful', async () => {
  const { bot } = makeBot();
  const seen: string[] = [];
  bot.onText('Hola', () => void seen.push('exact'));
  bot.onText(/^id (\d+)$/g, (ctx) => void seen.push(`id:${ctx.match?.[1]}`));
  await bot.handle(messageUpdate('  hola '));
  await bot.handle(messageUpdate('id 12'));
  await bot.handle(messageUpdate('id 34'));
  assert.deepEqual(seen, ['exact', 'id:12', 'id:34']);
});

test('onButton matches text or RegExp', async () => {
  const { bot } = makeBot();
  const seen: string[] = [];
  bot.onButton('music', () => void seen.push('music'));
  bot.onButton(/^page:(\d+)$/, (ctx) => void seen.push(`page${ctx.match?.[1]}`));
  await bot.handle(callbackUpdate('music'));
  await bot.handle(callbackUpdate('page:3'));
  await bot.handle(callbackUpdate('other'));
  assert.deepEqual(seen, ['music', 'page3']);
});

test('first matching handler wins; middlewares run before it', async () => {
  const { bot } = makeBot();
  const order: string[] = [];
  bot.use(async (_ctx, next) => {
    order.push('mw-in');
    await next();
    order.push('mw-out');
  });
  bot.onCommand('x', () => void order.push('first'));
  bot.onCommand('x', () => void order.push('second'));
  await bot.handle(messageUpdate('/x'));
  assert.deepEqual(order, ['mw-in', 'first', 'mw-out']);
});

test('a middleware that skips next() stops the update', async () => {
  const { bot } = makeBot();
  let hit = false;
  bot.use(() => undefined);
  bot.onCommand('x', () => void (hit = true));
  await bot.handle(messageUpdate('/x'));
  assert.equal(hit, false);
});

test('calling next() twice is reported', async () => {
  const { bot } = makeBot();
  const errors: unknown[] = [];
  bot.onError((error) => void errors.push(error));
  bot.use(async (_ctx, next) => {
    await next();
    await next();
  });
  bot.onCommand('x', () => undefined);
  await bot.handle(messageUpdate('/x'));
  assert.ok(errors[0] instanceof StateError);
  assert.equal((errors[0] as StateError).code, 'NEXT_CALLED_TWICE');
});

test('mounted routers answer only their own handlers and have their own guards', async () => {
  const { bot } = makeBot();
  const seen: string[] = [];
  const admin = new Router().use(guard('admin', { onDeny: () => void seen.push('denied') }));
  admin.onCommand('ban', () => void seen.push('ban'));
  const fun = new Router().onCommand('joke', () => void seen.push('joke'));
  bot.mount(admin, fun);
  bot.onCommand('fallback', () => void seen.push('fallback'));

  await bot.handle(messageUpdate('/joke'));
  await bot.handle(messageUpdate('/ban', { chat: { type: 'group' } }));
  await bot.handle(messageUpdate('/ban', { chat: { type: 'group' }, from: { role: 'admin' } }));
  await bot.handle(messageUpdate('/fallback'));
  assert.deepEqual(seen, ['joke', 'denied', 'ban', 'fallback']);
});

test('restrict wraps a single handler; owners come from the config', async () => {
  const { bot } = makeBot({}, { owners: ['@boss'] });
  const seen: string[] = [];
  bot.onCommand('secret', restrict('owner', () => void seen.push('ok')));
  await bot.handle(messageUpdate('/secret', { from: { id: 'u2', handle: 'someone' } }));
  await bot.handle(messageUpdate('/secret', { from: { id: 'u1', handle: 'Boss' } }));
  assert.deepEqual(seen, ['ok']);
});

test('on(): join, leave, event, photo kinds, deleted and join requests', async () => {
  const { bot, calls } = makeBot();
  const seen: string[] = [];
  bot.on('join', () => void seen.push('join'));
  bot.on('leave', () => void seen.push('leave'));
  bot.on('photo', () => void seen.push('photo'));
  bot.on('message', () => void seen.push('message'));
  bot.on('join_request', async (ctx) => {
    seen.push('request');
    await ctx.approve();
  });
  bot.on('deleted', () => void seen.push('deleted'));

  const join = messageUpdate('', { chat: { type: 'group' } });
  join.message = { ...join.message!, event: { type: 'member_joined' }, kind: 'event' };
  const left = messageUpdate('', { chat: { type: 'group' } });
  left.message = { ...left.message!, event: { type: 'member_left' }, kind: 'event' };

  await bot.handle(join);
  await bot.handle(left);
  await bot.handle(messageUpdate('', { kind: 'photo' }));
  await bot.handle(messageUpdate('plain'));
  await bot.handle(joinRequestUpdate({ from: { id: 'u9' } }));
  await bot.handle({
    updateId: 99,
    type: 'deleted',
    deleted: { chat: { id: 'c', type: 'group', name: null }, seq: 1, by: null },
  });
  assert.deepEqual(seen, ['join', 'leave', 'photo', 'message', 'request', 'deleted']);
  assert.deepEqual(calls.find((c) => c.method === 'decideJoinRequest')?.params, {
    chatId: 'chat-1',
    userId: 'u9',
    approve: true,
  });
});

test('the bot ignores its own messages', async () => {
  const { bot } = makeBot();
  bot.me = { id: 'bot-1' };
  let hit = false;
  bot.on('message', () => void (hit = true));
  await bot.handle(messageUpdate('/x', { from: { id: 'bot-1' } }));
  assert.equal(hit, false);
});

test('errors thrown by handlers go to onError with the context', async () => {
  const { bot } = makeBot();
  const seen: Array<[unknown, string | undefined]> = [];
  bot.onError((error, ctx) => void seen.push([error, ctx?.command ?? undefined]));
  bot.onCommand('boom', () => {
    throw new Error('kaput');
  });
  await bot.handle(messageUpdate('/boom'));
  assert.equal((seen[0]?.[0] as Error).message, 'kaput');
  assert.equal(seen[0]?.[1], 'boom');
});

test('commands() lists documented commands, including mounted routers; helpText formats them', () => {
  const { bot } = makeBot();
  const extra = new Router().onCommand(['play', 'p'], () => undefined, { description: 'Play a song' });
  bot.onCommand('start', () => undefined, { description: 'Say hello' });
  bot.onCommand('hidden', () => undefined, { description: 'x', hidden: true });
  bot.mount(extra);
  assert.deepEqual(
    bot.commands().map((c) => c.names[0]),
    ['start', 'hidden', 'play'],
  );
  assert.equal(helpText(bot, { title: 'Commands' }), 'Commands\n\n/start — Say hello\n/play — Play a song');
});

test('context: quoting, args, mentions, owners and state errors', async () => {
  const { bot, calls } = makeBot({}, { owners: ['42'] });
  bot.me = { id: 'bot-1' };
  await bot.handle(messageUpdate('/x'));
  bot.onCommand('x', async (ctx) => {
    await ctx.reply('r');
    assert.equal(ctx.isOwner, true);
    assert.equal(ctx.mentionsMe, false);
  });
  await bot.handle(messageUpdate('/x', { from: { id: 42 } }));
  await bot.handle(messageUpdate('/x', { from: { id: 42 }, chat: { type: 'group' } }));
  const sends = calls.filter((c) => c.method === 'sendMessage');
  assert.equal(sends[0]?.params['replyTo'], undefined);
  assert.equal(typeof sends[1]?.params['replyTo'], 'number');

  const errors: unknown[] = [];
  bot.onError((e) => void errors.push(e));
  bot.on('join_request', (ctx) => ctx.react('👍'));
  await bot.handle(joinRequestUpdate());
  assert.ok(errors[0] instanceof StateError);
  assert.equal((errors[0] as StateError).code, 'NO_MESSAGE');
});
