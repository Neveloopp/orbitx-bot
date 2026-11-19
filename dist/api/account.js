import { METHOD } from '../protocol.js';
export class AccountApi {
    #core;
    constructor(core) {
        this.#core = core;
    }
    /** The account of this bot. / La cuenta de este bot. */
    me() {
        return this.#core.call(METHOD.getMe);
    }
    /** Publishes the list of commands of the bot. / Publica la lista de comandos del bot. */
    setCommands(commands) {
        return this.#core.call(METHOD.setCommands, { commands });
    }
    /** Changes the name or description of the bot. / Cambia el nombre o la descripción del bot. */
    setProfile(profile) {
        return this.#core.call(METHOD.setMyProfile, profile);
    }
    /** Changes the profile picture of the bot. / Cambia la foto de perfil del bot. */
    setPhoto(file) {
        return this.#core.upload(METHOD.setMyPhoto, {}, file);
    }
    /** The public profile of a person. / El perfil público de una persona. */
    user(who) {
        return this.#core.call(METHOD.getUser, who);
    }
}
