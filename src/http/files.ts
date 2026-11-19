import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import type { ReadLayer } from '../cache/reads.js';
import { FileError } from '../errors.js';
import type { FileInput } from '../types/options.js';

export interface ResolvedFile {
  data: Uint8Array;
  name: string | null;
}

export interface FileLimits {
  fetch: typeof fetch;
  timeoutMs: number;
  maxBytes: number | null;
  reads?: ReadLayer;
}

const WEB_URL = /^https?:\/\//i;

function nameFromUrl(url: string): string | null {
  try {
    const last = basename(new URL(url).pathname);
    return last ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

function assertSize(size: number, limits: FileLimits, label: string): void {
  if (limits.maxBytes !== null && size > limits.maxBytes) {
    throw new FileError('FILE_TOO_LARGE', `${label} is ${size} bytes (limit ${limits.maxBytes})`);
  }
}

async function download(url: string, limits: FileLimits): Promise<ResolvedFile> {
  if (!WEB_URL.test(url)) {
    throw new FileError('FILE_INVALID', `only http(s) URLs can be downloaded: ${url}`);
  }
  const load = async (): Promise<Buffer> => {
    const { data: bytes } = await fetchUrl(url, limits);
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  };
  const data = limits.reads ? await limits.reads.bytes('download', `download:${url}`, [], load) : await load();
  assertSize(data.byteLength, limits, url);
  return { data, name: nameFromUrl(url) };
}

async function fetchUrl(url: string, limits: FileLimits): Promise<ResolvedFile> {
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
  } catch (error) {
    if (error instanceof FileError) throw error;
    throw new FileError('DOWNLOAD_FAILED', `could not download ${url}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

async function read(path: string, limits: FileLimits): Promise<ResolvedFile> {
  try {
    const info = await stat(path);
    assertSize(info.size, limits, path);
    const load = (): Promise<Buffer> => readFile(path);
    const data = limits.reads
      ? await limits.reads.bytes('download', `upload:${path}:${info.mtimeMs}:${info.size}`, [], load)
      : await load();
    return { data, name: basename(path) };
  } catch (error) {
    if (error instanceof FileError) throw error;
    throw new FileError('FILE_NOT_FOUND', `cannot read ${path}`, { cause: error });
  }
}

/** Turns any accepted file input into bytes. / Convierte cualquier entrada de archivo en bytes. */
export async function resolveFile(file: FileInput, limits: FileLimits): Promise<ResolvedFile> {
  if (file instanceof Uint8Array) {
    assertSize(file.byteLength, limits, 'the file');
    return { data: file, name: null };
  }
  if (typeof file === 'string') {
    return WEB_URL.test(file) ? download(file, limits) : read(file, limits);
  }
  if (file && typeof file === 'object') {
    if ('url' in file && typeof file.url === 'string') return download(file.url, limits);
    if ('data' in file && file.data instanceof Uint8Array) {
      assertSize(file.data.byteLength, limits, 'the file');
      return { data: file.data, name: file.name ?? null };
    }
  }
  throw new FileError('FILE_INVALID', 'unsupported file input');
}
