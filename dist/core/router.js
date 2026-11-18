import { compose } from './compose.js';
import { buttonMatcher, commandMatcher, kindMatcher, normalizeCommand, textMatcher } from './matchers.js';
/** A group of handlers that can be mounted on a bot or on another router. / Un grupo de manejadores que se monta en un bot o en otro router. */
export class Router {
    #guards = [];
    #entries = [];
    #scope;
    constructor(options = {}) {
        this.#scope = options.scope ?? 'matched';
    }
    /** Runs before the handlers: on a router only when one of its handlers takes the update, on the bot for every update. Skip next() to stop there. / Corre antes de los manejadores: en un router solo cuando uno de sus manejadores toma la actualización, en el bot en toda actualización. Omite next() para detenerse. */
    use(...middlewares) {
        this.#guards.push(...middlewares);
        return this;
    }
    /** «/menu», «.menu», «!menu»… (case does not matter). / «/menu», «.menu», «!menu»… (sin distinguir mayúsculas). */
    onCommand(names, handler, meta = {}) {
        const list = [].concat(names).map(normalizeCommand);
        return this.#route({
            match: commandMatcher(list),
            handler,
            info: {
                type: 'command',
                names: list,
                ...(meta.description ? { description: meta.description } : {}),
                ...(meta.hidden ? { hidden: true } : {}),
            },
        });
    }
    /** A text that matches: the exact words (any case) or a RegExp. / Un texto que coincide: las palabras exactas (sin importar mayúsculas) o una RegExp. */
    onText(pattern, handler) {
        return this.#route({ match: textMatcher(pattern), handler, info: { type: 'text' } });
    }
    /** A pressed button or chosen menu option, by its data. / Un botón pulsado u opción de menú elegida, por su data. */
    onButton(pattern, handler) {
        return this.#route({ match: buttonMatcher(pattern), handler, info: { type: 'button' } });
    }
    /** 'message', 'callback', 'join', 'leave', 'event', 'deleted', 'join_request' or the kind of a message ('photo'…). / 'message', 'callback', 'join', 'leave', 'event', 'deleted', 'join_request' o el tipo de un mensaje ('photo'…). */
    on(kinds, handler) {
        return this.#route({ match: kindMatcher(kinds), handler, info: { type: 'event' } });
    }
    /** Adds other routers after the handlers already registered. / Agrega otros routers después de los manejadores ya registrados. */
    mount(...routers) {
        for (const router of routers)
            this.#entries.push({ kind: 'mount', router });
        return this;
    }
    /** The commands registered here and in mounted routers. / Los comandos registrados aquí y en los routers montados. */
    commands() {
        const found = [];
        for (const entry of this.#entries) {
            if (entry.kind === 'mount') {
                found.push(...entry.router.commands());
            }
            else if (entry.route.info.type === 'command') {
                found.push({
                    names: entry.route.info.names ?? [],
                    description: entry.route.info.description ?? null,
                    hidden: entry.route.info.hidden ?? false,
                });
            }
        }
        return found;
    }
    /** This router as a middleware: it answers when one of its handlers matches, otherwise it calls next(). / Este router como middleware: responde si uno de sus manejadores coincide; si no, llama a next(). */
    middleware() {
        const scoped = this.#scope === 'matched';
        return async (ctx, next) => {
            const dispatch = async () => {
                const found = this.#find(ctx);
                if (!found)
                    return next();
                const guards = scoped ? [...this.#guards, ...found.guards] : found.guards;
                await compose(guards)(ctx, async () => {
                    ctx.match = found.hit;
                    await found.route.handler(ctx);
                });
            };
            if (scoped)
                await dispatch();
            else
                await compose(this.#guards)(ctx, dispatch);
        };
    }
    #route(route) {
        this.#entries.push({ kind: 'route', route });
        return this;
    }
    #find(ctx) {
        for (const entry of this.#entries) {
            if (entry.kind === 'mount') {
                const inner = entry.router.#find(ctx);
                if (inner)
                    return { ...inner, guards: [...entry.router.#guards, ...inner.guards] };
                continue;
            }
            const hit = entry.route.match(ctx);
            if (hit) {
                return { route: entry.route, hit: Array.isArray(hit) ? hit : null, guards: [] };
            }
        }
        return null;
    }
}
