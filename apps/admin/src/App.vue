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
  <div class="min-h-screen bg-slate-100/70">
    <Toaster
      rich-colors
      position="top-center"
    />
    <div
      v-if="auth.isAuthenticated"
      class="mx-auto flex min-h-screen w-full max-w-[1400px]"
    >
      <aside class="sticky top-0 hidden h-screen w-64 shrink-0 overflow-hidden border-r border-slate-300 bg-white p-4 lg:block">
        <div class="mb-6 border-b border-slate-200 pb-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Platform Console
          </p>
          <p class="mt-1 text-sm font-semibold text-slate-900">
            Workspace Booker
          </p>
        </div>
        <nav class="space-y-1">
          <RouterLink
            to="/tenants/platform-admins"
            class="block rounded-md border border-transparent px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Админы платформы
          </RouterLink>
          <RouterLink
            to="/tenants"
            class="block rounded-md border border-transparent px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Список тенантов
          </RouterLink>
        </nav>
      </aside>

      <div class="min-w-0 flex-1">
        <header class="border-b border-slate-300 bg-white">
          <div class="flex items-center justify-between px-4 py-3 lg:px-6">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">
                Административная панель
              </p>
              <p class="text-sm font-semibold text-slate-900">
                Управление платформой
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-slate-600">{{ auth.user?.email }}</span>
              <button
                type="button"
                class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                @click="logout"
              >
                Выйти
              </button>
            </div>
          </div>
        </header>
        <main class="px-4 py-6 lg:px-6">
          <RouterView />
        </main>
      </div>
    </div>

    <main
      v-else
      class="mx-auto max-w-6xl px-4 py-6"
    >
      <RouterView />
    </main>
  </div>
</template>
