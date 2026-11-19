import type { ApiResult, Id } from '../types/entities.js';
import type { EditOptions, PollExtra, SendOptions } from '../types/options.js';
import { ApiCore } from './core.js';
export declare class MessagesApi {
    #private;
    constructor(core: ApiCore);
    /** Sends a text message. / Envía un mensaje de texto. */
    send<T = ApiResult>(chat: Id, text: string, options?: SendOptions): Promise<T>;
    /** Sends a block of code with its language. / Envía un bloque de código con su lenguaje. */
    sendCode<T = ApiResult>(chat: Id, code: string, lang?: string, options?: SendOptions): Promise<T>;
    /** Sends a location. / Envía una ubicación. */
    sendLocation<T = ApiResult>(chat: Id, lat: number, lng: number): Promise<T>;
    /** Sends a poll. / Envía una encuesta. */
    sendPoll<T = ApiResult>(chat: Id, question: string, options: readonly string[], extra?: PollExtra): Promise<T>;
    /** Edits the text and buttons of a message. / Edita el texto y los botones de un mensaje. */
    edit<T = ApiResult>(chat: Id, seq: number, text: string, options?: EditOptions): Promise<T>;
    /** Deletes a message (for everyone by default). / Borra un mensaje (para todos por defecto). */
    remove<T = ApiResult>(chat: Id, seq: number, forEveryone?: boolean): Promise<T>;
    /** Reacts to a message with an emoji. / Reacciona a un mensaje con un emoji. */
    react<T = ApiResult>(chat: Id, seq: number, emoji: string): Promise<T>;
    /** Pins a message. / Fija un mensaje. */
    pin<T = ApiResult>(chat: Id, seq: number): Promise<T>;
}
