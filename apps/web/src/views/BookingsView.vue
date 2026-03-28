<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { apiErrorMessage } from '@/api/error-messages';
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
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось загрузить список бронирований'));
  } finally {
    loading.value = false;
  }
});

async function cancelRow(id: string) {
  try {
    await http(`/bookings/${id}`, { method: 'DELETE' });
    rows.value = rows.value.filter((b) => b.id !== id);
    toast.success('Бронь отменена');
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось отменить бронь'));
  }
}
</script>

<template>
  <section class="space-y-3 md:space-y-4">
    <div class="glass-panel px-4 py-3 md:px-5 md:py-4">
      <h1>Мои бронирования</h1>
      <p class="text-xs text-muted-foreground md:text-sm">
        Управляйте своими активными бронированиями и историей.
      </p>
    </div>
    <div class="relative space-y-2 md:hidden">
      <LoadingOverlay v-if="loading" />
      <p
        v-if="!rows.length && !loading"
        class="glass-panel p-6 text-center text-sm text-muted-foreground"
      >
        Нет броней
      </p>
      <article
        v-for="row in rows"
        :key="row.id"
        class="glass-panel space-y-3 p-4"
      >
        <div class="space-y-1">
          <h2 class="text-base font-semibold leading-tight">
            {{ row.title }}
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ row.resourceName }}
          </p>
        </div>
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between gap-2">
            <dt class="text-muted-foreground">
              Начало
            </dt>
            <dd class="text-right tabular-nums">
              {{ new Date(row.startsAt).toLocaleString() }}
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-muted-foreground">
              Конец
            </dt>
            <dd class="text-right tabular-nums">
              {{ new Date(row.endsAt).toLocaleString() }}
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-muted-foreground">
              Статус
            </dt>
            <dd>{{ bookingStatusLabel(row.status) }}</dd>
          </div>
        </dl>
        <div
          v-if="row.status === 'confirmed'"
          class="flex justify-end border-t border-border/60 pt-3"
        >
          <Button
            variant="outline"
            size="sm"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive"
            type="button"
            @click="cancelRow(row.id)"
          >
            <Trash2 class="mr-2 size-4" />
            Отменить
          </Button>
        </div>
      </article>
    </div>
    <div class="glass-panel relative hidden p-3 md:block">
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
