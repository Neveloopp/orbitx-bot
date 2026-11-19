# Guía

## 1. Crear un bot

```ts
import { createBot, createBotFromEnv } from 'orbitx-bot';

const bot = createBot(process.env.ORBITX_BOT_KEY!);

const igual = createBotFromEnv();

const personalizado = createBot({
  key: process.env.ORBITX_BOT_KEY!,
  owners: ['@yo'],
  prefixes: ['/', '!'],
  language: 'es',
  logger: 'info',
  polling: { timeoutSeconds: 50, concurrency: 8 },
  request: { timeoutMs: 30_000, retries: 2 },
});
```

| Opción | Por defecto | Significado |
| --- | --- | --- |
| `key` | — | Clave del bot (`oxb_…`). Obligatoria. |
| `baseUrl` | `https://ctrl.orbitxspace.com` | Servidor. Debe ser `https` (`http` solo en localhost). |
| `prefixes` | `['/', '.', '!', '#']` | Lo que inicia un comando. `['']` significa sin prefijo. |
| `owners` | `[]` | `@handles` o ids que tu código trata como dueños (`ctx.isOwner`). |
| `language` | `'en'` | Idioma de las pistas en los logs (`'en'` o `'es'`). |
| `logger` | `'info'` | Un nivel, `false`, o tu propio `{ debug, info, warn, error }`. |
| `polling.timeoutSeconds` | `50` | Duración del long poll. |
| `polling.concurrency` | `8` | Chats atendidos a la vez. `1` = una actualización a la vez. |
| `polling.minBackoffMs` / `maxBackoffMs` | `1000` / `30000` | Espera tras un poll fallido, se duplica hasta el máximo. |
| `polling.graceMs` | `10000` | Cuánto espera `stop()` a los manejadores en curso. |
| `request.timeoutMs` | `30000` | Límite de tiempo de cada petición. |
| `request.retries` | `2` | Reintentos para lecturas y para `429`. Las escrituras nunca se reintentan tras un error de red o `5xx`. |
| `request.maxFileBytes` | ninguno | Rechaza archivos más grandes antes de subirlos. |
| `request.headers` | `{}` | Encabezados extra (el de la clave no se puede reemplazar). |
| `request.fetch` | `fetch` global | Tu propio `fetch` (proxy, pruebas). |

Las opciones inválidas lanzan un `ConfigError` de inmediato, y la clave nunca se imprime.

## 2. Manejadores

```ts
bot.onCommand(['ping', 'p'], (ctx) => ctx.reply('pong'), { description: 'Prueba el bot' });
bot.onText('hola', (ctx) => ctx.reply('¡Hola!'));
bot.onText(/^id (\d+)$/, (ctx) => ctx.reply(`Id ${ctx.match?.[1]}`));
bot.onButton('music', (ctx) => ctx.edit('Elige una canción'));
bot.onButton(/^page:(\d+)$/, (ctx) => ctx.edit(`Página ${ctx.match?.[1]}`));
bot.on('join', (ctx) => ctx.reply('¡Bienvenido!'));
bot.on('photo', (ctx) => ctx.react('👍'));
bot.on('join_request', (ctx) => ctx.approve());
```

- Responde el **primer manejador que coincide**; los demás se omiten.
- Los comandos ignoran mayúsculas y el sufijo `@bot`: `/Play@mibot hola` → `ctx.command === 'play'`, `ctx.argText === 'hola'`.
- Tipos para `on()`: `message`, `callback`, `join`, `leave`, `event`, `deleted`, `join_request`, o el tipo de un mensaje (`photo`, `video`…).
- Las expresiones regulares nunca guardan estado: la bandera `g` se ignora.

## 3. Routers y módulos

Divide el bot por temas. Un router es un grupo de manejadores.

`src/handlers/music.ts`

```ts
import { Router, button, Keyboard } from 'orbitx-bot';

const music = new Router();

music.onCommand('play', async (ctx) => {
  const name = ctx.argText || (await ctx.ask('¿Qué canción?'))?.text;
  if (!name) return;
  await ctx.reply(`Reproduciendo ${name}`, { buttons: new Keyboard().row(button('Parar', 'stop')) });
}, { description: 'Reproduce una canción' });

music.onButton('stop', (ctx) => ctx.edit('Detenido'));

export default music;
```

`src/handlers/admin.ts`

```ts
import { Router, guard } from 'orbitx-bot';

const admin = new Router().use(guard('staff', { onDeny: (ctx) => ctx.reply('Solo admins') }));

admin.onCommand('close', (ctx) => ctx.closeGroup());

export default admin;
```

Móntalos a mano o carga una carpeta entera:

