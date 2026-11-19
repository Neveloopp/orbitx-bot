import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConfigError } from '../errors.js';
import type { Bot } from './bot.js';
import { Router } from './router.js';

export interface LoadOptions {
  recursive?: boolean;
  extensions?: readonly string[];
}

export interface ModuleLike {
  register(bot: Bot): unknown;
}

const DEFAULT_EXTENSIONS = ['.js', '.mjs', '.cjs'];

async function collect(dir: string, options: Required<LoadOptions>): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    throw new ConfigError('MODULE_INVALID', `cannot read the folder ${dir}`, { cause: error });
  }
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (options.recursive) files.push(...(await collect(path, options)));
    } else if (
      options.extensions.some((ext) => entry.name.endsWith(ext)) &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(path);
    }
  }
  return files;
}

/** Imports every module of a folder and mounts it on the bot. / Importa cada módulo de una carpeta y lo monta en el bot. */
export async function loadModules(bot: Bot, dir: string, options: LoadOptions = {}): Promise<string[]> {
  const files = await collect(resolve(dir), {
    recursive: options.recursive ?? false,
    extensions: options.extensions ?? DEFAULT_EXTENSIONS,
  });
  for (const file of files) {
    let loaded: { default?: unknown } & Record<string, unknown>;
    try {
      loaded = (await import(pathToFileURL(file).href)) as typeof loaded;
    } catch (error) {
      throw new ConfigError('MODULE_INVALID', `cannot import ${file}`, { cause: error });
    }
    const exported = loaded.default ?? loaded;
    if (exported instanceof Router) {
      bot.mount(exported);
    } else if (typeof exported === 'function') {
      await (exported as (bot: Bot) => unknown)(bot);
    } else if (typeof (exported as Partial<ModuleLike>)?.register === 'function') {
      await (exported as ModuleLike).register(bot);
    } else {
      throw new ConfigError('MODULE_INVALID', `${file} has no valid default export`);
    }
  }
  return files;
}
