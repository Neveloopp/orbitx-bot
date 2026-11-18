import type { ApiResult, Id, MemberRole } from '../types/entities.js';
import type { MemberQuery } from '../types/options.js';
import type { ApiCore } from './core.js';
export declare class MembersApi {
    #private;
    constructor(core: ApiCore);
    /** The members of a chat. / Los miembros de un chat. */
    list<T = unknown>(chat: Id, query?: MemberQuery): Promise<T>;
    /** Removes a member (the bot must be an admin). / Expulsa a un miembro (el bot debe ser admin). */
    remove<T = ApiResult>(chat: Id, user: Id): Promise<T>;
    /** Changes the role of a member. / Cambia el rol de un miembro. */
    setRole<T = ApiResult>(chat: Id, user: Id, role: MemberRole): Promise<T>;
    /** Mutes a member for some minutes. / Silencia a un miembro por unos minutos. */
    mute<T = ApiResult>(chat: Id, user: Id, minutes: number): Promise<T>;
    /** Lets a muted member write again. / Deja escribir de nuevo a un miembro silenciado. */
    unmute<T = ApiResult>(chat: Id, user: Id): Promise<T>;
}
