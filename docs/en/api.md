# API reference

Everything below is exported from `orbitx-bot`, except the test helpers (`orbitx-bot/testing`).

## Creation

| | |
| --- | --- |
| `createBot(key \| options)` | Returns a `Bot`. Throws `ConfigError` on invalid options. |
| `createBotFromEnv({ variable?, ...options })` | Reads the key from `ORBITX_BOT_KEY` (or `variable`). |
| `resolveConfig(options)` | The validation used by both, if you need it. |

## `Bot` (extends `Router`)

| Member | Description |
| --- | --- |
| `api` | The grouped API (below). |
| `me` | The bot account, filled by `start()`. |
| `config`, `logger`, `running` | Resolved options, logger, state. |
| `start({ handleSignals?, signals? })` | Listens until `stop()`. Rejects with `AuthError` if the key is refused. |
| `stop()` | Aborts the long poll, waits for handlers, runs `onStop`. |
| `handle(update)` | Runs one update through middleware and handlers (tests, custom transports). |
| `onError((error, ctx?) => …)` | Replaces the default error handler (which logs). |
| `onStart(hook)` / `onStop(hook)` | Lifecycle hooks, `(bot) => …`. |
| `every(ms, task, { immediate? })` | Repeats a task while the bot runs; errors go to `onError`. |
| `loadModules(dir, { recursive?, extensions? })` | Imports and mounts every module of a folder. Returns the loaded files. |
| `broadcast(chats, text, { delayMs?, ...sendOptions })` | Sequential send; returns `{ sent, failed }`. |
| `waitFor(ctx, { timeoutMs?, filter? })` | What `ctx.waitNext` uses. |

## `Router`

| Method | Description |
| --- | --- |
| `onCommand(names, handler, { description?, hidden? })` | `/name`, `.name`, `!name`, `#name` (any prefix in `prefixes`). |
| `onText(pattern, handler)` | Exact words (any case) or `RegExp`. Groups in `ctx.match`. |
| `onButton(pattern, handler)` | Button or menu option by its data (text or `RegExp`). |
| `on(kinds, handler)` | `message`, `callback`, `join`, `leave`, `event`, `deleted`, `join_request` or a message kind. |
| `use(...middlewares)` | Scoped middleware (see the guide). |
| `mount(...routers)` | Adds routers after the handlers registered so far. |
| `commands()` | `{ names, description, hidden }[]`, including mounted routers. |
| `middleware()` | The router as a middleware. |

## `Context`

Properties: `bot`, `update`, `type`, `message`, `callback`, `data`, `deleted`, `joinRequest`, `chat`, `from`, `event`, `text`, `command`, `args`, `argText`, `match`, `state`, `session`, `chatId`, `isGroup`, `isPrivate`, `isAdmin`, `isOwner`, `mentionsMe`.

| Method | Description |
| --- | --- |
| `is(kind)` | Whether the update is of that kind. |
| `reply(text, options)` | Answers in the chat; in groups it quotes the message (`{ quote: false }` to avoid). |
| `replyLong(text, { size? })` | Splits a long text into several messages. |
| `replyCode`, `replyPhoto`, `replyVideo`, `replyAudio`, `replyVoice`, `replyDocument`, `replySticker`, `replyPoll`, `replyLocation` | Shortcuts to `bot.api`. |
| `react(emoji)`, `delete()`, `edit(text, options)` | On the message of the update. |
| `download(index?, options?)`, `downloadQuoted(index?, options?)` | File of the message, or of the message it answers (`null` if none). |
| `approve()`, `decline()` | On `join_request` updates. |
| `closeGroup()`, `openGroup()`, `kick(id)`, `promote(id)`, `demote(id)`, `mute(id, minutes?)`, `unmute(id)`, `inviteLink()` | Group administration. |
| `ask(text, options)` | Sends a question and waits for the answer (`Context` or `null`). |
| `waitNext({ timeoutMs?, filter? })` | Waits for the next message of the same person in this chat. |

