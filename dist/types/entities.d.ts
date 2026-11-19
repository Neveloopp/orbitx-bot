export type Id = string | number;
export type ChatKind = 'group' | 'dm';
export type MemberRole = 'owner' | 'admin' | 'member';
export type UpdateKind = 'message' | 'callback' | 'deleted' | 'join_request';
export type ApiResult = Record<string, unknown>;
export interface User {
    id: Id;
    handle?: string | null;
    name?: string | null;
    role?: MemberRole | null;
    [key: string]: unknown;
}
export interface Chat {
    id: Id;
    type: ChatKind;
    name: string | null;
    [key: string]: unknown;
}
export interface GroupEvent {
    type: string;
    [key: string]: unknown;
}
export interface QuotedMessage {
    seq: number;
    [key: string]: unknown;
}
export interface Message {
    seq: number;
    chat: Chat;
    from: User;
    kind: string;
    text?: string | null;
    event?: GroupEvent | null;
    mentions?: Id[];
    replyTo?: QuotedMessage | null;
    [key: string]: unknown;
}
export interface CallbackQuery {
    data: string;
    from: User;
    message: Message;
}
export interface DeletedMessage {
    chat: Chat;
    seq: number;
    by: User | null;
}
export interface JoinRequest {
    chat: Chat;
    from: User;
}
export interface Update {
    updateId: number;
    type: UpdateKind;
    message?: Message;
    callback?: CallbackQuery;
    deleted?: DeletedMessage;
    joinRequest?: JoinRequest;
}
export interface BotAccount {
    id: Id;
    handle?: string | null;
    name?: string | null;
    [key: string]: unknown;
}
export type ContextKind = 'message' | 'callback' | 'deleted' | 'join_request' | 'event' | 'join' | 'leave' | (string & {});
export interface SessionData {
    [key: string]: unknown;
}
