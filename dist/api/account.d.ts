import type { ApiResult, BotAccount, User } from '../types/entities.js';
import type { AccountProfile, CommandSpec, FileInput, UserRef } from '../types/options.js';
import type { ApiCore } from './core.js';
export declare class AccountApi {
    #private;
    constructor(core: ApiCore);
    /** The account of this bot. / La cuenta de este bot. */
    me(): Promise<BotAccount>;
    /** Publishes the list of commands of the bot. / Publica la lista de comandos del bot. */
    setCommands<T = ApiResult>(commands: readonly CommandSpec[]): Promise<T>;
    /** Changes the name or description of the bot. / Cambia el nombre o la descripción del bot. */
    setProfile<T = ApiResult>(profile: AccountProfile): Promise<T>;
    /** Changes the profile picture of the bot. / Cambia la foto de perfil del bot. */
    setPhoto<T = ApiResult>(file: FileInput): Promise<T>;
    /** The public profile of a person. / El perfil público de una persona. */
    user(who: UserRef): Promise<User>;
}
