<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import Button from '@/components/ui/button/Button.vue';
import LoadingOverlay from '@/components/ui/loading-overlay/LoadingOverlay.vue';
import Table from '@/components/ui/table/Table.vue';
import TableBody from '@/components/ui/table/TableBody.vue';
import TableCell from '@/components/ui/table/TableCell.vue';
import TableHead from '@/components/ui/table/TableHead.vue';
import TableHeader from '@/components/ui/table/TableHeader.vue';
import TableRow from '@/components/ui/table/TableRow.vue';
import { http } from '@/api/http';
import type { BookingDto } from '@/api/types';
import { bookingStatusLabel } from '@/utils/booking-status-label';

const rows = ref<BookingDto[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    rows.value = await http<BookingDto[]>('/bookings?mine=true');
  } catch {
    toast.error('Не удалось загрузить брони');
  } finally {
    loading.value = false;
  }
});

async function cancelRow(id: string) {
  try {
    await http(`/bookings/${id}`, { method: 'DELETE' });
    rows.value = rows.value.filter((b) => b.id !== id);
    toast.success('Бронь отменена');
  } catch {
    toast.error('Не удалось отменить');
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="glass-panel px-5 py-4">
      <h1>Мои бронирования</h1>
      <p class="text-sm text-muted-foreground">
        Управляйте своими активными бронированиями и историей.
      </p>
    </div>
    <div class="glass-panel relative p-3">
      <LoadingOverlay v-if="loading" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ресурс</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Начало</TableHead>
            <TableHead>Конец</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead class="w-[72px] text-right">
              Действия
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!rows.length && !loading">
            <TableCell
              colspan="6"
              class="h-24 text-center text-muted-foreground"
            >
              Нет броней
            </TableCell>
          </TableRow>
          <TableRow
            v-for="row in rows"
            :key="row.id"
          >
            <TableCell class="font-medium">
              {{ row.resourceName }}
            </TableCell>
            <TableCell>{{ row.title }}</TableCell>
            <TableCell>{{ new Date(row.startsAt).toLocaleString() }}</TableCell>
            <TableCell>{{ new Date(row.endsAt).toLocaleString() }}</TableCell>
            <TableCell>{{ bookingStatusLabel(row.status) }}</TableCell>
            <TableCell class="flex justify-end">
              <Button
                v-if="row.status === 'confirmed'"
                variant="ghost"
                size="icon"
                class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                type="button"
                aria-label="Отменить бронь"
                @click="cancelRow(row.id)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
