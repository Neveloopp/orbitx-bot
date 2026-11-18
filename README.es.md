# orbitx-bot

Español · [English](https://unpkg.com/orbitx-bot@2.0.1/README.md)

Librería TypeScript para programar bots del chat **ORBITX SOCIAL** (ORBITX SPACE). Sin dependencias en producción, Node.js 18+.

```ts
import { createBotFromEnv, button, Keyboard } from 'orbitx-bot';

const bot = createBotFromEnv({ owners: ['@yo'] });

bot.onCommand('menu', (ctx) =>
  ctx.reply('Hola', { buttons: new Keyboard().row(button('Música', 'music')) }),
  { description: 'Abre el menú' },
);

bot.onButton('music', (ctx) => ctx.reply('Escribe /play y el nombre de una canción'));

await bot.start({ handleSignals: true });
```

## Instalación

```bash
npm install orbitx-bot
```

Saca la clave del bot (`oxb_…`) de «Bot ORBITX» en ORBITX SPACE y mantenla fuera del código:

```bash
ORBITX_BOT_KEY=oxb_xxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Qué incluye

- **Creación**: `createBot(clave | opciones)` y `createBotFromEnv()`, con opciones validadas y una clave que nunca aparece en errores ni logs.
- **Manejadores en módulos**: grupos de manejadores con `Router`, montados en el bot o entre sí, cargados desde una carpeta con `bot.loadModules('./dist/handlers')`.
- **Middleware con alcance**: `bot.use()` para toda actualización, `router.use()` solo cuando ese router responde.
- **Middleware listo**: `guard` / `restrict` (dueño, admin, grupo, privado), `throttle`, `session` (memoria o archivo JSON), `trace`.
- **Conversaciones**: `await ctx.ask('¿Tu nombre?')` espera el siguiente mensaje de esa persona.
- **API agrupada**: `bot.api.messages`, `media`, `chats`, `members`, `account`, con tipos completos.
- **Errores claros**: `ApiError`, `AuthError`, `NetworkError`, `RequestTimeoutError`, `FileError`… cada uno se explica en inglés y español con `error.explain('es')`.
- **Transporte robusto**: timeouts, cancelación, reintentos solo donde son seguros y espera creciente en el long poll.
- **Procesamiento concurrente**: las actualizaciones de un chat siguen en orden, los chats distintos corren en paralelo.
- **Utilidades**: `Keyboard`, `menu`, `paginate`, `splitText`, `ctx.replyLong`, `bot.broadcast`, `bot.every`, `helpHandler`, apagado ordenado.
- **Pruebas**: `orbitx-bot/testing` con actualizaciones falsas y un `fetch` falso.

## Estructura del proyecto

```text
src/
  index.ts         exportaciones públicas
  create.ts        createBot, createBotFromEnv
  config.ts        validación de opciones y valores por defecto
  protocol.ts      el único lugar que conoce los nombres del protocolo (URL, métodos, tipos de update)
  errors.ts        clases de error y pistas bilingües
  logger.ts        logger de consola con identidad ORBITX
  http/            transporte (fetch, reintentos, timeouts) y entradas de archivo
  api/             messages, media, chats, members, account
  core/            bot, router, context, scheduler, poller, waiters, loader
  middleware/      guard, throttle, session, trace
  handlers/        manejadores listos (help)
  ui/              botones, menús, teclados, paginación
```

## Documentación

| Tema | English | Español |
| --- | --- | --- |
| Guía | [docs/en/guide.md](https://unpkg.com/orbitx-bot@2.0.1/docs/en/guide.md) | [docs/es/guia.md](https://unpkg.com/orbitx-bot@2.0.1/docs/es/guia.md) |
| Referencia de la API | [docs/en/api.md](https://unpkg.com/orbitx-bot@2.0.1/docs/en/api.md) | [docs/es/api.md](https://unpkg.com/orbitx-bot@2.0.1/docs/es/api.md) |
| Errores | [docs/en/errors.md](https://unpkg.com/orbitx-bot@2.0.1/docs/en/errors.md) | [docs/es/errores.md](https://unpkg.com/orbitx-bot@2.0.1/docs/es/errores.md) |
| Migrar desde 1.2.0 | [docs/en/migration.md](https://unpkg.com/orbitx-bot@2.0.1/docs/en/migration.md) | [docs/es/migracion.md](https://unpkg.com/orbitx-bot@2.0.1/docs/es/migracion.md) |

Documentación de la plataforma: https://ctrl.orbitxspace.com/bots?tab=docs