```ts
import music from './handlers/music.js';

bot.mount(music);
await bot.loadModules(new URL('./handlers', import.meta.url).pathname);
```

`loadModules` importa cada archivo `.js`/`.mjs`/`.cjs` de la carpeta en orden alfabético (omite nombres que empiezan con `.` o `_`). Un módulo puede exportar por defecto un `Router`, una función `(bot) => void` o `{ register(bot) }`. Apúntalo a la carpeta **compilada**.

Alcance del middleware: `bot.use()` corre en toda actualización, `router.use()` solo cuando un manejador de ese router toma la actualización. Un guard dentro de un router nunca bloquea a otros routers.

## 4. Middleware

```ts
import { guard, restrict, throttle, session, trace } from 'orbitx-bot';

bot.use(trace());
bot.use(throttle({ limit: 5, windowMs: 10_000, onLimit: (ctx) => ctx.reply('Más despacio') }));
bot.use(session());

bot.onCommand('count', (ctx) => {
  ctx.session['n'] = Number(ctx.session['n'] ?? 0) + 1;
  return ctx.reply(`Has escrito ${ctx.session['n']} comandos`);
});

bot.onCommand('shutdown', restrict('owner', () => bot.stop()));
```

Escribe el tuyo: `(ctx, next) => { … await next(); … }`. Omite `next()` para detener la actualización. Llamarlo dos veces lanza `StateError('NEXT_CALLED_TWICE')`. Usa `ctx.state` para pasar datos entre middlewares y manejadores.

Reglas de guard: `owner`, `admin`, `staff` (admin o dueño), `group`, `private`. Si pones varias, deben cumplirse todas.

Las sesiones se guardan por miembro (`scope: 'member'`), por `'user'` o por `'chat'`. Por defecto van en memoria; para datos que sobrevivan reinicios:

```ts
import { JsonFileStore, session } from 'orbitx-bot';

const store = await JsonFileStore.open('./data/sessions.json', { ttlMs: 7 * 24 * 3600_000 });
bot.use(session({ store }));
bot.onStop(() => store.close());
```

Añade claves con tipo mediante declaration merging:

```ts
declare module 'orbitx-bot' {
  interface SessionData {
    n?: number;
  }
}
```

## 5. Conversaciones

```ts
bot.onCommand('register', async (ctx) => {
  const name = await ctx.ask('¿Tu nombre?', { timeoutMs: 30_000 });
  if (!name) return ctx.reply('Muy lento, intenta de nuevo');
  const age = await ctx.ask('¿Tu edad?', { filter: (c) => /^\d+$/.test(c.text) });
  await ctx.reply(`Guardado ${name.text}, ${age?.text ?? '?'}`);
});
```

`ask` envía la pregunta y devuelve el siguiente mensaje de **la misma persona en el mismo chat** como un `Context` nuevo, o `null` si se acaba el tiempo (60 s por defecto). Mientras espera, el chat no se bloquea y se libera al trabajador. `filter` decide qué mensajes cuentan como respuesta; los demás se atienden con normalidad.

## 6. Botones y menús

```ts
import { Keyboard, button, link, copy, menu, section, option, paginate } from 'orbitx-bot';

await ctx.reply('Elige', {
  buttons: new Keyboard()
    .row(button('Sí', 'yes', { style: 'primary' }), button('No', 'no', { style: 'danger' }))
    .row(link('Sitio web', 'https://example.com'), copy('Copiar código', 'ABC-123')),
});

await ctx.reply('Descargar', {
  menu: menu('📥 Menú', [section('🎵 Audio', [option('MP3', 'mp3', { tag: 'MP3' })])], { title: 'Calidad' }),
});

const page = paginate(songs, 2, 5);
const rows = Keyboard.grid(page.items.map((s) => button(s.name, `song:${s.id}`)), 1)
  .row(...(page.hasPrev ? [button('◀', `page:${page.page - 1}`)] : []), ...(page.hasNext ? [button('▶', `page:${page.page + 1}`)] : []));
```

## 7. Archivos

Donde se espere un archivo puedes pasar un `Buffer`/`Uint8Array`, una ruta, una URL `http(s)`, `{ url }` o `{ data, name }`.

```ts
await ctx.replyPhoto('./cover.png', { caption: 'Portada' });
await ctx.replyDocument('https://example.com/report.pdf');
const bytes = await ctx.download();
const citado = await ctx.downloadQuoted(0, { format: 'png' });
await ctx.replySticker(bytes, { shape: 'circle' });
```

Pasa solo URLs de confianza: la librería las descarga desde tu servidor. Usa `request.maxFileBytes` para limitar tamaños.

