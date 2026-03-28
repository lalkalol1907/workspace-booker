<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import ThemeToggle from './ThemeToggle.vue';
import { useOrganizationDisplayName } from '@/composables/useOrganizationDisplayName';
import { useAuthStore } from '@/stores/auth';
import { useTenantContextStore } from '@/stores/tenant-context';
import { userInitialsFromDisplayName } from '@/utils/user-initials';

const auth = useAuthStore();
const tenant = useTenantContextStore();
const organizationTitle = useOrganizationDisplayName();

const linkClass =
  'block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';
const linkActiveClass = 'bg-accent font-medium text-accent-foreground';

const selectedOrg = computed(() =>
  tenant.organizations.find((o) => o.id === tenant.selectedOrgId),
);

const userInitials = computed(() =>
  userInitialsFromDisplayName(auth.user?.displayName),
);
</script>

<template>
  <aside
    class="glass-panel hidden w-[272px] shrink-0 flex-col overflow-hidden md:flex"
  >
    <div
      class="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4"
    >
      <p
        class="min-w-0 flex-1 truncate text-sm font-semibold leading-snug tracking-tight"
        :title="organizationTitle"
      >
        {{ organizationTitle }}
      </p>
      <div class="shrink-0">
        <ThemeToggle />
      </div>
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
        class="space-y-2 rounded-xl border border-border/60 bg-background/40 px-3 py-3"
      >
        <label
          class="block text-xs font-medium text-muted-foreground"
          for="tenant-org"
        >Организация</label>
        <select
          id="tenant-org"
          class="select-glass h-10 w-full min-w-0 max-w-full rounded-xl border border-input bg-background/80 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :value="tenant.selectedOrgId ?? ''"
          :title="selectedOrg?.name ?? ''"
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
            {{ o.name }}
          </option>
        </select>
      </div>
      <div
        class="flex gap-3 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/12 via-background/50 to-background/30 px-3 py-3 shadow-sm ring-1 ring-inset ring-primary/10"
        :title="auth.user?.email ?? ''"
      >
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-sm font-bold tracking-tight text-primary"
          aria-hidden="true"
        >
          {{ userInitials }}
        </div>
        <div class="min-w-0 flex-1 py-0.5">
          <p class="truncate text-sm font-semibold leading-snug text-foreground">
            {{ auth.user?.displayName ?? 'Пользователь' }}
          </p>
          <p class="mt-0.5 truncate text-xs leading-relaxed text-muted-foreground">
            {{ auth.user?.email ?? '' }}
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
