# Migrating from 1.2.0 to 2.0.0

The wire protocol (URL, method names, parameters sent to the server) is **unchanged**, so a 2.0 bot talks to the same API. What changed is the library surface.

## Creating the bot

```ts
// 1.2.0
import { OrbitxBot } from 'orbitx-bot';
const bot = new OrbitxBot(process.env.ORBITX_BOT_KEY, { pollSeconds: 50, owners: ['@me'] });

// 2.0.0
import { createBot } from 'orbitx-bot';
const bot = createBot({ key: process.env.ORBITX_BOT_KEY!, polling: { timeoutSeconds: 50 }, owners: ['@me'] });
```

`pollSeconds` → `polling.timeoutSeconds`. `baseUrl`, `prefixes` and `owners` keep their names. Use `createBotFromEnv()` to read `ORBITX_BOT_KEY`.

## Handlers

| 1.2.0 | 2.0.0 |
| --- | --- |
| `bot.command(names, fn)` | `bot.onCommand(names, fn, { description? })` |
| `bot.hears(pattern, fn)` | `bot.onText(pattern, fn)` |
| `bot.action(data, fn)` | `bot.onButton(data, fn)` |
| `bot.on(type, fn)` | `bot.on(type, fn)` (also accepts a list) |
| `bot.use(mw)` | `bot.use(mw)` (same; on a `Router` it is scoped) |
| `bot.catch(fn)` | `bot.onError(fn)` |
| `bot.start()` | `bot.start({ handleSignals? })` |
| `bot.stop()` | `await bot.stop()` (now waits for running handlers) |
| `bot.handle(update)` | `bot.handle(update)` |

## Interface builders

| 1.2.0 | 2.0.0 |
| --- | --- |
| `OrbitxBot.button(text, value, extra)` | `button(text, value, extra)` |
| `OrbitxBot.menu(button, sections, extra)` | `menu(label, sections, extra)` |
| `OrbitxBot.section(title, options)` | `section(title, options)` |
| `OrbitxBot.option(title, data, extra)` | `option(title, data, extra)` |
| — | `link`, `copy`, `Keyboard`, `chunk`, `paginate` |

## API methods

| 1.2.0 | 2.0.0 |
| --- | --- |
| `call(method, params)` | `api.call(method, params)` |
| `getMe()` | `api.account.me()` |
| `setCommands(list)` | `api.account.setCommands(list)` |
| `setMyProfile(p)` / `setMyPhoto(f)` | `api.account.setProfile(p)` / `api.account.setPhoto(f)` |
| `getUser(who)` | `api.account.user(who)` |
| `getChats()` / `getChat(id)` | `api.chats.list()` / `api.chats.get(id)` |
| `getChatMembers(id, o)` | `api.members.list(id, o)` |
| `sendMessage(id, text, o)` | `api.messages.send(id, text, o)` |
| `sendCode(id, code, lang, o)` | `api.messages.sendCode(id, code, lang, o)` |
| `sendLocation(id, lat, lng)` | `api.messages.sendLocation(id, lat, lng)` |
| `sendPoll(id, q, options, extra)` | `api.messages.sendPoll(id, q, options, extra)` |
| `editMessage(id, seq, text, o)` | `api.messages.edit(id, seq, text, o)` |
| `deleteMessage(id, seq, all)` | `api.messages.remove(id, seq, all)` |
| `react(id, seq, emoji)` / `pinMessage(id, seq)` | `api.messages.react(…)` / `api.messages.pin(…)` |
| `sendPhoto` / `sendVideo` / `sendAudio` / `sendVoice` / `sendDocument` / `sendSticker` | `api.media.photo` / `video` / `audio` / `voice` / `document` / `sticker` |
| `download(id, seq, i, o)` / `getUserPhoto(who, o)` | `api.media.download(…)` / `api.media.userPhoto(who, o)` |
| `setChatSettings` / `setChatInfo` / `setChatPhoto` | `api.chats.settings` / `info` / `photo` |
| `closeGroup` / `openGroup` | `api.chats.close` / `open` |
| `getInviteLink` / `resetInviteLink` / `leaveChat` | `api.chats.inviteLink` / `resetInviteLink` / `leave` |
| `getJoinRequests` / `decideJoinRequest` | `api.chats.joinRequests` / `decideJoin` |
| `removeMember` / `setMemberRole` | `api.members.remove` / `setRole` |
| `muteMember(id, user, minutes)` | `api.members.mute(id, user, minutes)`, `api.members.unmute(id, user)` |

The `ctx` shortcuts (`ctx.reply`, `ctx.edit`, `ctx.kick`…) keep their names.

## Errors

`OrbitxBotError` → `OrbitxError` and its subclasses (see [errors](./errors.md)).

| 1.2.0 code | 2.0.0 |
| --- | --- |
| `BOT_KEY_MISSING` | `KEY_MISSING` or `KEY_MALFORMED` (`ConfigError`) |
| `BOT_FILE_INVALID` | `FILE_INVALID` (`FileError`) |
| `BOT_DOWNLOAD_FAILED` | `DOWNLOAD_FAILED` (`FileError`) |
| `HTTP_<status>` | `HTTP_<status>` (`ApiError`) or `BAD_RESPONSE` (`BadResponseError`) |
| server codes | unchanged, in `error.code` of an `ApiError` |

## Behaviour changes

- **Concurrency**: updates of one chat are still handled in order, but different chats run at the same time (`polling.concurrency`, default 8). Set it to `1` for the old one-at-a-time behaviour.
- **Timeouts**: every request has a limit (`request.timeoutMs`, 30 s; the long poll gets its own). 1.2.0 had none.
- **Retries**: read calls and `429` are retried; writes are not retried after network errors or `5xx`.
- **Middleware scope**: `router.use()` only runs when that router answers. `bot.use()` works as before.
- **Regular expressions** in `onText`/`onButton` are matched without `g`/`y` flags, so repeated matches no longer alternate.
- **`ctx.args`** is read-only.
- **`ctx.mentionsMe`** no longer throws when a message has no `mentions` list.
- **`baseUrl`** must be `https` (or `http` on localhost).
- **Files**: a string starting with `http://` or `https://` is now downloaded; any other string is a path.
- **Packaging**: ESM only, compiled to `dist/`, with types included. Node.js 18 or newer.
