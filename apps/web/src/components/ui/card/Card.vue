<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{ class?: string }>();
</script>

<template>
  <div
    :class="
      cn(
        'glass-panel rounded-2xl bg-card/70 text-card-foreground',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
