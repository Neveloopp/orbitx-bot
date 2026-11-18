# Referencia de la API

Todo lo siguiente se exporta desde `orbitx-bot`, salvo los ayudantes de pruebas (`orbitx-bot/testing`).

## Creación

| | |
| --- | --- |
| `createBot(clave \| opciones)` | Devuelve un `Bot`. Lanza `ConfigError` con opciones inválidas. |
| `createBotFromEnv({ variable?, ...opciones })` | Lee la clave de `ORBITX_BOT_KEY` (o de `variable`). |
| `resolveConfig(opciones)` | La validación que usan ambos, por si la necesitas. |

## `Bot` (extiende `Router`)

| Miembro | Descripción |
| --- | --- |
| `api` | La API agrupada (abajo). |
| `me` | La cuenta del bot, la llena `start()`. |
| `config`, `logger`, `running` | Opciones resueltas, logger, estado. |
| `start({ handleSignals?, signals? })` | Escucha hasta `stop()`. Se rechaza con `AuthError` si la clave es rechazada. |
| `stop()` | Cancela el long poll, espera a los manejadores y corre `onStop`. |
| `handle(update)` | Pasa una actualización por middlewares y manejadores (pruebas, transportes propios). |
| `onError((error, ctx?) => …)` | Reemplaza el manejador de errores por defecto (que registra en el log). |
| `onStart(hook)` / `onStop(hook)` | Hooks del ciclo de vida, `(bot) => …`. |
| `every(ms, tarea, { immediate? })` | Repite una tarea mientras el bot corre; los errores van a `onError`. |
| `loadModules(dir, { recursive?, extensions? })` | Importa y monta cada módulo de una carpeta. Devuelve los archivos cargados. |
| `broadcast(chats, text, { delayMs?, ...opcionesDeEnvío })` | Envío secuencial; devuelve `{ sent, failed }`. |
| `waitFor(ctx, { timeoutMs?, filter? })` | Lo que usa `ctx.waitNext`. |

## `Router`

| Método | Descripción |
| --- | --- |
| `onCommand(names, handler, { description?, hidden? })` | `/name`, `.name`, `!name`, `#name` (cualquier prefijo de `prefixes`). |
| `onText(pattern, handler)` | Palabras exactas (sin importar mayúsculas) o `RegExp`. Grupos en `ctx.match`. |
| `onButton(pattern, handler)` | Botón u opción de menú por su data (texto o `RegExp`). |
| `on(kinds, handler)` | `message`, `callback`, `join`, `leave`, `event`, `deleted`, `join_request` o un tipo de mensaje. |
| `use(...middlewares)` | Middleware con alcance (ver la guía). |
| `mount(...routers)` | Agrega routers después de los manejadores registrados hasta ese momento. |
| `commands()` | `{ names, description, hidden }[]`, incluidos los routers montados. |
| `middleware()` | El router como middleware. |

## `Context`

Propiedades: `bot`, `update`, `type`, `message`, `callback`, `data`, `deleted`, `joinRequest`, `chat`, `from`, `event`, `text`, `command`, `args`, `argText`, `match`, `state`, `session`, `chatId`, `isGroup`, `isPrivate`, `isAdmin`, `isOwner`, `mentionsMe`.

| Método | Descripción |
| --- | --- |
| `is(kind)` | Si la actualización es de ese tipo. |
| `reply(text, options)` | Responde en el chat; en grupos cita el mensaje (`{ quote: false }` para evitarlo). |
| `replyLong(text, { size? })` | Divide un texto largo en varios mensajes. |
| `replyCode`, `replyPhoto`, `replyVideo`, `replyAudio`, `replyVoice`, `replyDocument`, `replySticker`, `replyPoll`, `replyLocation` | Atajos a `bot.api`. |
| `react(emoji)`, `delete()`, `edit(text, options)` | Sobre el mensaje de la actualización. |
| `download(index?, options?)`, `downloadQuoted(index?, options?)` | Archivo del mensaje, o del mensaje al que responde (`null` si no hay). |
| `approve()`, `decline()` | En actualizaciones `join_request`. |
| `closeGroup()`, `openGroup()`, `kick(id)`, `promote(id)`, `demote(id)`, `mute(id, minutes?)`, `unmute(id)`, `inviteLink()` | Administración del grupo. |
| `ask(text, options)` | Envía una pregunta y espera la respuesta (`Context` o `null`). |
| `waitNext({ timeoutMs?, filter? })` | Espera el siguiente mensaje de la misma persona en este chat. |

