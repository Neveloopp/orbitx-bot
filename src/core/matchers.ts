import type { ContextKind } from '../types/entities.js';
import type { Context } from './context.js';
import type { Hit, Pattern } from './types.js';

export function normalizeCommand(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/^[/.!#]/, '');
}

function stateless(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
}

export function commandMatcher(names: string | readonly string[]): (ctx: Context) => Hit {
  const list = ([] as string[]).concat(names).map(normalizeCommand);
  return (ctx) => ctx.command !== null && list.includes(ctx.command);
}

export function textMatcher(pattern: Pattern): (ctx: Context) => Hit {
  if (pattern instanceof RegExp) {
    const re = stateless(pattern);
    return (ctx) => (ctx.type === 'message' && ctx.text !== '' ? re.exec(ctx.text) ?? false : false);
  }
  const wanted = String(pattern).toLowerCase();
  return (ctx) => ctx.type === 'message' && ctx.text !== '' && ctx.text.trim().toLowerCase() === wanted;
}

export function buttonMatcher(pattern: Pattern): (ctx: Context) => Hit {
  if (pattern instanceof RegExp) {
    const re = stateless(pattern);
    return (ctx) => (ctx.type === 'callback' && ctx.data !== null ? re.exec(ctx.data) ?? false : false);
  }
  return (ctx) => ctx.type === 'callback' && ctx.data === pattern;
}

export function kindMatcher(kinds: ContextKind | readonly ContextKind[]): (ctx: Context) => Hit {
  const list = ([] as ContextKind[]).concat(kinds);
  return (ctx) => list.some((kind) => ctx.is(kind));
}
