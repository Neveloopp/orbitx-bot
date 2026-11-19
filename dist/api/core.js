import { resolveFile } from '../http/files.js';
import { Transport } from '../http/transport.js';
import { toRows } from '../ui/keyboard.js';
export class ApiCore {
    transport;
    #limits;
    constructor(config, transport) {
        this.transport = transport;
        this.#limits = {
            fetch: config.request.fetch,
            timeoutMs: config.request.timeoutMs,
            maxBytes: config.request.maxFileBytes,
        };
    }
    call(method, params = {}, options) {
        return this.transport.call(method, params, options);
    }
    bytes(method, params = {}, options) {
        return this.transport.bytes(method, params, options);
    }
    async upload(method, params, file, options) {
        const { data, name } = await resolveFile(file, this.#limits);
        const merged = { ...params, name: params['name'] || name || undefined };
        return this.transport.upload(method, merged, data, options);
    }
}
export function withRows(options) {
    const { buttons, ...rest } = options;
    return buttons === undefined ? rest : { ...rest, buttons: toRows(buttons) };
}
