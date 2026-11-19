import { METHOD } from '../protocol.js';
import type { ApiResult, Id, MemberRole } from '../types/entities.js';
import type { MemberQuery } from '../types/options.js';
import type { ApiCore } from './core.js';

export class MembersApi {
  readonly #core: ApiCore;

  constructor(core: ApiCore) {
    this.#core = core;
  }

  /** The members of a chat. / Los miembros de un chat. */
  list<T = unknown>(chat: Id, query: MemberQuery = {}): Promise<T> {
    return this.#core.read<T>('members', METHOD.getChatMembers, { chatId: chat, ...query }, [`chat:${chat}`]);
  }

  /** Removes a member (the bot must be an admin). / Expulsa a un miembro (el bot debe ser admin). */
  async remove<T = ApiResult>(chat: Id, user: Id): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.removeMember, { chatId: chat, userId: user });
    } finally {
      this.#core.reads.invalidate(`chat:${chat}`);
    }
  }

  /** Changes the role of a member. / Cambia el rol de un miembro. */
  async setRole<T = ApiResult>(chat: Id, user: Id, role: MemberRole): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.setMemberRole, { chatId: chat, userId: user, role });
    } finally {
      this.#core.reads.invalidate(`chat:${chat}`);
    }
  }

  /** Mutes a member for some minutes. / Silencia a un miembro por unos minutos. */
  async mute<T = ApiResult>(chat: Id, user: Id, minutes: number): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.muteMember, { chatId: chat, userId: user, minutes });
    } finally {
      this.#core.reads.invalidate(`chat:${chat}`);
    }
  }

  /** Lets a muted member write again. / Deja escribir de nuevo a un miembro silenciado. */
  async unmute<T = ApiResult>(chat: Id, user: Id): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.muteMember, { chatId: chat, userId: user, minutes: null });
    } finally {
      this.#core.reads.invalidate(`chat:${chat}`);
    }
  }
}
