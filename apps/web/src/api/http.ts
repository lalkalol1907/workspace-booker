import { getTenantHeaders } from './tenant-headers';

const TOKEN_KEY = 'booker_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token === null) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/** Достаёт errorCode из тела ответа Nest (в т.ч. вложенного в message). */
export function parseErrorCodeFromBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const o = body as Record<string, unknown>;
  if (typeof o.errorCode === 'string') return o.errorCode;
  if (
    typeof o.message === 'object' &&
    o.message !== null &&
    !Array.isArray(o.message)
  ) {
    const m = o.message as Record<string, unknown>;
    if (typeof m.errorCode === 'string') return m.errorCode;
  }
  return null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string | null;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.errorCode = parseErrorCodeFromBody(body);
  }
}

/** Надёжнее, чем instanceof, при дублировании бандла модулей. */
export function isApiError(e: unknown): e is ApiError {
  if (e instanceof ApiError) return true;
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { name?: unknown }).name === 'ApiError' &&
    typeof (e as { status?: unknown }).status === 'number'
  );
}

export async function http<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  for (const [k, v] of Object.entries(getTenantHeaders())) {
    if (v && !headers.has(k)) {
      headers.set(k, v);
    }
  }
  if (
    init.body &&
    typeof init.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`/api${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : res.statusText;
    throw new ApiError(msg || 'Request failed', res.status, data);
  }
  return data as T;
}
