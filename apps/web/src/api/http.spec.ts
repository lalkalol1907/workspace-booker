import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, ApiError, getStoredToken, setStoredToken } from './http';
import { setTenantHeadersProvider } from './tenant-headers';

describe('getStoredToken / setStoredToken', () => {
  beforeEach(() => {
    localStorage.removeItem('booker_token');
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
});

describe('http', () => {
  beforeEach(() => {
    localStorage.removeItem('booker_token');
    setTenantHeadersProvider(() => ({}));
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

  it('does not set Authorization when no token', async () => {
    const spy = mockFetch({ ok: true });
    await http('/test');

    const req = spy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(req.headers);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('auto-sets Content-Type for string body', async () => {
    const spy = mockFetch({ ok: true });
    await http('/test', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    const req = spy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(req.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('includes tenant headers', async () => {
    setTenantHeadersProvider(() => ({ 'X-Org-Id': 'org-42' }));
    const spy = mockFetch({ ok: true });
    await http('/test');

    const req = spy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(req.headers);
    expect(headers.get('X-Org-Id')).toBe('org-42');
  });

  it('parses JSON response', async () => {
    mockFetch({ id: 1, name: 'test' });
    const result = await http<{ id: number; name: string }>('/test');
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('throws ApiError on non-ok response', async () => {
    mockFetch({ message: 'Not found' }, 404, 'Not Found');

    try {
      await http('/missing');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.message).toBe('Not found');
    }
  });

  it('uses statusText when response body has no message', async () => {
    mockFetch('plain error', 500, 'Internal Server Error');

    try {
      await http('/error');
      expect.fail('should have thrown');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(500);
    }
  });
});
