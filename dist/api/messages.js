import { METHOD } from '../protocol.js';
import { ApiCore, withRows } from './core.js';
export class MessagesApi {
    #core;
    constructor(core) {
        this.#core = core;
    }
    /** Sends a text message. / Envía un mensaje de texto. */
    send(chat, text, options = {}) {
        return this.#core.call(METHOD.sendMessage, { chatId: chat, text, ...withRows(options) });
    }
    /** Sends a block of code with its language. / Envía un bloque de código con su lenguaje. */
    sendCode(chat, code, lang = 'plaintext', options = {}) {
        return this.#core.call(METHOD.sendCode, { chatId: chat, code, lang, ...withRows(options) });
    }
    /** Sends a location. / Envía una ubicación. */
    sendLocation(chat, lat, lng) {
        return this.#core.call(METHOD.sendLocation, { chatId: chat, lat, lng });
    }
    /** Sends a poll. / Envía una encuesta. */
    sendPoll(chat, question, options, extra = {}) {
        return this.#core.call(METHOD.sendPoll, { chatId: chat, question, options, ...extra });
    }
    /** Edits the text and buttons of a message. / Edita el texto y los botones de un mensaje. */
    edit(chat, seq, text, options = {}) {
        return this.#core.call(METHOD.editMessage, { chatId: chat, seq, text, ...withRows(options) });
    }
    /** Deletes a message (for everyone by default). / Borra un mensaje (para todos por defecto). */
    remove(chat, seq, forEveryone = true) {
        return this.#core.call(METHOD.deleteMessage, { chatId: chat, seq, forEveryone });
    }
    /** Reacts to a message with an emoji. / Reacciona a un mensaje con un emoji. */
    react(chat, seq, emoji) {
        return this.#core.call(METHOD.react, { chatId: chat, seq, emoji });
    }
    /** Pins a message. / Fija un mensaje. */
    pin(chat, seq) {
        return this.#core.call(METHOD.pinMessage, { chatId: chat, seq });
    }
}
