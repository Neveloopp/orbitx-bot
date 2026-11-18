import type { FileInput } from '../types/options.js';
export interface ResolvedFile {
    data: Uint8Array;
    name: string | null;
}
export interface FileLimits {
    fetch: typeof fetch;
    timeoutMs: number;
    maxBytes: number | null;
}
/** Turns any accepted file input into bytes. / Convierte cualquier entrada de archivo en bytes. */
export declare function resolveFile(file: FileInput, limits: FileLimits): Promise<ResolvedFile>;
