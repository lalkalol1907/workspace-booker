<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui';
import { cn } from '@/lib/utils';

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }>(),
  {
    confirmText: 'OK',
    cancelText: 'Отмена',
    destructive: false,
  },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();

function onConfirm() {
  emit('confirm');
}

function onCancel() {
  emit('cancel');
}
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay
        :class="
          cn(
            'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )
        "
      />
      <AlertDialogContent
        :class="
          cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          )
        "
      >
        <AlertDialogTitle class="text-lg font-semibold leading-none tracking-tight">
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription
          v-if="description"
          class="text-sm text-muted-foreground"
        >
          {{ description }}
        </AlertDialogDescription>
        <AlertDialogDescription
          v-else
          class="sr-only"
        >
          {{ title }}
        </AlertDialogDescription>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel
            :class="
              cn(
                'inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )
            "
            @click="onCancel"
          >
            {{ props.cancelText }}
          </AlertDialogCancel>
          <AlertDialogAction
            :class="
              cn(
                'inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                props.destructive
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )
            "
            @click="onConfirm"
          >
            {{ props.confirmText }}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
