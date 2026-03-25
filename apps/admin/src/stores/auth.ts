import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getStoredToken, http, setStoredToken } from '@/api/http';
import type { MeResponse, TokenResponse } from '@/api/types';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<MeResponse | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value);

  function setToken(t: string | null) {
    token.value = t;
    setStoredToken(t);
    if (!t) {
      user.value = null;
    }
  }

  async function fetchMe() {
    loading.value = true;
    try {
      const me = await http<MeResponse>('/auth/me');
      if (me.role !== 'super_admin') {
        throw new Error('forbidden role');
      }
      user.value = me;
    } finally {
      loading.value = false;
    }
  }

  async function platformLogin(payload: { email: string; password: string }) {
    const res = await http<TokenResponse>('/auth/platform/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(res.accessToken);
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
    platformLogin,
    logout,
    bootstrap,
  };
});
