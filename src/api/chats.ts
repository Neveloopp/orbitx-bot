import { METHOD } from '../protocol.js';
import type { ApiResult, Id } from '../types/entities.js';
import type { ChatInfo, ChatSettings, FileInput } from '../types/options.js';
import type { ApiCore } from './core.js';

export class ChatsApi {
  readonly #core: ApiCore;

  constructor(core: ApiCore) {
    this.#core = core;
  }

  /** The chats of the bot. / Los chats del bot. */
  list<T = unknown>(): Promise<T> {
    return this.#core.read<T>('chats', METHOD.getChats, {}, ['chats']);
  }

  /** One chat. / Un chat. */
  get<T = ApiResult>(chat: Id): Promise<T> {
    return this.#core.read<T>('chat', METHOD.getChat, { chatId: chat }, [`chat:${chat}`]);
  }

  /** Changes the settings of a group. / Cambia los ajustes de un grupo. */
  async settings<T = ApiResult>(chat: Id, settings: ChatSettings): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.setChatSettings, { chatId: chat, ...settings });
    } finally {
      this.#core.reads.invalidateChat(chat);
    }
  }

  /** Changes the name or description of a group. / Cambia el nombre o la descripción de un grupo. */
  async info<T = ApiResult>(chat: Id, info: ChatInfo): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.setChatInfo, { chatId: chat, ...info });
    } finally {
      this.#core.reads.invalidateChat(chat);
    }
  }

  /** Sets the picture of a group (the bot must be an admin). / Pone la foto de un grupo (el bot debe ser admin). */
  async photo<T = ApiResult>(chat: Id, file: FileInput): Promise<T> {
    try {
      return await this.#core.upload<T>(METHOD.setChatPhoto, { chatId: chat }, file);
    } finally {
      this.#core.reads.invalidateChat(chat);
    }
  }

  /** Only admins can write. / Solo los admins pueden escribir. */
  close<T = ApiResult>(chat: Id): Promise<T> {
    return this.settings<T>(chat, { sendMode: 'admins' });
  }

  /** Everybody can write. / Todos pueden escribir. */
  open<T = ApiResult>(chat: Id): Promise<T> {
    return this.settings<T>(chat, { sendMode: 'all' });
  }

  /** The invite link of a group. / El enlace de invitación de un grupo. */
  inviteLink<T = ApiResult>(chat: Id): Promise<T> {
    return this.#core.call<T>(METHOD.getInviteLink, { chatId: chat });
  }

  /** Makes a new invite link (the old one stops working). / Crea un enlace nuevo (el anterior deja de funcionar). */
  resetInviteLink<T = ApiResult>(chat: Id): Promise<T> {
    return this.#core.call<T>(METHOD.resetInviteLink, { chatId: chat });
  }

  /** The bot leaves the chat. / El bot sale del chat. */
  async leave<T = ApiResult>(chat: Id): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.leaveChat, { chatId: chat });
    } finally {
      this.#core.reads.invalidateChat(chat);
    }
  }

  /** Who asked to join a group. / Quién pidió entrar a un grupo. */
  joinRequests<T = unknown>(chat: Id): Promise<T> {
    return this.#core.call<T>(METHOD.getJoinRequests, { chatId: chat });
  }

  /** Accepts or refuses a request to join. / Acepta o rechaza una solicitud de ingreso. */
  async decideJoin<T = ApiResult>(chat: Id, user: Id, approve: boolean): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.decideJoinRequest, { chatId: chat, userId: user, approve });
    } finally {
      this.#core.reads.invalidateChat(chat);
    }
  }
}
