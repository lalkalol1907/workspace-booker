<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { Toaster } from 'vue-sonner';
import { useAuthStore } from '@/stores/auth';
import { useTenantContextStore } from '@/stores/tenant-context';

const auth = useAuthStore();
const tenant = useTenantContextStore();
const route = useRoute();
const router = useRouter();

const showSidebar = computed(
  () =>
    auth.isAuthenticated &&
    !route.meta.guest &&
    route.name !== 'change-password',
);

function logout() {
  auth.logout();
  void router.push({ name: 'login' });
}

const linkClass =
  'block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';
const linkActiveClass = 'bg-accent font-medium text-accent-foreground';
</script>

<template>
  <div class="flex min-h-0 flex-1 overflow-hidden">
    <Toaster rich-colors position="top-center" />
    <aside
      v-if="showSidebar"
      class="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-border bg-card"
    >
      <div class="shrink-0 border-b border-border px-5 py-4 text-sm font-semibold">
        Workspace Booker
      </div>
      <nav class="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-2">
        <RouterLink
          to="/calendar"
          :class="linkClass"
          :active-class="linkActiveClass"
        >
          Календарь
        </RouterLink>
        <RouterLink
          to="/resources"
          :class="linkClass"
          :active-class="linkActiveClass"
        >
          Ресурсы
        </RouterLink>
        <RouterLink
          to="/bookings"
          :class="linkClass"
          :active-class="linkActiveClass"
        >
          Мои брони
        </RouterLink>
        <template v-if="auth.isAdmin">
          <p
            class="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Администрирование
          </p>
          <RouterLink
            to="/admin/locations"
            :class="linkClass"
            :active-class="linkActiveClass"
          >
            Локации
          </RouterLink>
          <RouterLink
            to="/admin/resources"
            :class="linkClass"
            :active-class="linkActiveClass"
          >
            Управление ресурсами
          </RouterLink>
          <RouterLink
            to="/admin/users"
            :class="linkClass"
            :active-class="linkActiveClass"
          >
            Пользователи
          </RouterLink>
        </template>
      </nav>
      <div class="shrink-0 space-y-3 border-t border-border p-4">
        <div v-if="auth.isSuperAdmin" class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground" for="tenant-org"
            >Организация</label
          >
          <select
            id="tenant-org"
            class="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :value="tenant.selectedOrgId ?? ''"
            @change="
              tenant.setSelectedOrgId(
                ($event.target as HTMLSelectElement).value || null,
              )
            "
          >
            <option v-if="!tenant.organizations.length" value="" disabled>
              Нет организаций
            </option>
            <option
              v-for="o in tenant.organizations"
              :key="o.id"
              :value="o.id"
            >
              {{ o.name }}
            </option>
          </select>
        </div>
        <div
          class="truncate text-xs text-muted-foreground"
          :title="auth.user?.email ?? ''"
        >
          {{ auth.user?.displayName ?? '' }}
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="logout"
        >
          Выйти
        </button>
      </div>
    </aside>
    <main
      class="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 md:px-8"
      :class="showSidebar ? 'mx-auto w-full max-w-[1200px]' : ''"
    >
      <RouterView />
    </main>
  </div>
</template>
