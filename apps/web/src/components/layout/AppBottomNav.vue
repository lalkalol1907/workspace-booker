<script setup lang="ts">
import { Calendar, LayoutGrid, Ticket } from 'lucide-vue-next';
import { RouterLink, useRoute } from 'vue-router';
import { cn } from '@/lib/utils';

const route = useRoute();

const items = [
  { to: '/calendar', name: 'calendar', label: 'Календарь', icon: Calendar },
  { to: '/resources', name: 'resources', label: 'Ресурсы', icon: LayoutGrid },
  { to: '/bookings', name: 'bookings', label: 'Брони', icon: Ticket },
] as const;

function active(name: string) {
  return route.name === name;
}
</script>

<template>
  <nav
    class="glass-panel fixed inset-x-0 bottom-0 z-30 flex border-t border-border/70 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 md:hidden"
    aria-label="Основная навигация"
  >
    <RouterLink
      v-for="item in items"
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
  </nav>
</template>
