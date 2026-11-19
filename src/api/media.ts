import { METHOD } from '../protocol.js';
import type { ApiResult, Id } from '../types/entities.js';
import type {
  DownloadOptions,
  FileInput,
  MediaOptions,
  StickerOptions,
  UserPhotoOptions,
  UserRef,
} from '../types/options.js';
import type { ApiCore } from './core.js';

export class MediaApi {
  readonly #core: ApiCore;

  constructor(core: ApiCore) {
    this.#core = core;
  }

  /** Sends a picture. / Envía una foto. */
  photo<T = ApiResult>(chat: Id, file: FileInput, options: MediaOptions = {}): Promise<T> {
    return this.#core.upload<T>(METHOD.sendPhoto, { chatId: chat, ...options }, file);
  }

  /** Sends a video. / Envía un video. */
  video<T = ApiResult>(chat: Id, file: FileInput, options: MediaOptions = {}): Promise<T> {
    return this.#core.upload<T>(METHOD.sendVideo, { chatId: chat, ...options }, file);
  }

  /** Sends an audio file. / Envía un archivo de audio. */
  audio<T = ApiResult>(chat: Id, file: FileInput, options: MediaOptions = {}): Promise<T> {
    return this.#core.upload<T>(METHOD.sendAudio, { chatId: chat, ...options }, file);
  }

  /** Sends a voice note. / Envía una nota de voz. */
  voice<T = ApiResult>(chat: Id, file: FileInput, options: MediaOptions = {}): Promise<T> {
    return this.#core.upload<T>(METHOD.sendVoice, { chatId: chat, ...options }, file);
  }

  /** Sends a document. / Envía un documento. */
  document<T = ApiResult>(chat: Id, file: FileInput, options: MediaOptions = {}): Promise<T> {
    return this.#core.upload<T>(METHOD.sendDocument, { chatId: chat, ...options }, file);
  }

  /** Makes a sticker from a picture or an animated GIF/WebP (10 s at most). / Crea un sticker desde una imagen o un GIF/WebP animado (máximo 10 s). */
  sticker<T = ApiResult>(chat: Id, file: FileInput, options: StickerOptions = {}): Promise<T> {
    return this.#core.upload<T>(METHOD.sendSticker, { chatId: chat, ...options }, file);
  }

  /** The bytes of the file of a message. / Los bytes del archivo de un mensaje. */
  download(chat: Id, seq: number, index = 0, options: DownloadOptions = {}): Promise<Buffer> {
    return this.#core.readBytes('file', METHOD.getFile, { chatId: chat, seq, index, ...options }, [`files:${chat}`]);
  }

  /** The profile picture (or cover) of a person. / La foto de perfil (o portada) de una persona. */
  userPhoto(who: UserRef, options: UserPhotoOptions = {}): Promise<Buffer> {
    return this.#core.readBytes('photo', METHOD.getUserPhoto, { ...who, ...options }, ['photos']);
  }
}