Los métodos que necesitan un mensaje (`react`, `delete`, `edit`, `download`) lanzan `StateError('NO_MESSAGE')` en actualizaciones sin mensaje; `approve`/`decline` lanzan `StateError('NO_JOIN_REQUEST')` fuera de solicitudes de ingreso.

## `bot.api`

Cada método devuelve una promesa y acepta un argumento de tipo para el resultado: `api.messages.send<MiTipo>(…)`. La forma de los resultados la define el servidor.

| Grupo | Métodos |
| --- | --- |
| `messages` | `send(chat, text, opts)`, `sendCode(chat, code, lang, opts)`, `sendLocation(chat, lat, lng)`, `sendPoll(chat, question, options, extra)`, `edit(chat, seq, text, opts)`, `remove(chat, seq, forEveryone?)`, `react(chat, seq, emoji)`, `pin(chat, seq)` |
| `media` | `photo`, `video`, `audio`, `voice`, `document`, `sticker` — `(chat, file, opts)`; `download(chat, seq, index?, opts?)`; `userPhoto({ userId } \| { handle }, opts?)` |
| `chats` | `list()`, `get(chat)`, `settings(chat, s)`, `info(chat, i)`, `photo(chat, file)`, `close(chat)`, `open(chat)`, `inviteLink(chat)`, `resetInviteLink(chat)`, `leave(chat)`, `joinRequests(chat)`, `decideJoin(chat, user, approve)` |
| `members` | `list(chat, query?)`, `remove(chat, user)`, `setRole(chat, user, role)`, `mute(chat, user, minutes)`, `unmute(chat, user)` |
| `account` | `me()`, `setCommands(commands)`, `setProfile({ name?, description? })`, `setPhoto(file)`, `user({ userId } \| { handle })` |
| — | `call(method, params)` para cualquier método aún no envuelto; `transport` para señales y opciones por llamada. |

Las opciones se envían al servidor tal como las das (`replyTo`, `buttons`, `menu`, `caption`, `shape`…); un `Keyboard` en `buttons` se convierte antes en filas.

## Ayudantes de interfaz

`button(text, value, { style? })`, `link(text, url)`, `copy(text, value)`, `Keyboard` (`row`, `grid`, `rows`), `menu(label, sections, { title? })`, `section(title, options)`, `option(title, data, { description?, tag? })`, `chunk(items, size)`, `paginate(items, page, perPage)`, `splitText(text, size?)`.

## Middleware

| | |
| --- | --- |
| `guard(reglas, { onDeny? })` | Middleware. Reglas: `owner`, `admin`, `staff`, `group`, `private`. |
| `restrict(reglas, handler, { onDeny? })` | Envuelve un solo manejador. |
| `throttle({ limit?, windowMs?, key?, skip?, onLimit? })` | Ventana fija por persona (5 cada 10 s por defecto); `onLimit` corre una vez por ventana. |
| `session({ store?, scope?, key?, initial? })` | Define `ctx.session`; se guarda aunque el manejador falle. |
| `MemoryStore({ ttlMs?, maxEntries? })`, `JsonFileStore.open(path, { flushMs?, ttlMs?, maxEntries? })` | Almacenes de sesión. `JsonFileStore` escribe de forma atómica con modo `0600`; llama a `close()` al detener. |
| `trace()` | Una línea de debug por actualización con su duración. |
| `helpHandler(router, { title?, prefix?, empty? })`, `helpText(router, options)` | Lista de comandos a partir de las descripciones registradas. |
| `compose(middlewares)` | Encadena middlewares por tu cuenta. |

## Logger

`createLogger(level)` imprime `◉ ORBITX  12:03:44  info   mensaje`. Los colores se apagan con `NO_COLOR` o cuando la salida no es una terminal (`FORCE_COLOR` los fuerza). Pasa tu propio objeto con `debug`, `info`, `warn`, `error` para usar otro logger, o `logger: false` para silenciarlo.

## Pruebas (`orbitx-bot/testing`)

`messageUpdate(text, { chat?, from?, kind?, seq? })`, `callbackUpdate(data, origin?)`, `joinRequestUpdate(origin?)`, `fakeFetch(routes?)` → `{ fetch, calls }`.
