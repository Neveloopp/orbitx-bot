import type { ResolvedConfig } from '../config.js';
import { Transport, type CallOptions } from '../http/transport.js';
import { type Keyboard } from '../ui/keyboard.js';
import type { Button, FileInput } from '../types/options.js';
export declare class ApiCore {
    #private;
    readonly transport: Transport;
    constructor(config: ResolvedConfig, transport: Transport);
    call<T>(method: string, params?: object, options?: CallOptions): Promise<T>;
    bytes(method: string, params?: object, options?: CallOptions): Promise<Buffer>;
    upload<T>(method: string, params: Record<string, unknown>, file: FileInput, options?: CallOptions): Promise<T>;
}
export declare function withRows(options: {
    buttons?: Button[][] | Keyboard;
    [key: string]: unknown;
}): Record<string, unknown>;
