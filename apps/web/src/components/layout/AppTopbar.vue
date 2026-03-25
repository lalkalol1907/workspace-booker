<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue';
import { useOrganizationDisplayName } from '@/composables/useOrganizationDisplayName';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const organizationTitle = useOrganizationDisplayName();
</script>

<template>
  <header
    class="glass-panel sticky top-0 z-20 mb-3 hidden flex-col gap-2 px-3 py-2.5 md:mb-4 md:flex md:flex-row md:items-center md:justify-between md:gap-3 md:px-4 md:py-3"
  >
    <div class="min-w-0 flex-1">
      <p
        class="truncate text-sm font-semibold tracking-tight"
        :title="organizationTitle"
      >
        {{ organizationTitle }}
      </p>
      <p
        class="truncate text-xs text-muted-foreground"
        :title="auth.user?.email ?? ''"
      >
        {{ auth.user?.displayName ?? '' }}
      </p>
    </div>
    <div class="flex shrink-0 items-center justify-end gap-2">
      <ThemeToggle />
    </div>
  </header>
</template>
