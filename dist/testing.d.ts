import type { Chat, Id, Update, User } from './types/entities.js';
export interface FakeOrigin {
    chat?: Partial<Chat> & {
        id?: Id;
    };
    from?: Partial<User> & {
        id?: Id;
    };
}
/** A message update to feed bot.handle() in tests. / Una actualización de mensaje para alimentar bot.handle() en pruebas. */
export declare function messageUpdate(text: string, options?: FakeOrigin & {
    kind?: string;
    seq?: number;
}): Update;
/** A button press update. / Una actualización de botón pulsado. */
export declare function callbackUpdate(data: string, options?: FakeOrigin): Update;
/** A join request update. / Una actualización de solicitud de ingreso. */
export declare function joinRequestUpdate(options?: FakeOrigin): Update;
export interface RecordedCall {
    method: string;
    params: Record<string, unknown>;
}
export type FakeRoutes = Record<string, (params: Record<string, unknown>) => unknown>;
/** A fetch that answers like the API and records every call. / Un fetch que responde como la API y registra cada llamada. */
export declare function fakeFetch(routes?: FakeRoutes): {
    fetch: typeof fetch;
    calls: RecordedCall[];
};
