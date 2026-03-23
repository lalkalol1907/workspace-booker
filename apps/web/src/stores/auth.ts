import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getStoredToken, http, setStoredToken } from '@/api/http';
import type { MeResponse, TokenResponse } from '@/api/types';
import { useTenantContextStore } from '@/stores/tenant-context';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<MeResponse | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const isSuperAdmin = computed(
    () => user.value?.role === 'super_admin',
  );
  const isAdmin = computed(
    () =>
      user.value?.role === 'admin' || user.value?.role === 'super_admin',
  );

  function setToken(t: string | null) {
    token.value = t;
    setStoredToken(t);
    if (!t) {
      user.value = null;
      useTenantContextStore().clear();
    }
  }

  async function fetchMe() {
    loading.value = true;
    try {
      user.value = await http<MeResponse>('/auth/me');
      if (user.value.role === 'super_admin') {
        await useTenantContextStore().ensureLoadedForSuperAdmin();
      }
    } finally {
      loading.value = false;
    }
  }

  async function login(payload: { email: string; password: string }) {
    const res = await http<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(res.accessToken);
    await fetchMe();
  }

  async function changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }) {
    await http('/auth/password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchMe();
  }

  function logout() {
    setToken(null);
  }

  async function bootstrap() {
    const stored = getStoredToken();
    if (!stored) {
      return;
    }
    token.value = stored;
    try {
      await fetchMe();
    } catch {
      setToken(null);
    }
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    login,
    changePassword,
    logout,
    fetchMe,
    bootstrap,
    setToken,
  };
});
