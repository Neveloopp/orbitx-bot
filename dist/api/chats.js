import { METHOD } from '../protocol.js';
export class ChatsApi {
    #core;
    constructor(core) {
        this.#core = core;
    }
    /** The chats of the bot. / Los chats del bot. */
    list() {
        return this.#core.call(METHOD.getChats);
    }
    /** One chat. / Un chat. */
    get(chat) {
        return this.#core.call(METHOD.getChat, { chatId: chat });
    }
    /** Changes the settings of a group. / Cambia los ajustes de un grupo. */
    settings(chat, settings) {
        return this.#core.call(METHOD.setChatSettings, { chatId: chat, ...settings });
    }
    /** Changes the name or description of a group. / Cambia el nombre o la descripción de un grupo. */
    info(chat, info) {
        return this.#core.call(METHOD.setChatInfo, { chatId: chat, ...info });
    }
    /** Sets the picture of a group (the bot must be an admin). / Pone la foto de un grupo (el bot debe ser admin). */
    photo(chat, file) {
        return this.#core.upload(METHOD.setChatPhoto, { chatId: chat }, file);
    }
    /** Only admins can write. / Solo los admins pueden escribir. */
    close(chat) {
        return this.settings(chat, { sendMode: 'admins' });
    }
    /** Everybody can write. / Todos pueden escribir. */
    open(chat) {
        return this.settings(chat, { sendMode: 'all' });
    }
    /** The invite link of a group. / El enlace de invitación de un grupo. */
    inviteLink(chat) {
        return this.#core.call(METHOD.getInviteLink, { chatId: chat });
    }
    /** Makes a new invite link (the old one stops working). / Crea un enlace nuevo (el anterior deja de funcionar). */
    resetInviteLink(chat) {
        return this.#core.call(METHOD.resetInviteLink, { chatId: chat });
    }
    /** The bot leaves the chat. / El bot sale del chat. */
    leave(chat) {
        return this.#core.call(METHOD.leaveChat, { chatId: chat });
    }
    /** Who asked to join a group. / Quién pidió entrar a un grupo. */
    joinRequests(chat) {
        return this.#core.call(METHOD.getJoinRequests, { chatId: chat });
    }
    /** Accepts or refuses a request to join. / Acepta o rechaza una solicitud de ingreso. */
    decideJoin(chat, user, approve) {
        return this.#core.call(METHOD.decideJoinRequest, { chatId: chat, userId: user, approve });
    }
}
