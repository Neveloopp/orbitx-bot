import type { ApiResult, Id } from '../types/entities.js';
import type { DownloadOptions, FileInput, MediaOptions, StickerOptions, UserPhotoOptions, UserRef } from '../types/options.js';
import type { ApiCore } from './core.js';
export declare class MediaApi {
    #private;
    constructor(core: ApiCore);
    /** Sends a picture. / Envía una foto. */
    photo<T = ApiResult>(chat: Id, file: FileInput, options?: MediaOptions): Promise<T>;
    /** Sends a video. / Envía un video. */
    video<T = ApiResult>(chat: Id, file: FileInput, options?: MediaOptions): Promise<T>;
    /** Sends an audio file. / Envía un archivo de audio. */
    audio<T = ApiResult>(chat: Id, file: FileInput, options?: MediaOptions): Promise<T>;
    /** Sends a voice note. / Envía una nota de voz. */
    voice<T = ApiResult>(chat: Id, file: FileInput, options?: MediaOptions): Promise<T>;
    /** Sends a document. / Envía un documento. */
    document<T = ApiResult>(chat: Id, file: FileInput, options?: MediaOptions): Promise<T>;
    /** Makes a sticker from a picture or an animated GIF/WebP (10 s at most). / Crea un sticker desde una imagen o un GIF/WebP animado (máximo 10 s). */
    sticker<T = ApiResult>(chat: Id, file: FileInput, options?: StickerOptions): Promise<T>;
    /** The bytes of the file of a message. / Los bytes del archivo de un mensaje. */
    download(chat: Id, seq: number, index?: number, options?: DownloadOptions): Promise<Buffer>;
    /** The profile picture (or cover) of a person. / La foto de perfil (o portada) de una persona. */
    userPhoto(who: UserRef, options?: UserPhotoOptions): Promise<Buffer>;
}
