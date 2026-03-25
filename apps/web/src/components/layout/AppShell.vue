<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import Button from '@/components/ui/button/Button.vue';
import AppBottomNav from './AppBottomNav.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

function logoutDesktop() {
  auth.logout();
  void router.push({ name: 'login' });
}

const showSidebar = computed(
  () =>
    auth.isAuthenticated &&
    !route.meta.guest &&
    route.name !== 'change-password',
);
</script>

<template>
  <div class="flex min-h-0 flex-1 overflow-hidden">
    <AppSidebar v-if="showSidebar" />
    <main
      :class="[
        'min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 md:px-6 md:py-4',
        showSidebar
          ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-4'
          : '',
      ]"
    >
      <AppTopbar v-if="showSidebar" />
      <div
        :class="
          showSidebar
            ? 'mx-auto w-full max-w-[1280px]'
            : 'mx-auto w-full max-w-[520px] pt-6 md:pt-8'
        "
      >
        <RouterView />
      </div>
      <AppBottomNav v-if="showSidebar" />
      <div
        v-if="showSidebar"
        class="fixed bottom-5 right-5 z-20 hidden md:block"
      >
        <Button
          variant="glass"
          type="button"
          @click="logoutDesktop"
        >
          Выйти
        </Button>
      </div>
    </main>
  </div>
</template>
