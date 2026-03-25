<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import AppShell from '@/components/layout/AppShell.vue';
</script>

<template>
  <div class="flex min-h-0 flex-1 overflow-hidden">
    <Toaster
      rich-colors
      position="top-center"
    />
    <AppShell />
  </div>
</template>
