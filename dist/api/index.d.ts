import type { ResolvedConfig } from '../config.js';
import { Transport } from '../http/transport.js';
import { AccountApi } from './account.js';
import { ChatsApi } from './chats.js';
import { MediaApi } from './media.js';
import { MembersApi } from './members.js';
import { MessagesApi } from './messages.js';
export declare class Api {
    #private;
    readonly messages: MessagesApi;
    readonly media: MediaApi;
    readonly chats: ChatsApi;
    readonly members: MembersApi;
    readonly account: AccountApi;
    constructor(config: ResolvedConfig);
    /** Calls any method of the bot API by its name. / Llama a cualquier método de la API de bots por su nombre. */
    call<T = unknown>(method: string, params?: object): Promise<T>;
    get transport(): Transport;
}
