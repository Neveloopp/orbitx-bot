export const DEFAULT_BASE_URL = 'https://ctrl.orbitxspace.com';

export const ENDPOINT = '/apiuser/bot/v1';

export const KEY_PATTERN = /^oxb_[a-z0-9]{10}_[A-Za-z0-9]{40}$/;

export const UPDATE_KINDS = ['message', 'callback', 'deleted', 'join_request'] as const;

export const METHOD = {
  getMe: 'getMe',
  getUpdates: 'getUpdates',
  setCommands: 'setCommands',
  getChats: 'getChats',
  getChat: 'getChat',
  getChatMembers: 'getChatMembers',
  sendMessage: 'sendMessage',
  sendCode: 'sendCode',
  sendPhoto: 'sendPhoto',
  sendVideo: 'sendVideo',
  sendAudio: 'sendAudio',
  sendVoice: 'sendVoice',
  sendDocument: 'sendDocument',
  sendSticker: 'sendSticker',
  sendLocation: 'sendLocation',
  sendPoll: 'sendPoll',
  editMessage: 'editMessage',
  deleteMessage: 'deleteMessage',
  react: 'react',
  pinMessage: 'pinMessage',
  setChatSettings: 'setChatSettings',
  setChatInfo: 'setChatInfo',
  setChatPhoto: 'setChatPhoto',
  removeMember: 'removeMember',
  setMemberRole: 'setMemberRole',
  muteMember: 'muteMember',
  getInviteLink: 'getInviteLink',
  resetInviteLink: 'resetInviteLink',
  leaveChat: 'leaveChat',
  getJoinRequests: 'getJoinRequests',
  decideJoinRequest: 'decideJoinRequest',
  getUser: 'getUser',
  getUserPhoto: 'getUserPhoto',
  getFile: 'getFile',
  setMyProfile: 'setMyProfile',
  setMyPhoto: 'setMyPhoto',
} as const;

export const READ_ONLY_METHODS: ReadonlySet<string> = new Set([
  METHOD.getMe,
  METHOD.getChats,
  METHOD.getChat,
  METHOD.getChatMembers,
  METHOD.getJoinRequests,
  METHOD.getUser,
  METHOD.getUserPhoto,
  METHOD.getFile,
]);

export function methodUrl(baseUrl: string, method: string, query?: URLSearchParams): string {
  const suffix = query && [...query.keys()].length > 0 ? `?${query.toString()}` : '';
  return `${baseUrl}${ENDPOINT}/${method}${suffix}`;
}

export function authorization(key: string): string {
  return `Bearer ${key}`;
}
