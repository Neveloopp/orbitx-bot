import { METHOD } from '../protocol.js';
import type { ApiResult, Id } from '../types/entities.js';
import type { EditOptions, PollExtra, SendOptions } from '../types/options.js';
import { ApiCore, withRows } from './core.js';

export class MessagesApi {
  readonly #core: ApiCore;

  constructor(core: ApiCore) {
    this.#core = core;
  }

  /** Sends a text message. / Envía un mensaje de texto. */
  send<T = ApiResult>(chat: Id, text: string, options: SendOptions = {}): Promise<T> {
    return this.#core.call<T>(METHOD.sendMessage, { chatId: chat, text, ...withRows(options) });
  }

  /** Sends a block of code with its language. / Envía un bloque de código con su lenguaje. */
  sendCode<T = ApiResult>(chat: Id, code: string, lang = 'plaintext', options: SendOptions = {}): Promise<T> {
    return this.#core.call<T>(METHOD.sendCode, { chatId: chat, code, lang, ...withRows(options) });
  }

  /** Sends a location. / Envía una ubicación. */
  sendLocation<T = ApiResult>(chat: Id, lat: number, lng: number): Promise<T> {
    return this.#core.call<T>(METHOD.sendLocation, { chatId: chat, lat, lng });
  }

  /** Sends a poll. / Envía una encuesta. */
  sendPoll<T = ApiResult>(chat: Id, question: string, options: readonly string[], extra: PollExtra = {}): Promise<T> {
    return this.#core.call<T>(METHOD.sendPoll, { chatId: chat, question, options, ...extra });
  }

  /** Edits the text and buttons of a message. / Edita el texto y los botones de un mensaje. */
  edit<T = ApiResult>(chat: Id, seq: number, text: string, options: EditOptions = {}): Promise<T> {
    return this.#core.call<T>(METHOD.editMessage, { chatId: chat, seq, text, ...withRows(options) });
  }

  /** Deletes a message (for everyone by default). / Borra un mensaje (para todos por defecto). */
  async remove<T = ApiResult>(chat: Id, seq: number, forEveryone = true): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.deleteMessage, { chatId: chat, seq, forEveryone });
    } finally {
      this.#core.reads.invalidate(`files:${chat}`);
    }
  }

  /** Reacts to a message with an emoji. / Reacciona a un mensaje con un emoji. */
  react<T = ApiResult>(chat: Id, seq: number, emoji: string): Promise<T> {
    return this.#core.call<T>(METHOD.react, { chatId: chat, seq, emoji });
  }

  /** Pins a message. / Fija un mensaje. */
  pin<T = ApiResult>(chat: Id, seq: number): Promise<T> {
    return this.#core.call<T>(METHOD.pinMessage, { chatId: chat, seq });
  }
}
