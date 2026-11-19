import type { Chat, Id, Message, Update, User } from './types/entities.js';

export interface FakeOrigin {
  chat?: Partial<Chat> & { id?: Id };
  from?: Partial<User> & { id?: Id };
}

let counter = 0;

function origin(options: FakeOrigin): { chat: Chat; from: User } {
  return {
    chat: { id: 'chat-1', type: 'dm', name: null, ...options.chat },
    from: { id: 'user-1', handle: 'tester', role: 'member', ...options.from },
  };
}

/** A message update to feed bot.handle() in tests. / Una actualización de mensaje para alimentar bot.handle() en pruebas. */
export function messageUpdate(text: string, options: FakeOrigin & { kind?: string; seq?: number } = {}): Update {
  const { chat, from } = origin(options);
  const message: Message = {
    seq: options.seq ?? ++counter,
    chat,
    from,
    kind: options.kind ?? 'text',
    text,
    mentions: [],
  };
  return { updateId: ++counter, type: 'message', message };
}

/** A button press update. / Una actualización de botón pulsado. */
export function callbackUpdate(data: string, options: FakeOrigin = {}): Update {
  const { chat, from } = origin(options);
  const message: Message = { seq: ++counter, chat, from: { id: 'bot', handle: 'bot' }, kind: 'text', text: '' };
  return { updateId: ++counter, type: 'callback', callback: { data, from, message } };
}

/** A join request update. / Una actualización de solicitud de ingreso. */
export function joinRequestUpdate(options: FakeOrigin = {}): Update {
  const { chat, from } = origin({ ...options, chat: { type: 'group', ...options.chat } });
  return { updateId: ++counter, type: 'join_request', joinRequest: { chat, from } };
}

export interface RecordedCall {
  method: string;
  params: Record<string, unknown>;
}

export type FakeRoutes = Record<string, (params: Record<string, unknown>) => unknown>;

/** A fetch that answers like the API and records every call. / Un fetch que responde como la API y registra cada llamada. */
export function fakeFetch(routes: FakeRoutes = {}): { fetch: typeof fetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const impl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = url.pathname.split('/').pop() ?? '';
    const params: Record<string, unknown> =
      typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : Object.fromEntries(url.searchParams);
    calls.push({ method, params });
    const route = routes[method];
    const result = route ? route(params) : {};
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch: impl as typeof fetch, calls };
}