Methods that need a message (`react`, `delete`, `edit`, `download`) throw `StateError('NO_MESSAGE')` on updates without one; `approve`/`decline` throw `StateError('NO_JOIN_REQUEST')` outside join requests.

## `bot.api`

Every method returns a promise and accepts a type argument for the result: `api.messages.send<MyType>(…)`. The shape of results comes from the server.

| Group | Methods |
| --- | --- |
| `messages` | `send(chat, text, opts)`, `sendCode(chat, code, lang, opts)`, `sendLocation(chat, lat, lng)`, `sendPoll(chat, question, options, extra)`, `edit(chat, seq, text, opts)`, `remove(chat, seq, forEveryone?)`, `react(chat, seq, emoji)`, `pin(chat, seq)` |
| `media` | `photo`, `video`, `audio`, `voice`, `document`, `sticker` — `(chat, file, opts)`; `download(chat, seq, index?, opts?)`; `userPhoto({ userId } \| { handle }, opts?)` |
| `chats` | `list()`, `get(chat)`, `settings(chat, s)`, `info(chat, i)`, `photo(chat, file)`, `close(chat)`, `open(chat)`, `inviteLink(chat)`, `resetInviteLink(chat)`, `leave(chat)`, `joinRequests(chat)`, `decideJoin(chat, user, approve)` |
| `members` | `list(chat, query?)`, `remove(chat, user)`, `setRole(chat, user, role)`, `mute(chat, user, minutes)`, `unmute(chat, user)` |
| `account` | `me()`, `setCommands(commands)`, `setProfile({ name?, description? })`, `setPhoto(file)`, `user({ userId } \| { handle })` |
| — | `call(method, params)` for any method not wrapped yet; `transport` for signals and per-call options. |

Options are forwarded to the server as you give them (`replyTo`, `buttons`, `menu`, `caption`, `shape`…); a `Keyboard` in `buttons` is converted to rows first.

## Interface helpers

`button(text, value, { style? })`, `link(text, url)`, `copy(text, value)`, `Keyboard` (`row`, `grid`, `rows`), `menu(label, sections, { title? })`, `section(title, options)`, `option(title, data, { description?, tag? })`, `chunk(items, size)`, `paginate(items, page, perPage)`, `splitText(text, size?)`.

## Middleware

| | |
| --- | --- |
| `guard(rules, { onDeny? })` | Middleware. Rules: `owner`, `admin`, `staff`, `group`, `private`. |
| `restrict(rules, handler, { onDeny? })` | Wraps one handler. |
| `throttle({ limit?, windowMs?, key?, skip?, onLimit? })` | Fixed window per person (5 per 10 s by default); `onLimit` runs once per window. |
| `session({ store?, scope?, key?, initial? })` | Sets `ctx.session`; saved even if the handler throws. |
| `MemoryStore({ ttlMs?, maxEntries? })`, `JsonFileStore.open(path, { flushMs?, ttlMs?, maxEntries? })` | Session stores. `JsonFileStore` writes atomically with mode `0600`; call `close()` on stop. |
| `trace()` | One debug line per update with its duration. |
| `helpHandler(router, { title?, prefix?, empty? })`, `helpText(router, options)` | Command list from the registered descriptions. |
| `compose(middlewares)` | Chains middlewares yourself. |

## Logger

`createLogger(level)` prints `◉ ORBITX  12:03:44  info   message`. Colors turn off with `NO_COLOR` or when the output is not a terminal (`FORCE_COLOR` forces them). Pass your own object with `debug`, `info`, `warn`, `error` to use another logger, or `logger: false` to silence it.

## Testing (`orbitx-bot/testing`)

`messageUpdate(text, { chat?, from?, kind?, seq? })`, `callbackUpdate(data, origin?)`, `joinRequestUpdate(origin?)`, `fakeFetch(routes?)` → `{ fetch, calls }`.
