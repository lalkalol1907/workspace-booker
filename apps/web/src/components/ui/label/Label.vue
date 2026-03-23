<script setup lang="ts">
import { Label } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{ class?: string; for?: string }>();
</script>

<template>
  <Label
    :for="props.for"
    :class="
      cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
      )
    "
  >
    <slot />
  </Label>
</template>
