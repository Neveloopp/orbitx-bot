import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { createBot } from '../src/index.js';
import { createFastFetch } from '../src/http/fast-fetch.js';
import { KEY } from './helpers.js';

interface Local {
  server: Server;
  url: string;
  connections: number;
  seen: Array<{ method: string; url: string; body: string; headers: Record<string, string | string[] | undefined> }>;
}

async function local(handler?: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void): Promise<Local> {
  const state = { connections: 0, seen: [] } as unknown as Local;
  state.server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      state.seen.push({ method: req.method ?? '', url: req.url ?? '', body: Buffer.concat(chunks).toString(), headers: req.headers });
      if (handler) return handler(req, res);
      const payload = JSON.stringify({ ok: true, result: { id: 'bot-1', path: req.url } });
      if (String(req.headers['accept-encoding']).includes('gzip')) {
        res.writeHead(200, { 'content-type': 'application/json', 'content-encoding': 'gzip' });
        res.end(gzipSync(payload));
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(payload);
      }
    });
  });
  state.server.keepAliveTimeout = 30_000;
  state.server.on('connection', () => state.connections++);
  await new Promise<void>((resolve) => state.server.listen(0, '127.0.0.1', resolve));
  state.url = `http://127.0.0.1:${(state.server.address() as AddressInfo).port}`;
  return state;
}

const close = (s: Local): Promise<void> => new Promise((resolve) => { s.server.closeAllConnections(); s.server.close(() => resolve()); });

test('fast fetch: JSON, gzip and the body reach the server', async () => {
  const s = await local();
  const fast = createFastFetch();
  try {
    const res = await fast.fetch(`${s.url}/x?a=1`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"k":"v"}' });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, result: { id: 'bot-1', path: '/x?a=1' } });
    assert.equal(s.seen[0]?.body, '{"k":"v"}');
    assert.equal(s.seen[0]?.headers['content-type'], 'application/json');
  } finally {
    fast.destroy();
    await close(s);
  }
});

test('fast fetch: sequential requests reuse one connection', async () => {
  const s = await local();
  const fast = createFastFetch();
  try {
    for (let i = 0; i < 10; i++) await (await fast.fetch(`${s.url}/y`, { method: 'POST', body: '{}' })).text();
    assert.equal(s.connections, 1);
  } finally {
    fast.destroy();
    await close(s);
  }
});

test('fast fetch: abort rejects with AbortError and the next request still works', async () => {
  const s = await local((_req, res) => setTimeout(() => res.end('{"ok":true,"result":1}'), 200));
  const fast = createFastFetch();
  try {
    const controller = new AbortController();
    const pending = fast.fetch(`${s.url}/slow`, { method: 'POST', body: '{}', signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    await assert.rejects(pending, (e: Error) => e.name === 'AbortError');
    const early = new AbortController();
    early.abort();
    await assert.rejects(fast.fetch(`${s.url}/slow`, { signal: early.signal }), (e: Error) => e.name === 'AbortError');
    assert.equal((await fast.fetch(`${s.url}/slow`, { method: 'POST', body: '{}' })).status, 200);
  } finally {
    fast.destroy();
    await close(s);
  }
});

test('fast fetch: non-2xx answers and 204 come through, refused connections reject', async () => {
  const s = await local((req, res) => {
    if (req.url === '/empty') { res.writeHead(204); return res.end(); }
    res.writeHead(429, { 'retry-after': '3', 'content-type': 'application/json' });
    res.end('{"ok":false,"error":{"code":"RATE","message":"slow"}}');
  });
  const fast = createFastFetch();
  try {
    const limited = await fast.fetch(`${s.url}/a`, { method: 'POST', body: '{}' });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '3');
    assert.equal((await fast.fetch(`${s.url}/empty`, { method: 'POST', body: '{}' })).status, 204);
    const port = Number(new URL(s.url).port);
    await close(s);
    await assert.rejects(fast.fetch(`http://127.0.0.1:${port}/z`, { method: 'POST', body: '{}' }));
  } finally {
    fast.destroy();
  }
});

test('a bot over the fast fetch talks to a local server end to end, binary included', async () => {
  const png = Buffer.from([137, 80, 78, 71, 0, 255, 1, 2]);
  const s = await local((req, res) => {
    if (req.url?.endsWith('/getFile')) { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(png); }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, result: { id: 'bot-1' } }));
  });
  const bot = createBot({ key: KEY, baseUrl: s.url, logger: false });
  try {
    assert.equal((await bot.api.account.me()).id, 'bot-1');
    const file = await bot.api.media.download('c1', 1);
    assert.deepEqual([...file], [...png]);
    assert.ok(s.connections <= 2);
    assert.equal(s.seen[0]?.headers['authorization']?.toString().startsWith('Bearer oxb_'), true);
  } finally {
    await close(s);
  }
});
