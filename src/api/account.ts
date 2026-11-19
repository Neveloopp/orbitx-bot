import { METHOD } from '../protocol.js';
import type { ApiResult, BotAccount, User } from '../types/entities.js';
import type { AccountProfile, CommandSpec, FileInput, UserRef } from '../types/options.js';
import type { ApiCore } from './core.js';

export class AccountApi {
  readonly #core: ApiCore;

  constructor(core: ApiCore) {
    this.#core = core;
  }

  /** The account of this bot. / La cuenta de este bot. */
  me(): Promise<BotAccount> {
    return this.#core.read<BotAccount>('me', METHOD.getMe, {}, ['me']);
  }

  /** Publishes the list of commands of the bot. / Publica la lista de comandos del bot. */
  setCommands<T = ApiResult>(commands: readonly CommandSpec[]): Promise<T> {
    return this.#core.call<T>(METHOD.setCommands, { commands });
  }

  /** Changes the name or description of the bot. / Cambia el nombre o la descripción del bot. */
  async setProfile<T = ApiResult>(profile: AccountProfile): Promise<T> {
    try {
      return await this.#core.call<T>(METHOD.setMyProfile, profile);
    } finally {
      this.#core.reads.invalidate('me');
    }
  }

  /** Changes the profile picture of the bot. / Cambia la foto de perfil del bot. */
  async setPhoto<T = ApiResult>(file: FileInput): Promise<T> {
    try {
      return await this.#core.upload<T>(METHOD.setMyPhoto, {}, file);
    } finally {
      this.#core.reads.invalidate('me', 'photos');
    }
  }

  /** The public profile of a person. / El perfil público de una persona. */
  user(who: UserRef): Promise<User> {
    return this.#core.read<User>('user', METHOD.getUser, who, ['users']);
  }
}
