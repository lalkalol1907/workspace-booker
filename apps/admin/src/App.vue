<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <Toaster rich-colors position="top-center" />
    <header
      v-if="auth.isAuthenticated"
      class="border-b bg-white"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div class="text-sm font-semibold">Workspace Booker Platform</div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-600">{{ auth.user?.email }}</span>
          <button
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-100"
            @click="logout"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
