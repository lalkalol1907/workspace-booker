import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOrganizationDisplayName } from './useOrganizationDisplayName';
import { useAuthStore } from '@/stores/auth';
import { useTenantContextStore } from '@/stores/tenant-context';

describe('useOrganizationDisplayName', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('returns fallback when no user', () => {
    const name = useOrganizationDisplayName();
    expect(name.value).toBe('Организация');
  });

  it('returns organizationName for regular user', () => {
    const auth = useAuthStore();
    auth.user = {
      userId: '1',
      email: 'u@test.com',
      displayName: 'User',
      role: 'member',
      mustChangePassword: false,
      organizationName: 'Acme Corp',
    };

    const name = useOrganizationDisplayName();
    expect(name.value).toBe('Acme Corp');
  });

  it('returns fallback when regular user has no organizationName', () => {
    const auth = useAuthStore();
    auth.user = {
      userId: '1',
      email: 'u@test.com',
      displayName: 'User',
      role: 'member',
      mustChangePassword: false,
      organizationName: null,
    };

    const name = useOrganizationDisplayName();
    expect(name.value).toBe('Организация');
  });

  it('returns org name for super_admin with selected org', () => {
    const auth = useAuthStore();
    auth.user = {
      userId: '1',
      email: 'sa@test.com',
      displayName: 'SA',
      role: 'super_admin',
      mustChangePassword: false,
      organizationName: null,
    };

    const tenant = useTenantContextStore();
    tenant.organizations = [
      { id: 'org-1', name: 'Org One', slug: 'org-one', hosts: [], createdAt: '' },
    ];
    tenant.setSelectedOrgId('org-1');

    const name = useOrganizationDisplayName();
    expect(name.value).toBe('Org One');
  });

  it('returns fallback for super_admin with no selected org', () => {
    const auth = useAuthStore();
    auth.user = {
      userId: '1',
      email: 'sa@test.com',
      displayName: 'SA',
      role: 'super_admin',
      mustChangePassword: false,
      organizationName: null,
    };

    const name = useOrganizationDisplayName();
    expect(name.value).toBe('Организация');
  });
});
