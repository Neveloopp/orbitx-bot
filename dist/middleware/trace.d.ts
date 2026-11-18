import type { Middleware } from '../core/types.js';
/** Logs every update and how long its handler took (debug level). / Registra cada actualización y cuánto tardó su manejador (nivel debug). */
export declare function trace(): Middleware;
