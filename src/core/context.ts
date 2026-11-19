import { StateError } from '../errors.js';
import type {
  CallbackQuery,
  Chat,
  ContextKind,
  DeletedMessage,
  GroupEvent,
  Id,
  JoinRequest,
  Message,
  SessionData,
  Update,
  UpdateKind,
  User,
} from '../types/entities.js';
import type {
  DownloadOptions,
  FileInput,
  MediaOptions,
  PollExtra,
  SendOptions,
  StickerOptions,
} from '../types/options.js';
import { splitText } from '../utils/text.js';
import type { Bot } from './bot.js';

export interface WaitOptions {
  timeoutMs?: number;
  filter?: (ctx: Context) => boolean;
}

export type ReplyOptions = SendOptions & { quote?: boolean };

export type AskOptions = ReplyOptions & WaitOptions;

const JOIN_EVENTS = ['member_added', 'member_joined', 'member_readmitted'];

const LEAVE_EVENTS = ['member_left', 'member_removed'];

/** What a handler receives: the update, who, where and short ways to answer. / Lo que recibe un manejador: la actualización, quién, dónde y formas cortas de responder. */
export class Context {
  readonly bot: Bot;
  readonly update: Update;
  readonly type: UpdateKind;
  readonly message: Message | null;
  readonly callback: CallbackQuery | null;
  readonly data: string | null;
  readonly deleted: DeletedMessage | null;
  readonly joinRequest: JoinRequest | null;
  readonly chat: Chat;
  readonly from: User | null;
  readonly event: GroupEvent | null;
  readonly text: string;
  readonly command: string | null;
  readonly args: readonly string[];
  match: RegExpExecArray | null = null;
  state: Record<string, unknown> = {};
  session: SessionData = {};

  constructor(bot: Bot, update: Update) {
    this.bot = bot;
    this.update = update;
    this.type = update.type;
    this.callback = update.callback ?? null;
    this.message = update.type === 'callback' ? (update.callback?.message ?? null) : (update.message ?? null);
    this.data = update.callback?.data ?? null;
    this.deleted = update.deleted ?? null;
    this.joinRequest = update.joinRequest ?? null;
    this.chat =
      this.message?.chat ??
      this.deleted?.chat ??
      this.joinRequest?.chat ?? { id: '', type: 'group', name: null };
    this.from =
      this.callback?.from ?? this.message?.from ?? this.deleted?.by ?? this.joinRequest?.from ?? null;
    this.event = this.message?.event ?? null;
    this.text = update.type === 'message' ? (this.message?.text ?? '') : '';

    let command: string | null = null;
    let args: string[] = [];
    const prefix = bot.config.prefixes.find((p) => this.text.startsWith(p));
    if (prefix !== undefined && this.text.trim().length > prefix.length) {
      const [head = '', ...rest] = this.text.slice(prefix.length).trim().split(/\s+/);
      command = head.toLowerCase().replace(/@[\w.]+$/, '') || null;
      args = rest;
    }
    this.command = command;
    this.args = args;
  }

  get chatId(): Id {
    return this.chat.id;
  }

  get isGroup(): boolean {
    return this.chat.type === 'group';
  }

  get isPrivate(): boolean {
    return this.chat.type === 'dm';
  }

  /** The author is the owner or an admin of the group. / El autor es dueño o admin del grupo. */
  get isAdmin(): boolean {
    return this.from?.role === 'owner' || this.from?.role === 'admin';
  }

  /** The author is one of the `owners` of the bot. / El autor es uno de los `owners` del bot. */
  get isOwner(): boolean {
    const from = this.from;
    if (!from) return false;
    const owners = this.bot.config.owners;
    return owners.has(String(from.id).toLowerCase()) || (from.handle != null && owners.has(String(from.handle).toLowerCase()));
  }

  /** The bot was mentioned. / Se mencionó al bot. */
  get mentionsMe(): boolean {
    const me = this.bot.me;
    return Boolean(me && this.message?.mentions?.some((id) => String(id) === String(me.id)));
  }

