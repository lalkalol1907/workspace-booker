<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui';
import { cn } from '@/lib/utils';

const open = defineModel<boolean>('open', { required: true });

defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        :class="
          cn(
            'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )
        "
      />
      <DialogContent
        :class="
          cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          )
        "
      >
        <DialogTitle class="text-lg font-semibold leading-none tracking-tight">
          {{ title }}
        </DialogTitle>
        <DialogDescription
          v-if="description"
          class="text-sm text-muted-foreground"
        >
          {{ description }}
        </DialogDescription>
        <DialogDescription
          v-else
          class="sr-only"
        >
          {{ title }}
        </DialogDescription>
        <slot />
        <div
          v-if="$slots.footer"
          class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
        >
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
