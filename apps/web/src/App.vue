<script setup lang="ts">
import { watchEffect } from 'vue';
import { Toaster } from 'vue-sonner';
import AppShell from '@/components/layout/AppShell.vue';
import { useOrganizationDisplayName } from '@/composables/useOrganizationDisplayName';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const organizationTitle = useOrganizationDisplayName();

watchEffect(() => {
  document.title = auth.isAuthenticated
    ? organizationTitle.value
    : 'Бронирование рабочих мест';
});
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
