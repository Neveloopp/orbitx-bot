import { METHOD } from '../protocol.js';
export class MediaApi {
    #core;
    constructor(core) {
        this.#core = core;
    }
    /** Sends a picture. / Envía una foto. */
    photo(chat, file, options = {}) {
        return this.#core.upload(METHOD.sendPhoto, { chatId: chat, ...options }, file);
    }
    /** Sends a video. / Envía un video. */
    video(chat, file, options = {}) {
        return this.#core.upload(METHOD.sendVideo, { chatId: chat, ...options }, file);
    }
    /** Sends an audio file. / Envía un archivo de audio. */
    audio(chat, file, options = {}) {
        return this.#core.upload(METHOD.sendAudio, { chatId: chat, ...options }, file);
    }
    /** Sends a voice note. / Envía una nota de voz. */
    voice(chat, file, options = {}) {
        return this.#core.upload(METHOD.sendVoice, { chatId: chat, ...options }, file);
    }
    /** Sends a document. / Envía un documento. */
    document(chat, file, options = {}) {
        return this.#core.upload(METHOD.sendDocument, { chatId: chat, ...options }, file);
    }
    /** Makes a sticker from a picture or an animated GIF/WebP (10 s at most). / Crea un sticker desde una imagen o un GIF/WebP animado (máximo 10 s). */
    sticker(chat, file, options = {}) {
        return this.#core.upload(METHOD.sendSticker, { chatId: chat, ...options }, file);
    }
    /** The bytes of the file of a message. / Los bytes del archivo de un mensaje. */
    download(chat, seq, index = 0, options = {}) {
        return this.#core.bytes(METHOD.getFile, { chatId: chat, seq, index, ...options });
    }
    /** The profile picture (or cover) of a person. / La foto de perfil (o portada) de una persona. */
    userPhoto(who, options = {}) {
        return this.#core.bytes(METHOD.getUserPhoto, { ...who, ...options });
    }
}
