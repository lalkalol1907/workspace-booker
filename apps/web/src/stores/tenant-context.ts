import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { http } from '@/api/http';
import type { OrganizationSummary } from '@/api/types';
import { useAuthStore } from '@/stores/auth';

const STORAGE_KEY = 'booker_selected_org_id';

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/:\d+$/, '');
}

export const useTenantContextStore = defineStore('tenantContext', () => {
  const selectedOrgId = ref<string | null>(localStorage.getItem(STORAGE_KEY));
  const organizations = ref<OrganizationSummary[]>([]);

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

  async function ensureLoadedForSuperAdmin(): Promise<void> {
    const auth = useAuthStore();
    if (auth.user?.role !== 'super_admin') {
      return;
    }

    const list = await http<OrganizationSummary[]>('/platform/organizations');
    organizations.value = list;

    if (list.length === 0) {
      setSelectedOrgId(null);
      return;
    }

    const saved = selectedOrgId.value;
    if (saved && list.some((o) => o.id === saved)) {
      return;
    }

    const currentHost = normalizeHost(window.location.hostname);
    const matched = list.find((o) =>
      o.hosts.some((h) => normalizeHost(h) === currentHost),
    );
    setSelectedOrgId(matched?.id ?? list[0].id);
  }

  return {
    selectedOrgId,
    organizations,
    hasSelectedOrg: computed(() => Boolean(selectedOrgId.value)),
    setSelectedOrgId,
    clear,
    ensureLoadedForSuperAdmin,
  };
});
