import type { CallbackQuery, Chat, ContextKind, DeletedMessage, GroupEvent, Id, JoinRequest, Message, SessionData, Update, UpdateKind, User } from '../types/entities.js';
import type { DownloadOptions, FileInput, MediaOptions, PollExtra, SendOptions, StickerOptions } from '../types/options.js';
import type { Bot } from './bot.js';
export interface WaitOptions {
    timeoutMs?: number;
    filter?: (ctx: Context) => boolean;
}
export type ReplyOptions = SendOptions & {
    quote?: boolean;
};
export type AskOptions = ReplyOptions & WaitOptions;
/** What a handler receives: the update, who, where and short ways to answer. / Lo que recibe un manejador: la actualización, quién, dónde y formas cortas de responder. */
export declare class Context {
    #private;
    readonly bot: Bot;
    readonly update: Update;
    readonly type: UpdateKind;
    readonly message: Message | null;
    readonly callback: CallbackQuery | null;
    readonly data: string | null;
    readonly deleted: DeletedMessage | null;
    readonly joinRequest: JoinRequest | null;
    readonly chat: Chat;
    readonly from: User | null;
    readonly event: GroupEvent | null;
    readonly text: string;
    readonly command: string | null;
    readonly args: readonly string[];
    match: RegExpExecArray | null;
    state: Record<string, unknown>;
    session: SessionData;
    constructor(bot: Bot, update: Update);
    get chatId(): Id;
    get isGroup(): boolean;
    get isPrivate(): boolean;
    /** The author is the owner or an admin of the group. / El autor es dueño o admin del grupo. */
    get isAdmin(): boolean;
    /** The author is one of the `owners` of the bot. / El autor es uno de los `owners` del bot. */
    get isOwner(): boolean;
    /** The bot was mentioned. / Se mencionó al bot. */
    get mentionsMe(): boolean;
    /** What follows the command: «/play hello» → «hello». / Lo que sigue al comando: «/play hola» → «hola». */
    get argText(): string;
    /** Whether this update is of that kind (message, callback, join, leave, photo…). / Si esta actualización es de ese tipo (message, callback, join, leave, photo…). */
    is(kind: ContextKind): boolean;
    /** Answers in the same chat, quoting the message in groups (pass { quote: false } not to). / Responde en el mismo chat citando el mensaje en grupos (pasa { quote: false } para no hacerlo). */
    reply<T = Record<string, unknown>>(text: string, options?: ReplyOptions): Promise<T>;
    /** Answers a long text in several messages. / Responde un texto largo en varios mensajes. */
    replyLong(text: string, options?: ReplyOptions & {
        size?: number;
    }): Promise<unknown[]>;
    /** Answers with a block of code. / Responde con un bloque de código. */
    replyCode(code: string, lang?: string, options?: SendOptions): Promise<Record<string, unknown>>;
    replyPhoto(file: FileInput, options?: MediaOptions): Promise<Record<string, unknown>>;
    replyVideo(file: FileInput, options?: MediaOptions): Promise<Record<string, unknown>>;
    replyAudio(file: FileInput, options?: MediaOptions): Promise<Record<string, unknown>>;
    replyVoice(file: FileInput, options?: MediaOptions): Promise<Record<string, unknown>>;
    replyDocument(file: FileInput, options?: MediaOptions): Promise<Record<string, unknown>>;
    /** Answers with a sticker made from a picture or an animated GIF/WebP. / Responde con un sticker hecho de una imagen o un GIF/WebP animado. */
    replySticker(file: FileInput, options?: StickerOptions): Promise<Record<string, unknown>>;
    replyPoll(question: string, options: readonly string[], extra?: PollExtra): Promise<Record<string, unknown>>;
    replyLocation(lat: number, lng: number): Promise<Record<string, unknown>>;
    react(emoji: string): Promise<Record<string, unknown>>;
    /** Deletes the message (the bot must be an admin to delete someone else's). / Borra el mensaje (el bot debe ser admin para borrar el de otra persona). */
    delete(): Promise<Record<string, unknown>>;
    /** On a button: changes the bot message that holds it. / En un botón: cambia el mensaje del bot que lo tiene. */
    edit(text: string, options?: SendOptions): Promise<Record<string, unknown>>;
    /** The file of the message (a Buffer). / El archivo del mensaje (un Buffer). */
    download(index?: number, options?: DownloadOptions): Promise<Buffer>;
    /** The file of the message this one answers, or null. / El archivo del mensaje al que este responde, o null. */
    downloadQuoted(index?: number, options?: DownloadOptions): Promise<Buffer | null>;
    /** On a join request: lets the person in. / En una solicitud de ingreso: deja entrar a la persona. */
    approve(): Promise<Record<string, unknown>>;
    /** On a join request: refuses the person. / En una solicitud de ingreso: rechaza a la persona. */
    decline(): Promise<Record<string, unknown>>;
    closeGroup(): Promise<Record<string, unknown>>;
    openGroup(): Promise<Record<string, unknown>>;
    kick(userId: Id): Promise<Record<string, unknown>>;
    promote(userId: Id): Promise<Record<string, unknown>>;
    demote(userId: Id): Promise<Record<string, unknown>>;
    mute(userId: Id, minutes?: number): Promise<Record<string, unknown>>;
    unmute(userId: Id): Promise<Record<string, unknown>>;
    inviteLink(): Promise<Record<string, unknown>>;
    /** Waits for the next message of the same person in this chat; null if it does not come in time. / Espera el siguiente mensaje de la misma persona en este chat; null si no llega a tiempo. */
    waitNext(options?: WaitOptions): Promise<Context | null>;
    /** Asks something and waits for the answer. / Pregunta algo y espera la respuesta. */
    ask(text: string, options?: AskOptions): Promise<Context | null>;
}
