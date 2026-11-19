# orbitx-bot

[Español](https://unpkg.com/orbitx-bot@2.1.1/README.es.md) · English

TypeScript library to program bots for the **ORBITX SOCIAL** chat (ORBITX SPACE). Zero runtime dependencies, Node.js 18+.

```ts
import { createBotFromEnv, button, Keyboard } from 'orbitx-bot';

const bot = createBotFromEnv({ owners: ['@me'] });

bot.onCommand('menu', (ctx) =>
  ctx.reply('Hello', { buttons: new Keyboard().row(button('Music', 'music')) }),
  { description: 'Open the menu' },
);

bot.onButton('music', (ctx) => ctx.reply('Write /play and the name of a song'));

await bot.start({ handleSignals: true });
```

## Install

```bash
npm install orbitx-bot
```

Get the bot key (`oxb_…`) from «Bot ORBITX» in ORBITX SPACE and keep it out of your code:

```bash
ORBITX_BOT_KEY=oxb_xxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## What you get

- **Creation**: `createBot(key | options)` and `createBotFromEnv()`, with validated options and a key that never shows up in errors or logs.
- **Handlers in modules**: `Router` groups of handlers, mounted on the bot or on each other, loaded from a folder with `bot.loadModules('./dist/handlers')`.
- **Scoped middleware**: `bot.use()` for every update, `router.use()` only when that router answers.
- **Ready-made middleware**: `guard` / `restrict` (owner, admin, group, private), `throttle`, `session` (memory or JSON file), `trace`.
- **Conversations**: `await ctx.ask('Your name?')` waits for the next message of that person.
- **Grouped API**: `bot.api.messages`, `media`, `chats`, `members`, `account`, fully typed.
- **Clear errors**: `ApiError`, `AuthError`, `NetworkError`, `RequestTimeoutError`, `FileError`… each one explains itself in English and Spanish with `error.explain('es')`.
- **Robust transport**: timeouts, cancellation, retries only where they are safe, backoff on the long poll.
- **Fast and memory-aware**: keep-alive connections opened ahead of time, a read cache with request merging, and a cache budget that follows the free memory (container limits included).
- **Concurrent processing**: updates of one chat stay in order, different chats run side by side.
- **Utilities**: `Keyboard`, `menu`, `paginate`, `splitText`, `ctx.replyLong`, `bot.broadcast`, `bot.every`, `helpHandler`, graceful shutdown.
- **Testing**: `orbitx-bot/testing` with fake updates and a fake `fetch`.

## Project layout

```text
src/
  index.ts         public exports
  create.ts        createBot, createBotFromEnv
  config.ts        option validation and defaults
  protocol.ts      the only place that knows the wire names (URL, methods, update kinds)
  errors.ts        error classes and bilingual hints
  logger.ts        branded console logger
  http/            transport (retries, timeouts), keep-alive fetch and file inputs
  cache/           memory budget, byte cache and read layer
  api/             messages, media, chats, members, account
  core/            bot, router, context, scheduler, poller, waiters, loader
  middleware/      guard, throttle, session, trace
  handlers/        ready-made handlers (help)
  ui/              buttons, menus, keyboards, pagination
```

## Documentation

| Topic | English | Español |
| --- | --- | --- |
| Guide | [docs/en/guide.md](https://unpkg.com/orbitx-bot@2.1.1/docs/en/guide.md) | [docs/es/guia.md](https://unpkg.com/orbitx-bot@2.1.1/docs/es/guia.md) |
| API reference | [docs/en/api.md](https://unpkg.com/orbitx-bot@2.1.1/docs/en/api.md) | [docs/es/api.md](https://unpkg.com/orbitx-bot@2.1.1/docs/es/api.md) |
| Errors | [docs/en/errors.md](https://unpkg.com/orbitx-bot@2.1.1/docs/en/errors.md) | [docs/es/errores.md](https://unpkg.com/orbitx-bot@2.1.1/docs/es/errores.md) |
| Migrating from 1.2.0 | [docs/en/migration.md](https://unpkg.com/orbitx-bot@2.1.1/docs/en/migration.md) | [docs/es/migracion.md](https://unpkg.com/orbitx-bot@2.1.1/docs/es/migracion.md) |

Platform documentation: https://ctrl.orbitxspace.com/bots?tab=docs
