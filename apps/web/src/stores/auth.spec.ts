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

  it('isAuthenticated is true after setToken', () => {
    const store = useAuthStore();
    store.setToken('tok');
    expect(store.isAuthenticated).toBe(true);
  });

  it('isSuperAdmin reflects user role', () => {
    const store = useAuthStore();
    store.user = {
      userId: '1',
      email: 'sa@test.com',
      displayName: 'SA',
      role: 'super_admin',
      mustChangePassword: false,
      organizationName: null,
    };
    expect(store.isSuperAdmin).toBe(true);
  });

  it('isAdmin is true for admin and super_admin', () => {
    const store = useAuthStore();
    store.user = {
      userId: '1',
      email: 'a@test.com',
      displayName: 'A',
      role: 'admin',
      mustChangePassword: false,
      organizationName: null,
    };
    expect(store.isAdmin).toBe(true);

    store.user = { ...store.user, role: 'super_admin' };
    expect(store.isAdmin).toBe(true);

    store.user = { ...store.user, role: 'member' };
    expect(store.isAdmin).toBe(false);
  });

  it('login sets token and fetches user', async () => {
    mockedHttp
      .mockResolvedValueOnce({ accessToken: 'new-token' })
      .mockResolvedValueOnce({
        userId: '1',
        email: 'u@test.com',
        displayName: 'U',
        role: 'member',
        mustChangePassword: false,
        organizationName: 'Org',
      });

    const store = useAuthStore();
    await store.login({ email: 'u@test.com', password: 'pass' });

    expect(store.token).toBe('new-token');
    expect(store.user?.email).toBe('u@test.com');
    expect(setStoredToken).toHaveBeenCalledWith('new-token');
  });

  it('logout clears token and user', () => {
    const store = useAuthStore();
    store.token = 'tok';
    store.user = {
      userId: '1',
      email: 'u@test.com',
      displayName: 'U',
      role: 'member',
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
      email: 'u@test.com',
      displayName: 'U',
      role: 'member',
      mustChangePassword: false,
      organizationName: 'Org',
    });

    const store = useAuthStore();
    await store.bootstrap();

    expect(store.token).toBe('stored');
    expect(store.user?.email).toBe('u@test.com');
  });

  it('bootstrap clears token when fetchMe fails', async () => {
    vi.mocked(getStoredToken).mockReturnValue('bad-token');
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
