import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, ApiError, getStoredToken, setStoredToken } from './http';

describe('getStoredToken / setStoredToken', () => {
  beforeEach(() => {
    localStorage.removeItem('booker_platform_token');
  });

  it('returns null when no token stored', () => {
    expect(getStoredToken()).toBeNull();
  });

  it('stores and retrieves token', () => {
    setStoredToken('abc');
    expect(getStoredToken()).toBe('abc');
  });

  it('removes token when null', () => {
    setStoredToken('abc');
    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });

  it('uses booker_platform_token key', () => {
    setStoredToken('tok');
    expect(localStorage.getItem('booker_platform_token')).toBe('tok');
  });
});

describe('http', () => {
  beforeEach(() => {
    localStorage.removeItem('booker_platform_token');
    vi.restoreAllMocks();
  });

  function mockFetch(body: unknown, status = 200, statusText = 'OK') {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        statusText,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }

  it('prepends /api to path', async () => {
    const spy = mockFetch({ ok: true });
    await http('/users');
    expect(spy.mock.calls[0][0]).toBe('/api/users');
  });

  it('sets Authorization header when token exists', async () => {
    setStoredToken('my-token');
    const spy = mockFetch({ ok: true });
    await http('/test');

    const req = spy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(req.headers);
    expect(headers.get('Authorization')).toBe('Bearer my-token');
  });

  it('auto-sets Content-Type for string body', async () => {
    const spy = mockFetch({ ok: true });
    await http('/test', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    const req = spy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(req.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('parses JSON response', async () => {
    mockFetch({ id: 1, name: 'test' });
    const result = await http<{ id: number; name: string }>('/test');
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('throws ApiError on non-ok response', async () => {
    mockFetch({ message: 'Forbidden' }, 403, 'Forbidden');

    try {
      await http('/forbidden');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.message).toBe('Forbidden');
    }
  });
});
