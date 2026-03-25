<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import LoadingOverlay from '@/components/ui/loading-overlay/LoadingOverlay.vue';
import Table from '@/components/ui/table/Table.vue';
import TableBody from '@/components/ui/table/TableBody.vue';
import TableCell from '@/components/ui/table/TableCell.vue';
import TableHead from '@/components/ui/table/TableHead.vue';
import TableHeader from '@/components/ui/table/TableHeader.vue';
import TableRow from '@/components/ui/table/TableRow.vue';
import { http } from '@/api/http';
import type { ResourceDto } from '@/api/types';
import { resourceTypeLabel } from '@/utils/resource-type-label';

const rows = ref<ResourceDto[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    rows.value = await http<ResourceDto[]>('/resources');
  } catch {
    toast.error('Не удалось загрузить ресурсы');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="space-y-3 md:space-y-4">
    <div class="glass-panel px-4 py-3 md:px-5 md:py-4">
      <h1>Ресурсы</h1>
      <p class="text-xs text-muted-foreground md:text-sm">
        Каталог доступных ресурсов по вашей организации.
      </p>
    </div>
    <div class="relative space-y-2 md:hidden">
      <LoadingOverlay v-if="loading" />
      <p
        v-if="!rows.length && !loading"
        class="glass-panel p-6 text-center text-sm text-muted-foreground"
      >
        Нет ресурсов
      </p>
      <article
        v-for="row in rows"
        :key="row.id"
        class="glass-panel flex flex-col gap-2 p-4"
      >
        <div class="flex items-start justify-between gap-2">
          <h2 class="text-base font-semibold leading-tight">
            {{ row.name }}
          </h2>
          <span
            class="shrink-0 rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            {{ row.isActive ? 'активен' : 'выкл.' }}
          </span>
        </div>
        <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt class="text-muted-foreground">
            Тип
          </dt>
          <dd>{{ resourceTypeLabel(row.type) }}</dd>
          <dt class="text-muted-foreground">
            Вместимость
          </dt>
          <dd>{{ row.capacity }}</dd>
        </dl>
      </article>
    </div>
    <div class="glass-panel relative hidden p-3 md:block">
      <LoadingOverlay v-if="loading" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Вместимость</TableHead>
            <TableHead>Активен</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="row in rows"
            :key="row.id"
          >
            <TableCell class="font-medium">
              {{ row.name }}
            </TableCell>
            <TableCell>{{ resourceTypeLabel(row.type) }}</TableCell>
            <TableCell>{{ row.capacity }}</TableCell>
            <TableCell>{{ row.isActive ? 'да' : 'нет' }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
