import { METHOD } from '../protocol.js';
export class MembersApi {
    #core;
    constructor(core) {
        this.#core = core;
    }
    /** The members of a chat. / Los miembros de un chat. */
    list(chat, query = {}) {
        return this.#core.call(METHOD.getChatMembers, { chatId: chat, ...query });
    }
    /** Removes a member (the bot must be an admin). / Expulsa a un miembro (el bot debe ser admin). */
    remove(chat, user) {
        return this.#core.call(METHOD.removeMember, { chatId: chat, userId: user });
    }
    /** Changes the role of a member. / Cambia el rol de un miembro. */
    setRole(chat, user, role) {
        return this.#core.call(METHOD.setMemberRole, { chatId: chat, userId: user, role });
    }
    /** Mutes a member for some minutes. / Silencia a un miembro por unos minutos. */
    mute(chat, user, minutes) {
        return this.#core.call(METHOD.muteMember, { chatId: chat, userId: user, minutes });
    }
    /** Lets a muted member write again. / Deja escribir de nuevo a un miembro silenciado. */
    unmute(chat, user) {
        return this.#core.call(METHOD.muteMember, { chatId: chat, userId: user, minutes: null });
    }
}
