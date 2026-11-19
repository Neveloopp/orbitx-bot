# Changelog / Historial de cambios

## 2.1.1

**EN** — Fix: a temporary server failure while listening (for example Cloudflare's HTTP 520/52x page) no longer looks like a crash. The library already retried by itself; now the default log is one short warning (the first failure and every 10th) with the right explanation instead of "check baseUrl", plus a line when the connection is restored. A `bot.onError` handler of your own still receives every failure.

**ES** — Corrección: una caída temporal del servidor mientras se escucha (por ejemplo la página HTTP 520/52x de Cloudflare) ya no parece un fallo grave. La librería ya reintentaba sola; ahora el registro por defecto es un aviso corto (el primer fallo y cada 10) con la explicación correcta en vez de "revisa baseUrl", más una línea cuando la conexión se restablece. Un manejador `bot.onError` propio sigue recibiendo todos los fallos.

## 2.1.0

**EN** — Speed and memory. Keep-alive transport with pre-opened connections (`request.keepAlive`, `warmSockets`, `keepWarmMs`, `maxSockets`), gzip responses, a read cache with request coalescing and automatic invalidation (`cache` option, `bot.api.cache`, `bot.api.invalidate`, `bot.api.invalidateChat`, `bot.api.warm`), a file cache for repeated uploads, a memory budget that follows the free memory of the process or container, and `polling.concurrency: 'auto'`. No breaking changes; `cache: false` and `request.keepAlive: false` restore the old behaviour. `bench.mjs` gains `IDLE_MS` and a cached row.

**ES** — Velocidad y memoria. Transporte keep-alive con conexiones abiertas por adelantado (`request.keepAlive`, `warmSockets`, `keepWarmMs`, `maxSockets`), respuestas gzip, caché de lecturas con fusión de peticiones e invalidación automática (opción `cache`, `bot.api.cache`, `bot.api.invalidate`, `bot.api.invalidateChat`, `bot.api.warm`), caché de archivos para subidas repetidas, un presupuesto de memoria que sigue la memoria libre del proceso o contenedor y `polling.concurrency: 'auto'`. Sin cambios incompatibles; `cache: false` y `request.keepAlive: false` devuelven el comportamiento anterior. `bench.mjs` añade `IDLE_MS` y una fila con caché.

## 2.0.1

**EN** — Documentation links in the README and changelog are now absolute, so they work on npmjs.com. No code changes.

**ES** — Los enlaces a la documentación en el README y el changelog ahora son absolutos, para que funcionen en npmjs.com. Sin cambios de código.

## 2.0.0

**EN** — Full rewrite in TypeScript. Breaking: new creation (`createBot`), new handler names (`onCommand`, `onText`, `onButton`, `onError`), API grouped under `bot.api`, error classes. The wire protocol is unchanged. See [docs/en/migration.md](https://unpkg.com/orbitx-bot@2.1.1/docs/en/migration.md).

Added: routers and `loadModules`, scoped middleware, `guard`/`restrict`, `throttle`, `session` with memory and JSON file stores, `trace`, `ctx.ask`/`waitNext`, `Keyboard`, `link`, `copy`, `paginate`, `splitText`, `ctx.replyLong`, `bot.broadcast`, `bot.every`, `onStart`/`onStop`, `helpHandler`, `orbitx-bot/testing`, request timeouts, safe retries, per-chat concurrency, graceful shutdown, `maxFileBytes`, custom `fetch`.

**ES** — Reescritura completa en TypeScript. Cambios incompatibles: nueva creación (`createBot`), nuevos nombres de manejadores (`onCommand`, `onText`, `onButton`, `onError`), API agrupada en `bot.api`, clases de error. El protocolo de red no cambia. Ver [docs/es/migracion.md](https://unpkg.com/orbitx-bot@2.1.1/docs/es/migracion.md).

Añadido: routers y `loadModules`, middleware con alcance, `guard`/`restrict`, `throttle`, `session` con almacenes en memoria y archivo JSON, `trace`, `ctx.ask`/`waitNext`, `Keyboard`, `link`, `copy`, `paginate`, `splitText`, `ctx.replyLong`, `bot.broadcast`, `bot.every`, `onStart`/`onStop`, `helpHandler`, `orbitx-bot/testing`, timeouts de petición, reintentos seguros, concurrencia por chat, apagado ordenado, `maxFileBytes`, `fetch` personalizado.

## 1.2.0

Last release of the single-file JavaScript library. / Última versión de la librería de un solo archivo en JavaScript.
