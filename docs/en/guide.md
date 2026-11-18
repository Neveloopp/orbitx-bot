# Guide

## 1. Create a bot

```ts
import { createBot, createBotFromEnv } from 'orbitx-bot';

const bot = createBot(process.env.ORBITX_BOT_KEY!);

const same = createBotFromEnv();

const custom = createBot({
  key: process.env.ORBITX_BOT_KEY!,
  owners: ['@me'],
  prefixes: ['/', '!'],
  language: 'en',
  logger: 'info',
  polling: { timeoutSeconds: 50, concurrency: 8 },
  request: { timeoutMs: 30_000, retries: 2 },
});
```

| Option | Default | Meaning |
| --- | --- | --- |
| `key` | — | Bot key (`oxb_…`). Required. |
| `baseUrl` | `https://ctrl.orbitxspace.com` | Server. Must be `https` (`http` only on localhost). |
| `prefixes` | `['/', '.', '!', '#']` | What starts a command. `['']` means no prefix. |
| `owners` | `[]` | `@handles` or ids your code treats as owners (`ctx.isOwner`). |
| `language` | `'en'` | Language of the hints in logs (`'en'` or `'es'`). |
| `logger` | `'info'` | A level, `false`, or your own `{ debug, info, warn, error }`. |
| `polling.timeoutSeconds` | `50` | Long poll length. |
| `polling.concurrency` | `8` | Chats handled at the same time. `1` = one update at a time. |
| `polling.minBackoffMs` / `maxBackoffMs` | `1000` / `30000` | Wait after a failed poll, doubling up to the maximum. |
| `polling.graceMs` | `10000` | How long `stop()` waits for running handlers. |
| `request.timeoutMs` | `30000` | Time limit of every request. |
| `request.retries` | `2` | Retries for read calls and for `429`. Writes are never retried after a network error or `5xx`. |
| `request.maxFileBytes` | none | Refuse bigger files before uploading. |
| `request.headers` | `{}` | Extra headers (the key header cannot be replaced). |
| `request.fetch` | global `fetch` | Your own `fetch` (proxy, tests). |

Invalid options throw a `ConfigError` right away, and the key is never printed.

## 2. Handlers

```ts
bot.onCommand(['ping', 'p'], (ctx) => ctx.reply('pong'), { description: 'Check the bot' });
bot.onText('hello', (ctx) => ctx.reply('Hi!'));
bot.onText(/^id (\d+)$/, (ctx) => ctx.reply(`Id ${ctx.match?.[1]}`));
bot.onButton('music', (ctx) => ctx.edit('Pick a song'));
bot.onButton(/^page:(\d+)$/, (ctx) => ctx.edit(`Page ${ctx.match?.[1]}`));
bot.on('join', (ctx) => ctx.reply('Welcome!'));
bot.on('photo', (ctx) => ctx.react('👍'));
bot.on('join_request', (ctx) => ctx.approve());
```

- The **first handler that matches** answers; the rest are skipped.
- Commands ignore case and the `@bot` suffix: `/Play@mybot hello` → `ctx.command === 'play'`, `ctx.argText === 'hello'`.
- Kinds for `on()`: `message`, `callback`, `join`, `leave`, `event`, `deleted`, `join_request`, or the kind of a message (`photo`, `video`…).
- Regular expressions are never stateful: the `g` flag is ignored.

## 3. Routers and modules

Split the bot by topic. A router is a group of handlers.

`src/handlers/music.ts`

```ts
import { Router, button, Keyboard } from 'orbitx-bot';

const music = new Router();

music.onCommand('play', async (ctx) => {
  const name = ctx.argText || (await ctx.ask('Which song?'))?.text;
  if (!name) return;
  await ctx.reply(`Playing ${name}`, { buttons: new Keyboard().row(button('Stop', 'stop')) });
}, { description: 'Play a song' });

music.onButton('stop', (ctx) => ctx.edit('Stopped'));

export default music;
```

`src/handlers/admin.ts`

```ts
import { Router, guard } from 'orbitx-bot';

const admin = new Router().use(guard('staff', { onDeny: (ctx) => ctx.reply('Admins only') }));

admin.onCommand('close', (ctx) => ctx.closeGroup());

export default admin;
```

Mount them by hand or load a whole folder:

```ts
import music from './handlers/music.js';

bot.mount(music);
await bot.loadModules(new URL('./handlers', import.meta.url).pathname);
```

`loadModules` imports every `.js`/`.mjs`/`.cjs` file of the folder in alphabetical order (skipping names that start with `.` or `_`). A module may export by default a `Router`, a function `(bot) => void`, or `{ register(bot) }`. Point it at the **compiled** folder.

Middleware scope: `bot.use()` runs for every update, `router.use()` only when one of that router's handlers takes the update. A guard in a router never blocks other routers.

## 4. Middleware

```ts
import { guard, restrict, throttle, session, trace } from 'orbitx-bot';

bot.use(trace());
bot.use(throttle({ limit: 5, windowMs: 10_000, onLimit: (ctx) => ctx.reply('Slow down') }));
bot.use(session());

bot.onCommand('count', (ctx) => {
  ctx.session['n'] = Number(ctx.session['n'] ?? 0) + 1;
  return ctx.reply(`You wrote ${ctx.session['n']} commands`);
});

bot.onCommand('shutdown', restrict('owner', () => bot.stop()));
```

