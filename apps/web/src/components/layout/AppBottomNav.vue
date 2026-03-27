<script setup lang="ts">
import {
  Calendar,
  LayoutGrid,
  Ticket,
  UserRound,
} from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import Button from '@/components/ui/button/Button.vue';
import ThemeToggle from './ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';
import { useOrganizationDisplayName } from '@/composables/useOrganizationDisplayName';
import { cn } from '@/lib/utils';
import { userInitialsFromDisplayName } from '@/utils/user-initials';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const organizationTitle = useOrganizationDisplayName();

const userInitials = computed(() =>
  userInitialsFromDisplayName(auth.user?.displayName),
);

const sheetOpen = ref(false);

const navItems = [
  { to: '/calendar', name: 'calendar', label: 'Календарь', icon: Calendar },
  { to: '/resources', name: 'resources', label: 'Ресурсы', icon: LayoutGrid },
  { to: '/bookings', name: 'bookings', label: 'Брони', icon: Ticket },
] as const;

function active(name: string) {
  return route.name === name;
}

function logout() {
  auth.logout();
  sheetOpen.value = false;
  void router.push({ name: 'login' });
}

function closeSheet() {
  sheetOpen.value = false;
}

function toggleSheet() {
  sheetOpen.value = !sheetOpen.value;
}

watch(
  () => route.name,
  () => {
    sheetOpen.value = false;
  },
);

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    sheetOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="md:hidden">
    <Transition
      enter-active-class="duration-200 ease-out"
      leave-active-class="duration-150 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <button
        v-if="sheetOpen"
        type="button"
        class="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
        aria-label="Закрыть меню"
        @click="closeSheet"
      />
    </Transition>

    <Transition
      enter-active-class="duration-200 ease-out"
      leave-active-class="duration-150 ease-in"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="sheetOpen"
        id="mobile-account-sheet"
        class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border/70 bg-background/90 px-4 pt-4 pb-[max(1rem,calc(4.5rem+env(safe-area-inset-bottom)))] shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-account-title"
      >
        <div
          class="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/35"
          aria-hidden="true"
        />
        <h2
          id="mobile-account-title"
          class="mb-3 truncate text-sm font-semibold leading-snug text-foreground"
          :title="organizationTitle"
        >
          {{ organizationTitle }}
        </h2>
        <div
          class="mb-5 flex gap-3 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/12 via-background/50 to-background/40 px-3 py-3 shadow-sm ring-1 ring-inset ring-primary/10"
        >
          <div
            class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-base font-bold tracking-tight text-primary"
            aria-hidden="true"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1 py-0.5">
            <p class="truncate text-base font-semibold leading-snug text-foreground">
              {{ auth.user?.displayName ?? 'Пользователь' }}
            </p>
            <p class="mt-0.5 truncate text-sm leading-relaxed text-muted-foreground">
              {{ auth.user?.email ?? '' }}
            </p>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
          <span class="text-sm text-muted-foreground">Тема</span>
          <ThemeToggle />
        </div>
        <Button
          type="button"
          variant="outline"
          class="mt-4 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          @click="logout"
        >
          Выйти
        </Button>
      </div>
    </Transition>

    <nav
      class="glass-panel fixed inset-x-0 bottom-0 z-30 flex border-t border-border/70 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
      aria-label="Основная навигация"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="item.to"
        :class="
          cn(
            'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors',
            active(item.name)
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )
        "
      >
        <component
          :is="item.icon"
          class="size-[1.35rem] shrink-0"
          aria-hidden="true"
          :stroke-width="active(item.name) ? 2.35 : 2"
        />
        {{ item.label }}
      </RouterLink>
      <button
        type="button"
        :class="
          cn(
            'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors',
            sheetOpen
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )
        "
        :aria-expanded="sheetOpen"
        aria-controls="mobile-account-sheet"
        @click="toggleSheet"
      >
        <UserRound
          class="size-[1.35rem] shrink-0"
          aria-hidden="true"
          :stroke-width="sheetOpen ? 2.35 : 2"
        />
        Профиль
      </button>
    </nav>
  </div>
</template>
