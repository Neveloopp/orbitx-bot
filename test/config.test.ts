import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ConfigError, createBot, createBotFromEnv, describeError, resolveConfig, VERSION } from '../src/index.js';
import { KEY } from './helpers.js';

test('createBot accepts a key or an options object', () => {
  assert.ok(createBot(KEY));
  assert.ok(createBot({ key: KEY, logger: false }));
});

test('a missing key is a clear ConfigError', () => {
  for (const key of [undefined, '', '   ']) {
    assert.throws(
      () => resolveConfig({ key: key as never }),
      (error: unknown) => error instanceof ConfigError && error.code === 'KEY_MISSING',
    );
  }
});

test('a malformed key never leaks into the message', () => {
  const secret = 'oxb_short_secretvalue';
  try {
    resolveConfig({ key: secret });
    assert.fail('should have thrown');
  } catch (error) {
    assert.ok(error instanceof ConfigError);
    assert.equal(error.code, 'KEY_MALFORMED');
    assert.ok(!error.message.includes('secretvalue'));
  }
});

test('errors explain themselves in English and Spanish', () => {
  const error = new ConfigError('KEY_MISSING', 'the bot key is missing');
  assert.match(error.explain('en'), /Pass the key/);
  assert.match(error.explain('es'), /Pasa la clave/);
  assert.match(describeError(error, 'es'), /^\[KEY_MISSING\]/);
});

test('baseUrl must be https, except on localhost', () => {
  assert.throws(() => resolveConfig({ key: KEY, baseUrl: 'http://example.com' }), ConfigError);
  assert.throws(() => resolveConfig({ key: KEY, baseUrl: 'not a url' }), ConfigError);
  assert.equal(resolveConfig({ key: KEY, baseUrl: 'http://localhost:3000/' }).baseUrl, 'http://localhost:3000');
  assert.equal(resolveConfig({ key: KEY, baseUrl: 'https://example.com//' }).baseUrl, 'https://example.com');
});

test('numeric options are validated', () => {
  assert.throws(() => resolveConfig({ key: KEY, polling: { concurrency: 0 } }), ConfigError);
  assert.throws(() => resolveConfig({ key: KEY, request: { timeoutMs: -1 } }), ConfigError);
  assert.throws(() => resolveConfig({ key: KEY, prefixes: [] }), ConfigError);
});

test('owners are normalized and prefixes sorted longest first', () => {
  const config = resolveConfig({ key: KEY, owners: ['@Boss', 42], prefixes: ['!', '!!', '/'] });
  assert.ok(config.owners.has('boss'));
  assert.ok(config.owners.has('42'));
  assert.deepEqual(config.prefixes, ['!!', '!', '/']);
});

test('createBotFromEnv reads the variable', () => {
  process.env['TEST_ORBITX_KEY'] = KEY;
  assert.ok(createBotFromEnv({ variable: 'TEST_ORBITX_KEY', logger: false }));
  delete process.env['TEST_ORBITX_KEY'];
  assert.throws(
    () => createBotFromEnv({ variable: 'TEST_ORBITX_KEY' }),
    (error: unknown) => error instanceof ConfigError && /TEST_ORBITX_KEY/.test(error.message),
  );
});

test('VERSION matches package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
  assert.equal(VERSION, pkg.version);
});
