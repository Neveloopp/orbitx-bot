import type { ContextKind } from '../types/entities.js';
import type { CommandInfo, Handler, Middleware, Pattern } from './types.js';
export interface CommandMeta {
    description?: string;
    hidden?: boolean;
}
export interface RouterOptions {
    scope?: 'matched' | 'all';
}
/** A group of handlers that can be mounted on a bot or on another router. / Un grupo de manejadores que se monta en un bot o en otro router. */
export declare class Router {
    #private;
    constructor(options?: RouterOptions);
    /** Runs before the handlers: on a router only when one of its handlers takes the update, on the bot for every update. Skip next() to stop there. / Corre antes de los manejadores: en un router solo cuando uno de sus manejadores toma la actualización, en el bot en toda actualización. Omite next() para detenerse. */
    use(...middlewares: Middleware[]): this;
    /** «/menu», «.menu», «!menu»… (case does not matter). / «/menu», «.menu», «!menu»… (sin distinguir mayúsculas). */
    onCommand(names: string | readonly string[], handler: Handler, meta?: CommandMeta): this;
    /** A text that matches: the exact words (any case) or a RegExp. / Un texto que coincide: las palabras exactas (sin importar mayúsculas) o una RegExp. */
    onText(pattern: Pattern, handler: Handler): this;
    /** A pressed button or chosen menu option, by its data. / Un botón pulsado u opción de menú elegida, por su data. */
    onButton(pattern: Pattern, handler: Handler): this;
    /** 'message', 'callback', 'join', 'leave', 'event', 'deleted', 'join_request' or the kind of a message ('photo'…). / 'message', 'callback', 'join', 'leave', 'event', 'deleted', 'join_request' o el tipo de un mensaje ('photo'…). */
    on(kinds: ContextKind | readonly ContextKind[], handler: Handler): this;
    /** Adds other routers after the handlers already registered. / Agrega otros routers después de los manejadores ya registrados. */
    mount(...routers: Router[]): this;
    /** The commands registered here and in mounted routers. / Los comandos registrados aquí y en los routers montados. */
    commands(): CommandInfo[];
    /** This router as a middleware: it answers when one of its handlers matches, otherwise it calls next(). / Este router como middleware: responde si uno de sus manejadores coincide; si no, llama a next(). */
    middleware(): Middleware;
}
