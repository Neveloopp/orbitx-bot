# Migrar de 1.2.0 a 2.0.0

El protocolo de red (URL, nombres de métodos, parámetros enviados al servidor) **no cambia**, así que un bot 2.0 habla con la misma API. Lo que cambió es la superficie de la librería.

## Crear el bot

```ts
// 1.2.0
import { OrbitxBot } from 'orbitx-bot';
const bot = new OrbitxBot(process.env.ORBITX_BOT_KEY, { pollSeconds: 50, owners: ['@yo'] });

// 2.0.0
import { createBot } from 'orbitx-bot';
const bot = createBot({ key: process.env.ORBITX_BOT_KEY!, polling: { timeoutSeconds: 50 }, owners: ['@yo'] });
```

`pollSeconds` → `polling.timeoutSeconds`. `baseUrl`, `prefixes` y `owners` conservan su nombre. Usa `createBotFromEnv()` para leer `ORBITX_BOT_KEY`.

## Manejadores

| 1.2.0 | 2.0.0 |
| --- | --- |
| `bot.command(names, fn)` | `bot.onCommand(names, fn, { description? })` |
| `bot.hears(pattern, fn)` | `bot.onText(pattern, fn)` |
| `bot.action(data, fn)` | `bot.onButton(data, fn)` |
| `bot.on(type, fn)` | `bot.on(type, fn)` (también acepta una lista) |
| `bot.use(mw)` | `bot.use(mw)` (igual; en un `Router` tiene alcance propio) |
| `bot.catch(fn)` | `bot.onError(fn)` |
| `bot.start()` | `bot.start({ handleSignals? })` |
| `bot.stop()` | `await bot.stop()` (ahora espera a los manejadores en curso) |
| `bot.handle(update)` | `bot.handle(update)` |

## Constructores de interfaz

| 1.2.0 | 2.0.0 |
| --- | --- |
| `OrbitxBot.button(text, value, extra)` | `button(text, value, extra)` |
| `OrbitxBot.menu(button, sections, extra)` | `menu(label, sections, extra)` |
| `OrbitxBot.section(title, options)` | `section(title, options)` |
| `OrbitxBot.option(title, data, extra)` | `option(title, data, extra)` |
| — | `link`, `copy`, `Keyboard`, `chunk`, `paginate` |

## Métodos de la API

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

Los atajos de `ctx` (`ctx.reply`, `ctx.edit`, `ctx.kick`…) conservan su nombre.

## Errores

`OrbitxBotError` → `OrbitxError` y sus subclases (ver [errores](./errores.md)).

| Código en 1.2.0 | 2.0.0 |
| --- | --- |
| `BOT_KEY_MISSING` | `KEY_MISSING` o `KEY_MALFORMED` (`ConfigError`) |
| `BOT_FILE_INVALID` | `FILE_INVALID` (`FileError`) |
| `BOT_DOWNLOAD_FAILED` | `DOWNLOAD_FAILED` (`FileError`) |
| `HTTP_<status>` | `HTTP_<status>` (`ApiError`) o `BAD_RESPONSE` (`BadResponseError`) |
| códigos del servidor | sin cambios, en `error.code` de un `ApiError` |

## Cambios de comportamiento

- **Concurrencia**: las actualizaciones de un chat se siguen atendiendo en orden, pero chats distintos corren a la vez (`polling.concurrency`, por defecto 8). Ponlo en `1` para el comportamiento anterior, una a la vez.
- **Timeouts**: toda petición tiene límite (`request.timeoutMs`, 30 s; el long poll tiene el suyo). 1.2.0 no tenía ninguno.
- **Reintentos**: las lecturas y el `429` se reintentan; las escrituras no se reintentan tras errores de red o `5xx`.
- **Alcance del middleware**: `router.use()` solo corre cuando ese router responde. `bot.use()` funciona como antes.
- **Expresiones regulares** en `onText`/`onButton` se evalúan sin las banderas `g`/`y`, así que las coincidencias repetidas ya no se alternan.
- **`ctx.args`** es de solo lectura.
- **`ctx.mentionsMe`** ya no falla cuando un mensaje no trae lista `mentions`.
- **`baseUrl`** debe ser `https` (o `http` en localhost).
- **Archivos**: un texto que empieza con `http://` o `https://` ahora se descarga; cualquier otro texto es una ruta.
- **Empaquetado**: solo ESM, compilado a `dist/`, con tipos incluidos. Node.js 18 o superior.
