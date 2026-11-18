import { AbortedError, ApiError, AuthError, BadResponseError, NetworkError, OrbitxError, RequestTimeoutError, } from '../errors.js';
import { authorization, methodUrl, READ_ONLY_METHODS } from '../protocol.js';
import { sleep } from '../utils/async.js';
function backoff(attempt, hint) {
    if (hint !== null)
        return Math.min(hint, 30_000);
    return Math.min(250 * 2 ** attempt, 4000) + Math.floor(Math.random() * 120);
}
export class Transport {
    #options;
    constructor(options) {
        this.#options = options;
    }
    /** Calls one API method with a JSON body. / Llama a un método de la API con cuerpo JSON. */
    call(method, params = {}, options = {}) {
        return this.#send(method, methodUrl(this.#options.baseUrl, method), { body: JSON.stringify(params), type: 'application/json' }, options, (res) => this.#unwrap(res, method));
    }
    /** Calls a method that answers with a file. / Llama a un método que responde con un archivo. */
    bytes(method, params = {}, options = {}) {
        return this.#send(method, methodUrl(this.#options.baseUrl, method), { body: JSON.stringify(params), type: 'application/json' }, options, async (res) => {
            if (!res.ok)
                return this.#unwrap(res, method);
            return Buffer.from(await res.arrayBuffer());
        });
    }
    /** Sends a file as the body; the other parameters go in the query. / Envía un archivo como cuerpo; los demás parámetros van en la query. */
    upload(method, params, data, options = {}) {
        const query = new URLSearchParams();
        for (const [name, value] of Object.entries(params)) {
            if (value === undefined || value === null)
                continue;
            query.set(name, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
        return this.#send(method, methodUrl(this.#options.baseUrl, method, query), { body: data, type: 'application/octet-stream' }, options, (res) => this.#unwrap(res, method));
    }
    async #send(method, url, payload, options, read) {
        const maxRetries = options.retries ?? this.#options.retries;
        const readOnly = READ_ONLY_METHODS.has(method);
        for (let attempt = 0;; attempt++) {
            try {
                return await this.#once(method, url, payload, options, read);
            }
            catch (error) {
                const again = error instanceof OrbitxError &&
                    error.retryable &&
                    (readOnly || error.status === 429) &&
                    attempt < maxRetries &&
                    !options.signal?.aborted;
                if (!again)
                    throw error;
                const wait = backoff(attempt, error.retryAfterMs);
                this.#options.logger.debug(`${method} failed, retrying in ${wait} ms`, error);
                await sleep(wait, options.signal);
            }
        }
    }
    async #once(method, url, payload, options, read) {
        const timeoutMs = options.timeoutMs ?? this.#options.timeoutMs;
        const external = options.signal;
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);
        const onAbort = () => controller.abort();
        if (external?.aborted)
            controller.abort();
        else
            external?.addEventListener('abort', onAbort, { once: true });
        try {
            const res = await this.#options.fetch(url, {
                method: 'POST',
                headers: {
                    ...this.#options.headers,
                    authorization: authorization(this.#options.key),
                    'content-type': payload.type,
                },
                body: payload.body,
                signal: controller.signal,
            });
            return await read(res);
        }
        catch (error) {
            if (error instanceof OrbitxError)
                throw error;
            if (timedOut)
                throw new RequestTimeoutError(method, timeoutMs, error);
            if (external?.aborted)
                throw new AbortedError(method, error);
            throw new NetworkError(method, error);
        }
        finally {
            clearTimeout(timer);
            external?.removeEventListener('abort', onAbort);
        }
    }
    async #unwrap(res, method) {
        let body = null;
        try {
            body = JSON.parse(await res.text());
        }
        catch {
            body = null;
        }
        if (body === null || typeof body !== 'object' || typeof body.ok !== 'boolean') {
            throw new BadResponseError(method, res.status);
        }
        if (!body.ok) {
            const { code, message } = body.error ?? {};
            if (res.status === 401)
                throw new AuthError(method, code, message);
            const seconds = Number(res.headers.get('retry-after'));
            const extra = Number.isFinite(seconds) && seconds > 0 ? { retryAfterMs: seconds * 1000 } : {};
            throw new ApiError(method, res.status, code, message, extra);
        }
        return body.result;
    }
}