  /** What follows the command: «/play hello» → «hello». / Lo que sigue al comando: «/play hola» → «hola». */
  get argText(): string {
    return this.args.join(' ');
  }

  /** Whether this update is of that kind (message, callback, join, leave, photo…). / Si esta actualización es de ese tipo (message, callback, join, leave, photo…). */
  is(kind: ContextKind): boolean {
    switch (kind) {
      case 'message':
        return this.type === 'message' && !this.event;
      case 'callback':
      case 'deleted':
      case 'join_request':
        return this.type === kind;
      case 'event':
        return Boolean(this.event);
      case 'join':
        return JOIN_EVENTS.includes(this.event?.type ?? '');
      case 'leave':
        return LEAVE_EVENTS.includes(this.event?.type ?? '');
      default:
        return this.message?.kind === kind;
    }
  }

  #seq(): number {
    if (!this.message) throw new StateError('NO_MESSAGE', `a ${this.type} update has no message`);
    return this.message.seq;
  }

  /** Answers in the same chat, quoting the message in groups (pass { quote: false } not to). / Responde en el mismo chat citando el mensaje en grupos (pasa { quote: false } para no hacerlo). */
  reply<T = Record<string, unknown>>(text: string, options: ReplyOptions = {}): Promise<T> {
    const { quote = this.type === 'message' && this.isGroup, ...rest } = options;
    const replyTo = quote && !this.event && this.message ? { replyTo: this.message.seq } : {};
    return this.bot.api.messages.send<T>(this.chatId, text, { ...replyTo, ...rest });
  }

  /** Answers a long text in several messages. / Responde un texto largo en varios mensajes. */
  async replyLong(text: string, options: ReplyOptions & { size?: number } = {}): Promise<unknown[]> {
    const { size, ...rest } = options;
    const sent: unknown[] = [];
    let first = true;
    for (const part of splitText(text, size)) {
      sent.push(await this.reply(part, first ? rest : { ...rest, quote: false, buttons: undefined }));
      first = false;
    }
    return sent;
  }

  /** Answers with a block of code. / Responde con un bloque de código. */
  replyCode(code: string, lang = 'plaintext', options: SendOptions = {}): Promise<Record<string, unknown>> {
    return this.bot.api.messages.sendCode(this.chatId, code, lang, options);
  }

  replyPhoto(file: FileInput, options: MediaOptions = {}): Promise<Record<string, unknown>> {
    return this.bot.api.media.photo(this.chatId, file, options);
  }

  replyVideo(file: FileInput, options: MediaOptions = {}): Promise<Record<string, unknown>> {
    return this.bot.api.media.video(this.chatId, file, options);
  }

  replyAudio(file: FileInput, options: MediaOptions = {}): Promise<Record<string, unknown>> {
    return this.bot.api.media.audio(this.chatId, file, options);
  }

  replyVoice(file: FileInput, options: MediaOptions = {}): Promise<Record<string, unknown>> {
    return this.bot.api.media.voice(this.chatId, file, options);
  }

  replyDocument(file: FileInput, options: MediaOptions = {}): Promise<Record<string, unknown>> {
    return this.bot.api.media.document(this.chatId, file, options);
  }

  /** Answers with a sticker made from a picture or an animated GIF/WebP. / Responde con un sticker hecho de una imagen o un GIF/WebP animado. */
  replySticker(file: FileInput, options: StickerOptions = {}): Promise<Record<string, unknown>> {
    return this.bot.api.media.sticker(this.chatId, file, options);
  }

  replyPoll(question: string, options: readonly string[], extra: PollExtra = {}): Promise<Record<string, unknown>> {
    return this.bot.api.messages.sendPoll(this.chatId, question, options, extra);
  }

  replyLocation(lat: number, lng: number): Promise<Record<string, unknown>> {
    return this.bot.api.messages.sendLocation(this.chatId, lat, lng);
  }

  react(emoji: string): Promise<Record<string, unknown>> {
    return this.bot.api.messages.react(this.chatId, this.#seq(), emoji);
  }

  /** Deletes the message (the bot must be an admin to delete someone else's). / Borra el mensaje (el bot debe ser admin para borrar el de otra persona). */
  delete(): Promise<Record<string, unknown>> {
    return this.bot.api.messages.remove(this.chatId, this.#seq(), true);
  }

  /** On a button: changes the bot message that holds it. / En un botón: cambia el mensaje del bot que lo tiene. */
  edit(text: string, options: SendOptions = {}): Promise<Record<string, unknown>> {
    return this.bot.api.messages.edit(this.chatId, this.#seq(), text, options);
  }

  /** The file of the message (a Buffer). / El archivo del mensaje (un Buffer). */
  download(index = 0, options: DownloadOptions = {}): Promise<Buffer> {
    return this.bot.api.media.download(this.chatId, this.#seq(), index, options);
  }

  /** The file of the message this one answers, or null. / El archivo del mensaje al que este responde, o null. */
  async downloadQuoted(index = 0, options: DownloadOptions = {}): Promise<Buffer | null> {
    const quoted = this.message?.replyTo;
    if (!quoted) return null;
    return this.bot.api.media.download(this.chatId, quoted.seq, index, options);
  }

  /** On a join request: lets the person in. / En una solicitud de ingreso: deja entrar a la persona. */
  approve(): Promise<Record<string, unknown>> {
    return this.bot.api.chats.decideJoin(this.chatId, this.#requester(), true);
  }

  /** On a join request: refuses the person. / En una solicitud de ingreso: rechaza a la persona. */
  decline(): Promise<Record<string, unknown>> {
    return this.bot.api.chats.decideJoin(this.chatId, this.#requester(), false);
  }

  #requester(): Id {
    if (!this.joinRequest) throw new StateError('NO_JOIN_REQUEST', `a ${this.type} update is not a join request`);
    return this.joinRequest.from.id;
  }

  closeGroup(): Promise<Record<string, unknown>> {
    return this.bot.api.chats.close(this.chatId);
  }

  openGroup(): Promise<Record<string, unknown>> {
    return this.bot.api.chats.open(this.chatId);
  }

  kick(userId: Id): Promise<Record<string, unknown>> {
    return this.bot.api.members.remove(this.chatId, userId);
  }

  promote(userId: Id): Promise<Record<string, unknown>> {
    return this.bot.api.members.setRole(this.chatId, userId, 'admin');
  }

  demote(userId: Id): Promise<Record<string, unknown>> {
    return this.bot.api.members.setRole(this.chatId, userId, 'member');
  }

  mute(userId: Id, minutes = 60): Promise<Record<string, unknown>> {
    return this.bot.api.members.mute(this.chatId, userId, minutes);
  }

  unmute(userId: Id): Promise<Record<string, unknown>> {
    return this.bot.api.members.unmute(this.chatId, userId);
  }

  inviteLink(): Promise<Record<string, unknown>> {
    return this.bot.api.chats.inviteLink(this.chatId);
  }

  /** Waits for the next message of the same person in this chat; null if it does not come in time. / Espera el siguiente mensaje de la misma persona en este chat; null si no llega a tiempo. */
  waitNext(options: WaitOptions = {}): Promise<Context | null> {
    return this.bot.waitFor(this, options);
  }

  /** Asks something and waits for the answer. / Pregunta algo y espera la respuesta. */
  ask(text: string, options: AskOptions = {}): Promise<Context | null> {
    const { timeoutMs, filter, ...reply } = options;
    const wait: WaitOptions = {
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      ...(filter === undefined ? {} : { filter }),
    };
    const answer = this.bot.waitFor(this, wait);
    return this.reply(text, reply).then(
      () => answer,
      (error: unknown) => {
        this.bot.cancelWait(this);
        throw error;
      },
    );
  }
}
