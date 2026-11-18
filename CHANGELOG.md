# Changelog / Historial de cambios

## 2.0.1

**EN** — Documentation links in the README and changelog are now absolute, so they work on npmjs.com. No code changes.

**ES** — Los enlaces a la documentación en el README y el changelog ahora son absolutos, para que funcionen en npmjs.com. Sin cambios de código.

## 2.0.0

**EN** — Full rewrite in TypeScript. Breaking: new creation (`createBot`), new handler names (`onCommand`, `onText`, `onButton`, `onError`), API grouped under `bot.api`, error classes. The wire protocol is unchanged. See [docs/en/migration.md](https://unpkg.com/orbitx-bot@2.0.1/docs/en/migration.md).

Added: routers and `loadModules`, scoped middleware, `guard`/`restrict`, `throttle`, `session` with memory and JSON file stores, `trace`, `ctx.ask`/`waitNext`, `Keyboard`, `link`, `copy`, `paginate`, `splitText`, `ctx.replyLong`, `bot.broadcast`, `bot.every`, `onStart`/`onStop`, `helpHandler`, `orbitx-bot/testing`, request timeouts, safe retries, per-chat concurrency, graceful shutdown, `maxFileBytes`, custom `fetch`.

**ES** — Reescritura completa en TypeScript. Cambios incompatibles: nueva creación (`createBot`), nuevos nombres de manejadores (`onCommand`, `onText`, `onButton`, `onError`), API agrupada en `bot.api`, clases de error. El protocolo de red no cambia. Ver [docs/es/migracion.md](https://unpkg.com/orbitx-bot@2.0.1/docs/es/migracion.md).

Añadido: routers y `loadModules`, middleware con alcance, `guard`/`restrict`, `throttle`, `session` con almacenes en memoria y archivo JSON, `trace`, `ctx.ask`/`waitNext`, `Keyboard`, `link`, `copy`, `paginate`, `splitText`, `ctx.replyLong`, `bot.broadcast`, `bot.every`, `onStart`/`onStop`, `helpHandler`, `orbitx-bot/testing`, timeouts de petición, reintentos seguros, concurrencia por chat, apagado ordenado, `maxFileBytes`, `fetch` personalizado.

## 1.2.0

Last release of the single-file JavaScript library. / Última versión de la librería de un solo archivo en JavaScript.
