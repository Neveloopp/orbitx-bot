import type { ApiResult, Id } from '../types/entities.js';
import type { ChatInfo, ChatSettings, FileInput } from '../types/options.js';
import type { ApiCore } from './core.js';
export declare class ChatsApi {
    #private;
    constructor(core: ApiCore);
    /** The chats of the bot. / Los chats del bot. */
    list<T = unknown>(): Promise<T>;
    /** One chat. / Un chat. */
    get<T = ApiResult>(chat: Id): Promise<T>;
    /** Changes the settings of a group. / Cambia los ajustes de un grupo. */
    settings<T = ApiResult>(chat: Id, settings: ChatSettings): Promise<T>;
    /** Changes the name or description of a group. / Cambia el nombre o la descripción de un grupo. */
    info<T = ApiResult>(chat: Id, info: ChatInfo): Promise<T>;
    /** Sets the picture of a group (the bot must be an admin). / Pone la foto de un grupo (el bot debe ser admin). */
    photo<T = ApiResult>(chat: Id, file: FileInput): Promise<T>;
    /** Only admins can write. / Solo los admins pueden escribir. */
    close<T = ApiResult>(chat: Id): Promise<T>;
    /** Everybody can write. / Todos pueden escribir. */
    open<T = ApiResult>(chat: Id): Promise<T>;
    /** The invite link of a group. / El enlace de invitación de un grupo. */
    inviteLink<T = ApiResult>(chat: Id): Promise<T>;
    /** Makes a new invite link (the old one stops working). / Crea un enlace nuevo (el anterior deja de funcionar). */
    resetInviteLink<T = ApiResult>(chat: Id): Promise<T>;
    /** The bot leaves the chat. / El bot sale del chat. */
    leave<T = ApiResult>(chat: Id): Promise<T>;
    /** Who asked to join a group. / Quién pidió entrar a un grupo. */
    joinRequests<T = unknown>(chat: Id): Promise<T>;
    /** Accepts or refuses a request to join. / Acepta o rechaza una solicitud de ingreso. */
    decideJoin<T = ApiResult>(chat: Id, user: Id, approve: boolean): Promise<T>;
}
