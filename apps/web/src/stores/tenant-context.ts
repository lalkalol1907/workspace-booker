import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { http } from '@/api/http';
import type { OrganizationSummary } from '@/api/types';

const STORAGE_KEY = 'booker_selected_org_id';

export const useTenantContextStore = defineStore('tenantContext', () => {
  const selectedOrgId = ref<string | null>(
    localStorage.getItem(STORAGE_KEY),
  );
  const organizations = ref<OrganizationSummary[]>([]);

  const hasSelectedOrg = computed(
    () => Boolean(selectedOrgId.value),
  );

  function setSelectedOrgId(id: string | null) {
    selectedOrgId.value = id;
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function clear() {
    organizations.value = [];
    setSelectedOrgId(null);
  }

  /** Load tenants for super_admin and ensure a valid X-Organization-Id target. */
  async function ensureLoadedForSuperAdmin(): Promise<void> {
    const list = await http<OrganizationSummary[]>(
      '/platform/organizations',
    );
    organizations.value = list;
    if (list.length === 0) {
      setSelectedOrgId(null);
      return;
    }
    const saved = selectedOrgId.value;
    const valid = saved && list.some((o) => o.id === saved);
    if (!valid) {
      setSelectedOrgId(list[0].id);
    }
  }

  return {
    selectedOrgId,
    organizations,
    hasSelectedOrg,
    setSelectedOrgId,
    clear,
    ensureLoadedForSuperAdmin,
  };
});
