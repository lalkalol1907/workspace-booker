<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
</script>

<template>
  <header
    class="glass-panel sticky top-0 z-20 mb-4 flex items-center justify-between gap-3 px-4 py-3"
  >
    <div>
      <p class="text-sm font-semibold tracking-tight">
        Workspace Booker
      </p>
      <p class="text-xs text-muted-foreground">
        {{ auth.user?.displayName ?? '' }}
      </p>
    </div>
    <ThemeToggle />
  </header>
</template>
