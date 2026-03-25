<script setup lang="ts">
import { useRouter } from 'vue-router';
import Button from '@/components/ui/button/Button.vue';
import ThemeToggle from './ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';
import { useTenantContextStore } from '@/stores/tenant-context';

const auth = useAuthStore();
const tenant = useTenantContextStore();
const router = useRouter();

function shortOrgName(name: string, max = 22): string {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max).trimEnd()}…`;
}

function logout() {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <header
    class="glass-panel sticky top-0 z-20 mb-3 flex flex-col gap-2 px-3 py-2.5 md:mb-4 md:flex-row md:items-center md:justify-between md:gap-3 md:px-4 md:py-3"
  >
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold tracking-tight">
        Workspace Booker
      </p>
      <p
        class="truncate text-xs text-muted-foreground"
        :title="auth.user?.email ?? ''"
      >
        {{ auth.user?.displayName ?? '' }}
      </p>
      <div
        v-if="auth.isSuperAdmin"
        class="mt-2 md:hidden"
      >
        <label
          class="mb-1 block text-xs font-medium text-muted-foreground"
          for="mobile-tenant-org"
        >Организация</label>
        <select
          id="mobile-tenant-org"
          class="select-glass flex h-9 w-full max-w-full rounded-xl border border-input bg-background/70 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    </div>
    <div class="flex shrink-0 items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="h-8 md:hidden"
        @click="logout"
      >
        Выйти
      </Button>
      <ThemeToggle />
    </div>
  </header>
</template>
