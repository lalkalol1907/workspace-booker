<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTenantContextStore } from '@/stores/tenant-context';

const auth = useAuthStore();
const tenant = useTenantContextStore();

const linkClass =
  'block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';
const linkActiveClass = 'bg-accent font-medium text-accent-foreground';

function shortOrgName(name: string, max = 17): string {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max).trimEnd()}...`;
}
</script>

<template>
  <aside class="glass-panel flex w-[240px] shrink-0 flex-col overflow-hidden">
    <div class="border-b border-border/70 px-5 py-4 text-sm font-semibold">
      Навигация
    </div>
    <nav class="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-3">
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
        <p class="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
    <div class="space-y-3 border-t border-border/70 p-3">
      <div
        v-if="auth.isSuperAdmin"
        class="space-y-1.5 px-3"
      >
        <label
          class="text-xs font-medium text-muted-foreground"
          for="tenant-org"
        >Организация</label>
        <select
          id="tenant-org"
          class="select-glass flex h-9 w-full rounded-xl border border-input bg-background/70 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :value="tenant.selectedOrgId ?? ''"
          @change="
            tenant.setSelectedOrgId(
              ($event.target as HTMLSelectElement).value || null,
            )
          "
        >
          <option
            v-if="!tenant.organizations.length"
            value=""
            disabled
          >
            Нет организаций
          </option>
          <option
            v-for="o in tenant.organizations"
            :key="o.id"
            :value="o.id"
            :title="o.name"
          >
            {{ shortOrgName(o.name) }}
          </option>
        </select>
      </div>
      <div
        class="truncate px-3 text-xs text-muted-foreground"
        :title="auth.user?.email ?? ''"
      >
        {{ auth.user?.displayName ?? '' }}
      </div>
    </div>
  </aside>
</template>
