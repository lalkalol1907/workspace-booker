<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import Button from '@/components/ui/button/Button.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const showSidebar = computed(
  () =>
    auth.isAuthenticated &&
    !route.meta.guest &&
    route.name !== 'change-password',
);

function logout() {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 overflow-hidden">
    <AppSidebar v-if="showSidebar" />
    <main class="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6">
      <AppTopbar v-if="showSidebar" />
      <div :class="showSidebar ? 'mx-auto w-full max-w-[1280px]' : 'mx-auto w-full max-w-[520px] pt-8'">
        <RouterView />
      </div>
      <div
        v-if="showSidebar"
        class="fixed bottom-5 right-5"
      >
        <Button
          variant="glass"
          type="button"
          @click="logout"
        >
          Выйти
        </Button>
      </div>
    </main>
  </div>
</template>
