import type { Context } from './context.js';
export type Next = () => Promise<void>;
export type Middleware = (ctx: Context, next: Next) => unknown;
export type Handler = (ctx: Context) => unknown;
export type ErrorHandler = (error: unknown, ctx?: Context) => unknown;
export type Pattern = string | RegExp;
export type Hit = boolean | RegExpExecArray;
export interface RouteInfo {
    type: 'command' | 'text' | 'button' | 'event';
    names?: string[];
    description?: string;
    hidden?: boolean;
}
export interface Route {
    match(ctx: Context): Hit;
    handler: Handler;
    info: RouteInfo;
}
export interface CommandInfo {
    names: string[];
    description: string | null;
    hidden: boolean;
}