## 8. Encender y apagar

```ts
bot.onStart((b) => b.logger.info('listo'));
bot.onStop(() => db.close());
bot.every(60_000, (b) => b.logger.debug('latido'));

bot.onError((error, ctx) => {
  if (error instanceof OrbitxError) bot.logger.warn(error.explain('es'));
});

await bot.start({ handleSignals: true });
```

- `start()` termina después de `stop()`. Se rechaza si la clave es rechazada (`AuthError`).
- `stop()` cancela el long poll, espera hasta `polling.graceMs` a los manejadores en curso y luego corre los hooks `onStop`.
- `handleSignals: true` detiene limpiamente con `SIGINT` y `SIGTERM`, que es lo que envía el botón «Stop» de Pterodactyl.
- Los errores de red al sondear se envían a `onError` y se reintentan con esperas crecientes.

## 9. Extras útiles

```ts
bot.onCommand('help', helpHandler(bot, { title: 'Comandos' }));

await ctx.replyLong(textoMuyLargo, { size: 4000 });

const reporte = await bot.broadcast(chatIds, 'Mantenimiento a las 22:00', { delayMs: 150 });
```

`helpHandler` lista los comandos registrados con `description`. `splitText` y `replyLong` cortan en saltos de línea o palabras; el tamaño lo defines tú, revisa el límite de la plataforma. `broadcast` envía uno por uno y devuelve `{ sent, failed }`.

## 10. Pruebas

```ts
import { createBot } from 'orbitx-bot';
import { fakeFetch, messageUpdate } from 'orbitx-bot/testing';

const { fetch, calls } = fakeFetch();
const bot = createBot({ key: KEY, logger: false, request: { fetch } });
bot.onCommand('ping', (ctx) => ctx.reply('pong'));

await bot.handle(messageUpdate('/ping'));
// calls[0] → { method: 'sendMessage', params: { chatId: 'chat-1', text: 'pong' } }
```

## 11. Velocidad y memoria

Las escrituras (`send`, `edit`, `delete`…) no pueden ser más rápidas que la propia API. Lo que hace la librería es quitar el desperdicio alrededor:

- **Conexiones calientes.** Las peticiones viajan por sockets keep-alive (`request.keepAlive`, activo por defecto). Tras `start()` la librería abre `request.warmSockets` (2) conexiones por adelantado, así las primeras respuestas se saltan el handshake TCP/TLS. Si tu host cierra las conexiones inactivas, usa `request.keepWarmMs` (por ejemplo `20000`) y un bot inactivo envía un `getMe` mínimo para mantener una abierta.
- **Caché de lecturas.** `account.me`, `account.user`, `chats.list`, `chats.get`, `members.list`, `media.download` y `media.userPhoto` se responden desde memoria mientras estén frescos. Lecturas idénticas hechas a la vez se convierten en una sola petición. Las escrituras hechas con la librería y los eventos de grupo (entradas, salidas, borrados) descartan lo que cambian. `bot.api.call()` nunca se guarda en caché.
- **Caché de archivos.** El mismo archivo local o URL enviado varias veces se lee o descarga una sola vez.
- **Memoria libre.** El presupuesto de la caché es una parte de la memoria que este proceso aún puede usar (respeta límites de contenedor como Pterodactyl): `fraction` de la memoria libre, entre `minBytes` y `maxBytes`. Crece cuando sobra memoria y se reduce, descartando primero lo menos usado, cuando no.
- **Trabajadores.** `polling.concurrency: 'auto'` elige entre 8 y 64 trabajadores según las CPU y la memoria libre.

```ts
const bot = createBot({
  key,
  polling: { concurrency: 'auto' },
  request: { warmSockets: 2, keepWarmMs: 20_000 },
  cache: { fraction: 0.2, minBytes: 8 * 1024 ** 2, maxBytes: 512 * 1024 ** 2, ttlMs: { chat: 5000 } },
});

bot.api.cache;               // { hits, misses, coalesced, entries, bytes, budgetBytes, … }
bot.api.invalidateChat(id);  // tras un cambio hecho fuera de este bot
bot.api.invalidate();        // olvidar todo
```

Apaga todo con `cache: false` y `request: { keepAlive: false }`. Vigencias por defecto (ms): `me` 300000, `user` 60000, `chat` 15000, `members` 15000, `chats` 10000, `file` 600000, `photo` 300000, `download` 300000; un valor `0` desactiva ese tipo. Lo devuelto es una copia, así que modificarlo nunca altera la caché. Para medir en tu servidor ejecuta `bench.mjs` con `MODE=read IDLE_MS=6000`.
