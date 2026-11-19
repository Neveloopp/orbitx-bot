# Errors

Every error thrown by the library is an `OrbitxError` with:

| Field | Meaning |
| --- | --- |
| `code` | Stable text to branch on. For `ApiError` it is the code the server sent (or `HTTP_<status>`). |
| `message` | What happened, in English. |
| `status` | HTTP status, `0` when there was none. |
| `method` | The API method involved, or `null`. |
| `retryable` | Whether trying again can help. |
| `retryAfterMs` | Wait asked by the server (`Retry-After`), or `null`. |
| `hint` | `{ en, es }`: what to do about it. |
| `cause` | The original error, when there is one. |

```ts
try {
  await bot.api.messages.send(chatId, 'hi');
} catch (error) {
  if (error instanceof ApiError && error.code === 'SOME_SERVER_CODE') { … }
  else if (error instanceof OrbitxError) console.error(error.explain('es'));
}
```

`error.explain('en' | 'es')` gives the message plus the hint. `describeError(error, lang)` does the same for any value.

## Classes

| Class | Code | When |
| --- | --- | --- |
| `ConfigError` | `KEY_MISSING`, `KEY_MALFORMED`, `CONFIG_INVALID`, `MODULE_INVALID` | Bad options or a bad module in `loadModules`. |
| `NetworkError` | `NETWORK` | The server could not be reached. Retryable. |
| `RequestTimeoutError` | `TIMEOUT` | No answer within `request.timeoutMs`. Retryable. |
| `AbortedError` | `ABORTED` | You cancelled the request with a signal. |
| `BadResponseError` | `BAD_RESPONSE` | The answer was not the bot API JSON (wrong `baseUrl`, proxy page…). A `5xx` such as Cloudflare's `520` is retryable and is treated as a temporary outage. |
| `ApiError` | the server code | The API answered `ok: false`. `429` and `5xx` are retryable. |
| `AuthError` | the server code | HTTP `401`: the key was refused. Stops `start()`. |
| `FileError` | `FILE_INVALID`, `FILE_NOT_FOUND`, `FILE_TOO_LARGE`, `DOWNLOAD_FAILED` | A file input could not be used. |
| `StateError` | `NO_MESSAGE`, `NO_JOIN_REQUEST`, `NEXT_CALLED_TWICE`, `ALREADY_RUNNING` | The library was used in a way that cannot work. |

## Retries

- Read calls (`getMe`, `getChat`, `getChats`, `getChatMembers`, `getJoinRequests`, `getUser`, `getUserPhoto`, `getFile`) are retried on network errors, timeouts and `5xx`.
- Any call is retried on `429`, waiting `Retry-After` when given.
- Writes are **not** retried after a network error or `5xx`: the server may have processed them and you would send twice.
- The long poll is never retried by the transport; the polling loop waits and asks again (`polling.minBackoffMs` → `maxBackoffMs`).

## Where errors end up

- A handler or middleware that throws → `bot.onError(error, ctx)`. By default it is logged with where it happened, the hint and, for unexpected errors, the stack.
- A failed poll → `bot.onError(error)` and a retry with growing waits. The default handler logs temporary failures (network, timeouts, `429`, `5xx` such as Cloudflare's `520`) as one short warning (the first and every 10th) and logs a line when the connection is restored; a handler of your own receives every failure. An `AuthError` stops the bot instead.
- An error inside `onError` itself is logged and never crashes the bot.
- Keys are masked: they never appear in messages or logs.
