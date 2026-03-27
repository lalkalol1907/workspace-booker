import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTenantContextStore } from './tenant-context';

vi.mock('@/api/http', () => ({
  http: vi.fn(),
}));

import { http } from '@/api/http';

const mockedHttp = vi.mocked(http);

describe('useTenantContextStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.removeItem('booker_selected_org_id');
    vi.clearAllMocks();
  });

  it('setSelectedOrgId persists to localStorage', () => {
    const store = useTenantContextStore();
    store.setSelectedOrgId('org-1');
    expect(store.selectedOrgId).toBe('org-1');
    expect(localStorage.getItem('booker_selected_org_id')).toBe('org-1');
  });

  it('setSelectedOrgId(null) removes from localStorage', () => {
    const store = useTenantContextStore();
    store.setSelectedOrgId('org-1');
    store.setSelectedOrgId(null);
    expect(store.selectedOrgId).toBeNull();
    expect(localStorage.getItem('booker_selected_org_id')).toBeNull();
  });

  it('hasSelectedOrg is computed', () => {
    const store = useTenantContextStore();
    expect(store.hasSelectedOrg).toBe(false);
    store.setSelectedOrgId('org-1');
    expect(store.hasSelectedOrg).toBe(true);
  });

  it('clear resets organizations and selectedOrgId', () => {
    const store = useTenantContextStore();
    store.organizations = [
      { id: 'o1', name: 'O1', slug: 's1', hosts: [], createdAt: '' },
    ];
    store.setSelectedOrgId('o1');

    store.clear();

    expect(store.organizations).toEqual([]);
    expect(store.selectedOrgId).toBeNull();
  });

  it('ensureLoadedForSuperAdmin loads and selects by host', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const { useAuthStore } = await import('@/stores/auth');
    const auth = useAuthStore();
    auth.user = {
      userId: '1',
      email: 'sa@test.com',
      displayName: 'SA',
      role: 'super_admin',
      mustChangePassword: false,
      organizationName: null,
    };

    const orgs = [
      { id: 'o1', name: 'Org 1', slug: 's1', hosts: ['org1.example.com'], createdAt: '' },
      { id: 'o2', name: 'Org 2', slug: 's2', hosts: ['localhost'], createdAt: '' },
    ];
    mockedHttp.mockResolvedValueOnce(orgs);

    const store = useTenantContextStore();
    await store.ensureLoadedForSuperAdmin();

    expect(store.organizations).toEqual(orgs);
    expect(store.selectedOrgId).toBe('o2');
  });

  it('ensureLoadedForSuperAdmin does nothing for non-super_admin', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const { useAuthStore } = await import('@/stores/auth');
    const auth = useAuthStore();
    auth.user = {
      userId: '1',
      email: 'a@test.com',
      displayName: 'A',
      role: 'admin',
      mustChangePassword: false,
      organizationName: null,
    };

    const store = useTenantContextStore();
    await store.ensureLoadedForSuperAdmin();

    expect(mockedHttp).not.toHaveBeenCalled();
  });
});
