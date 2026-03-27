import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth';

vi.mock('@/api/http', () => {
  let token: string | null = null;
  return {
    getStoredToken: vi.fn(() => token),
    setStoredToken: vi.fn((t: string | null) => { token = t; }),
    http: vi.fn(),
  };
});

import { http, getStoredToken, setStoredToken } from '@/api/http';

const mockedHttp = vi.mocked(http);

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('isAuthenticated is false initially', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
  });

  it('platformLogin sets token and fetches super_admin user', async () => {
    mockedHttp
      .mockResolvedValueOnce({ accessToken: 'sa-token' })
      .mockResolvedValueOnce({
        userId: '1',
        email: 'sa@test.com',
        displayName: 'SA',
        role: 'super_admin',
        mustChangePassword: false,
        organizationName: null,
      });

    const store = useAuthStore();
    await store.platformLogin({ email: 'sa@test.com', password: 'pass' });

    expect(store.token).toBe('sa-token');
    expect(store.user?.role).toBe('super_admin');
    expect(setStoredToken).toHaveBeenCalledWith('sa-token');
  });

  it('platformLogin rejects non-super_admin users', async () => {
    mockedHttp
      .mockResolvedValueOnce({ accessToken: 'bad-token' })
      .mockResolvedValueOnce({
        userId: '1',
        email: 'admin@test.com',
        displayName: 'Admin',
        role: 'admin',
        mustChangePassword: false,
        organizationName: 'Org',
      });

    const store = useAuthStore();

    await expect(
      store.platformLogin({ email: 'admin@test.com', password: 'pass' }),
    ).rejects.toThrow('forbidden role');
  });

  it('logout clears token and user', () => {
    const store = useAuthStore();
    store.token = 'tok';
    store.user = {
      userId: '1',
      email: 'sa@test.com',
      displayName: 'SA',
      role: 'super_admin',
      mustChangePassword: false,
      organizationName: null,
    };

    store.logout();

    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(setStoredToken).toHaveBeenCalledWith(null);
  });

  it('bootstrap restores session from stored token', async () => {
    vi.mocked(getStoredToken).mockReturnValue('stored');
    mockedHttp.mockResolvedValueOnce({
      userId: '1',
      email: 'sa@test.com',
      displayName: 'SA',
      role: 'super_admin',
      mustChangePassword: false,
      organizationName: null,
    });

    const store = useAuthStore();
    await store.bootstrap();

    expect(store.token).toBe('stored');
    expect(store.user?.email).toBe('sa@test.com');
  });

  it('bootstrap clears token when fetchMe fails', async () => {
    vi.mocked(getStoredToken).mockReturnValue('expired');
    mockedHttp.mockRejectedValueOnce(new Error('unauthorized'));

    const store = useAuthStore();
    await store.bootstrap();

    expect(store.token).toBeNull();
    expect(setStoredToken).toHaveBeenCalledWith(null);
  });

  it('bootstrap does nothing when no stored token', async () => {
    vi.mocked(getStoredToken).mockReturnValue(null);

    const store = useAuthStore();
    await store.bootstrap();

    expect(store.token).toBeNull();
    expect(mockedHttp).not.toHaveBeenCalled();
  });
});
