import type { ContextKind } from '../types/entities.js';
import type { Context } from './context.js';
import type { Hit, Pattern } from './types.js';
export declare function normalizeCommand(name: string): string;
export declare function commandMatcher(names: string | readonly string[]): (ctx: Context) => Hit;
export declare function textMatcher(pattern: Pattern): (ctx: Context) => Hit;
export declare function buttonMatcher(pattern: Pattern): (ctx: Context) => Hit;
export declare function kindMatcher(kinds: ContextKind | readonly ContextKind[]): (ctx: Context) => Hit;
