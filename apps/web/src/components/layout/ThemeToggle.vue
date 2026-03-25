<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/ui/button/Button.vue';
import { useThemeStore } from '@/stores/theme';

const theme = useThemeStore();

const label = computed(() => {
  if (theme.mode === 'system') {
    return 'System';
  }
  return theme.mode === 'dark' ? 'Dark' : 'Light';
});

function toggleMode() {
  if (theme.mode === 'light') {
    theme.setMode('dark');
    return;
  }
  if (theme.mode === 'dark') {
    theme.setMode('system');
    return;
  }
  theme.setMode('light');
}
</script>

<template>
  <Button
    variant="glass"
    size="sm"
    type="button"
    @click="toggleMode"
  >
    {{ label }}
  </Button>
</template>
