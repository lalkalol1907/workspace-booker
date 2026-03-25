<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
</script>

<template>
  <div
    class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/55 backdrop-blur-sm"
  >
    <Loader2 class="size-8 animate-spin text-muted-foreground" />
  </div>
</template>
