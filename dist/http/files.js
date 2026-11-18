import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { FileError } from '../errors.js';
const WEB_URL = /^https?:\/\//i;
function nameFromUrl(url) {
    try {
        const last = basename(new URL(url).pathname);
        return last ? decodeURIComponent(last) : null;
    }
    catch {
        return null;
    }
}
function assertSize(size, limits, label) {
    if (limits.maxBytes !== null && size > limits.maxBytes) {
        throw new FileError('FILE_TOO_LARGE', `${label} is ${size} bytes (limit ${limits.maxBytes})`);
    }
}
async function download(url, limits) {
    if (!WEB_URL.test(url)) {
        throw new FileError('FILE_INVALID', `only http(s) URLs can be downloaded: ${url}`);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limits.timeoutMs);
    try {
        const res = await limits.fetch(url, { signal: controller.signal });
        if (!res.ok) {
            throw new FileError('DOWNLOAD_FAILED', `could not download ${url} (HTTP ${res.status})`, {
                status: res.status,
            });
        }
        assertSize(Number(res.headers.get('content-length') ?? 0), limits, url);
        const data = new Uint8Array(await res.arrayBuffer());
        assertSize(data.byteLength, limits, url);
        return { data, name: nameFromUrl(url) };
    }
    catch (error) {
        if (error instanceof FileError)
            throw error;
        throw new FileError('DOWNLOAD_FAILED', `could not download ${url}`, { cause: error });
    }
    finally {
        clearTimeout(timer);
    }
}
async function read(path, limits) {
    try {
        assertSize((await stat(path)).size, limits, path);
        return { data: await readFile(path), name: basename(path) };
    }
    catch (error) {
        if (error instanceof FileError)
            throw error;
        throw new FileError('FILE_NOT_FOUND', `cannot read ${path}`, { cause: error });
    }
}
/** Turns any accepted file input into bytes. / Convierte cualquier entrada de archivo en bytes. */
export async function resolveFile(file, limits) {
    if (file instanceof Uint8Array) {
        assertSize(file.byteLength, limits, 'the file');
        return { data: file, name: null };
    }
    if (typeof file === 'string') {
        return WEB_URL.test(file) ? download(file, limits) : read(file, limits);
    }
    if (file && typeof file === 'object') {
        if ('url' in file && typeof file.url === 'string')
            return download(file.url, limits);
        if ('data' in file && file.data instanceof Uint8Array) {
            assertSize(file.data.byteLength, limits, 'the file');
            return { data: file.data, name: file.name ?? null };
        }
    }
    throw new FileError('FILE_INVALID', 'unsupported file input');
}
