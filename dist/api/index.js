import { Transport } from '../http/transport.js';
import { AccountApi } from './account.js';
import { ChatsApi } from './chats.js';
import { ApiCore } from './core.js';
import { MediaApi } from './media.js';
import { MembersApi } from './members.js';
import { MessagesApi } from './messages.js';
export class Api {
    messages;
    media;
    chats;
    members;
    account;
    #core;
    constructor(config) {
        const transport = new Transport({
            baseUrl: config.baseUrl,
            key: config.key,
            timeoutMs: config.request.timeoutMs,
            retries: config.request.retries,
            headers: config.request.headers,
            fetch: config.request.fetch,
            logger: config.logger,
        });
        this.#core = new ApiCore(config, transport);
        this.messages = new MessagesApi(this.#core);
        this.media = new MediaApi(this.#core);
        this.chats = new ChatsApi(this.#core);
        this.members = new MembersApi(this.#core);
        this.account = new AccountApi(this.#core);
    }
    /** Calls any method of the bot API by its name. / Llama a cualquier método de la API de bots por su nombre. */
    call(method, params = {}) {
        return this.#core.call(method, params);
    }
    get transport() {
        return this.#core.transport;
    }
}
