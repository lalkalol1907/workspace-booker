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
  <section class="space-y-4">
    <div class="glass-panel px-5 py-4">
      <h1>Ресурсы</h1>
      <p class="text-sm text-muted-foreground">
        Каталог доступных ресурсов по вашей организации.
      </p>
    </div>
    <div class="glass-panel relative p-3">
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
