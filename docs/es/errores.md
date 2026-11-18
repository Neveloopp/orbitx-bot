# Errores

Todo error lanzado por la librería es un `OrbitxError` con:

| Campo | Significado |
| --- | --- |
| `code` | Texto estable para decidir qué hacer. En `ApiError` es el código que envió el servidor (o `HTTP_<status>`). |
| `message` | Qué pasó, en inglés. |
| `status` | Estado HTTP, `0` si no hubo. |
| `method` | El método de la API involucrado, o `null`. |
| `retryable` | Si reintentar puede ayudar. |
| `retryAfterMs` | Espera pedida por el servidor (`Retry-After`), o `null`. |
| `hint` | `{ en, es }`: qué hacer al respecto. |
| `cause` | El error original, si lo hay. |

```ts
try {
  await bot.api.messages.send(chatId, 'hola');
} catch (error) {
  if (error instanceof ApiError && error.code === 'ALGUN_CODIGO_DEL_SERVIDOR') { … }
  else if (error instanceof OrbitxError) console.error(error.explain('es'));
}
```

`error.explain('en' | 'es')` da el mensaje más la pista. `describeError(error, lang)` hace lo mismo con cualquier valor.

## Clases

| Clase | Código | Cuándo |
| --- | --- | --- |
| `ConfigError` | `KEY_MISSING`, `KEY_MALFORMED`, `CONFIG_INVALID`, `MODULE_INVALID` | Opciones inválidas o un módulo inválido en `loadModules`. |
| `NetworkError` | `NETWORK` | No se pudo llegar al servidor. Reintentable. |
| `RequestTimeoutError` | `TIMEOUT` | Sin respuesta dentro de `request.timeoutMs`. Reintentable. |
| `AbortedError` | `ABORTED` | Cancelaste la petición con una señal. |
| `BadResponseError` | `BAD_RESPONSE` | La respuesta no era el JSON de la API de bots (`baseUrl` errónea, página de un proxy…). |
| `ApiError` | el código del servidor | La API respondió `ok: false`. `429` y `5xx` son reintentables. |
| `AuthError` | el código del servidor | HTTP `401`: la clave fue rechazada. Detiene `start()`. |
| `FileError` | `FILE_INVALID`, `FILE_NOT_FOUND`, `FILE_TOO_LARGE`, `DOWNLOAD_FAILED` | No se pudo usar una entrada de archivo. |
| `StateError` | `NO_MESSAGE`, `NO_JOIN_REQUEST`, `NEXT_CALLED_TWICE`, `ALREADY_RUNNING` | Se usó la librería de una forma que no puede funcionar. |

## Reintentos

- Las lecturas (`getMe`, `getChat`, `getChats`, `getChatMembers`, `getJoinRequests`, `getUser`, `getUserPhoto`, `getFile`) se reintentan ante errores de red, timeouts y `5xx`.
- Cualquier llamada se reintenta ante `429`, esperando `Retry-After` si viene.
- Las escrituras **no** se reintentan tras un error de red o `5xx`: el servidor pudo procesarlas y enviarías dos veces.
- El transporte nunca reintenta el long poll; el ciclo de escucha espera y vuelve a pedir (`polling.minBackoffMs` → `maxBackoffMs`).

## Dónde terminan los errores

- Un manejador o middleware que lanza → `bot.onError(error, ctx)`. Por defecto se registra con el lugar donde ocurrió, la pista y, en errores inesperados, el stack.
- Un poll fallido → `bot.onError(error)` y un reintento. Un `AuthError` detiene el bot.
- Un error dentro del propio `onError` se registra y nunca tumba el bot.
- Las claves se enmascaran: nunca aparecen en mensajes ni logs.