Write your own: `(ctx, next) => { … await next(); … }`. Skip `next()` to stop the update. Calling it twice throws `StateError('NEXT_CALLED_TWICE')`. Use `ctx.state` to pass data between middlewares and handlers.

Guard rules: `owner`, `admin`, `staff` (admin or owner), `group`, `private`. Several rules must all hold.

Sessions are kept per member (`scope: 'member'`), per `'user'` or per `'chat'`. Memory is the default; for data that survives restarts:

```ts
import { JsonFileStore, session } from 'orbitx-bot';

const store = await JsonFileStore.open('./data/sessions.json', { ttlMs: 7 * 24 * 3600_000 });
bot.use(session({ store }));
bot.onStop(() => store.close());
```

Add typed keys with declaration merging:

```ts
declare module 'orbitx-bot' {
  interface SessionData {
    n?: number;
  }
}
```

## 5. Conversations

```ts
bot.onCommand('register', async (ctx) => {
  const name = await ctx.ask('Your name?', { timeoutMs: 30_000 });
  if (!name) return ctx.reply('Too slow, try again');
  const age = await ctx.ask('Your age?', { filter: (c) => /^\d+$/.test(c.text) });
  await ctx.reply(`Saved ${name.text}, ${age?.text ?? '?'}`);
});
```

`ask` sends the question and returns the next message of **the same person in the same chat** as a new `Context`, or `null` on timeout (60 s by default). While it waits, the chat is not blocked and the worker is freed. `filter` decides which messages count as an answer; others are handled normally.

## 6. Buttons and menus

```ts
import { Keyboard, button, link, copy, menu, section, option, paginate } from 'orbitx-bot';

await ctx.reply('Choose', {
  buttons: new Keyboard()
    .row(button('Yes', 'yes', { style: 'primary' }), button('No', 'no', { style: 'danger' }))
    .row(link('Website', 'https://example.com'), copy('Copy code', 'ABC-123')),
});

await ctx.reply('Download', {
  menu: menu('📥 Menu', [section('🎵 Audio', [option('MP3', 'mp3', { tag: 'MP3' })])], { title: 'Quality' }),
});

const page = paginate(songs, 2, 5);
const rows = Keyboard.grid(page.items.map((s) => button(s.name, `song:${s.id}`)), 1)
  .row(...(page.hasPrev ? [button('◀', `page:${page.page - 1}`)] : []), ...(page.hasNext ? [button('▶', `page:${page.page + 1}`)] : []));
```

## 7. Files

Everywhere a file is expected you can pass a `Buffer`/`Uint8Array`, a path, an `http(s)` URL, `{ url }` or `{ data, name }`.

```ts
await ctx.replyPhoto('./cover.png', { caption: 'Cover' });
await ctx.replyDocument('https://example.com/report.pdf');
const bytes = await ctx.download();
const quoted = await ctx.downloadQuoted(0, { format: 'png' });
await ctx.replySticker(bytes, { shape: 'circle' });
```

Only pass URLs you trust: the library downloads them from your server. Use `request.maxFileBytes` to cap sizes.

## 8. Running and stopping

```ts
bot.onStart((b) => b.logger.info('ready'));
bot.onStop(() => db.close());
bot.every(60_000, (b) => b.logger.debug('heartbeat'));

bot.onError((error, ctx) => {
  if (error instanceof OrbitxError) bot.logger.warn(error.explain('en'));
});

await bot.start({ handleSignals: true });
```

- `start()` resolves after `stop()`. It rejects if the key is refused (`AuthError`).
- `stop()` aborts the long poll, waits up to `polling.graceMs` for running handlers, then runs the `onStop` hooks.
- `handleSignals: true` stops cleanly on `SIGINT` and `SIGTERM`, which is what a Pterodactyl «Stop» sends.
- Network errors while polling are reported to `onError` and retried with growing waits.

## 9. Useful extras

```ts
bot.onCommand('help', helpHandler(bot, { title: 'Commands' }));

await ctx.replyLong(veryLongText, { size: 4000 });

const report = await bot.broadcast(chatIds, 'Maintenance at 22:00', { delayMs: 150 });
```

`helpHandler` lists the commands registered with a `description`. `splitText` and `replyLong` cut on line or word breaks; the size is yours to set, check the limit of the platform. `broadcast` sends one by one and returns `{ sent, failed }`.

## 10. Testing

```ts
import { createBot } from 'orbitx-bot';
import { fakeFetch, messageUpdate } from 'orbitx-bot/testing';

const { fetch, calls } = fakeFetch();
const bot = createBot({ key: KEY, logger: false, request: { fetch } });
bot.onCommand('ping', (ctx) => ctx.reply('pong'));

await bot.handle(messageUpdate('/ping'));
// calls[0] → { method: 'sendMessage', params: { chatId: 'chat-1', text: 'pong' } }
```
