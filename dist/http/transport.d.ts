import type { Logger } from '../logger.js';
export interface TransportOptions {
    baseUrl: string;
    key: string;
    timeoutMs: number;
    retries: number;
    headers: Readonly<Record<string, string>>;
    fetch: typeof fetch;
    logger: Logger;
}
export interface CallOptions {
    timeoutMs?: number;
    retries?: number;
    signal?: AbortSignal;
}
export declare class Transport {
    #private;
    constructor(options: TransportOptions);
    /** Calls one API method with a JSON body. / Llama a un método de la API con cuerpo JSON. */
    call<T>(method: string, params?: object, options?: CallOptions): Promise<T>;
    /** Calls a method that answers with a file. / Llama a un método que responde con un archivo. */
    bytes(method: string, params?: object, options?: CallOptions): Promise<Buffer>;
    /** Sends a file as the body; the other parameters go in the query. / Envía un archivo como cuerpo; los demás parámetros van en la query. */
    upload<T>(method: string, params: Record<string, unknown>, data: Uint8Array, options?: CallOptions): Promise<T>;
}
