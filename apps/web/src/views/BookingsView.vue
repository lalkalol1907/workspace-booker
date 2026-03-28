<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { apiErrorMessage } from '@/api/error-messages';
import Button from '@/components/ui/button/Button.vue';
import FormDialog from '@/components/ui/dialog/FormDialog.vue';
import Input from '@/components/ui/input/Input.vue';
import Label from '@/components/ui/label/Label.vue';
import LoadingOverlay from '@/components/ui/loading-overlay/LoadingOverlay.vue';
import Table from '@/components/ui/table/Table.vue';
import TableBody from '@/components/ui/table/TableBody.vue';
import TableCell from '@/components/ui/table/TableCell.vue';
import TableHead from '@/components/ui/table/TableHead.vue';
import TableHeader from '@/components/ui/table/TableHeader.vue';
import TableRow from '@/components/ui/table/TableRow.vue';
import { http } from '@/api/http';
import type { BookingDto, ResourceDto } from '@/api/types';
import { bookingStatusLabel } from '@/utils/booking-status-label';
import { cn } from '@/lib/utils';

const rows = ref<BookingDto[]>([]);
const resources = ref<ResourceDto[]>([]);
const loading = ref(false);

const editOpen = ref(false);
const editRow = ref<BookingDto | null>(null);
const editTitle = ref('');
const editStart = ref('');
const editEnd = ref('');
const editSubmitting = ref(false);

const inputClass = cn(
  'flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const selectedResource = computed(() => {
  const id = editRow.value?.resourceId;
  if (!id) {
    return null;
  }
  return resources.value.find((r) => r.id === id) ?? null;
});

const editDurationMs = computed(() => {
  if (!editStart.value || !editEnd.value) {
    return null;
  }
  const start = new Date(editStart.value);
  const end = new Date(editEnd.value);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }
  return end.getTime() - start.getTime();
});

const editDurationMinutesDisplay = computed(() => {
  if (editDurationMs.value == null) {
    return null;
  }
  return Math.floor(editDurationMs.value / 60_000);
});

const editExceedsMaxDuration = computed(() => {
  const max = selectedResource.value?.maxBookingMinutes;
  if (max == null || editDurationMs.value == null) {
    return false;
  }
  return editDurationMs.value > max * 60 * 1000;
});

const editDescription = computed(() => {
  const base =
    'Измените название и время. Пересечение с другими подтверждёнными бронями на этот ресурс недопустимо.';
  const max = selectedResource.value?.maxBookingMinutes;
  if (max == null) {
    return base;
  }
  return `${base} Максимальная длительность — ${max} мин.`;
});

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openEdit(row: BookingDto) {
  editRow.value = row;
  editTitle.value = row.title;
  editStart.value = toLocalDatetimeValue(new Date(row.startsAt));
  editEnd.value = toLocalDatetimeValue(new Date(row.endsAt));
  editOpen.value = true;
}

function closeEdit() {
  editOpen.value = false;
  editRow.value = null;
  editTitle.value = '';
  editStart.value = '';
  editEnd.value = '';
}

async function saveEdit() {
  if (!editRow.value || !editStart.value || !editEnd.value) {
    return;
  }
  const start = new Date(editStart.value);
  const end = new Date(editEnd.value);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    toast.warning('Некорректные дата и время');
    return;
  }
  if (end <= start) {
    toast.warning('Конец должен быть позже начала');
    return;
  }
  const maxMin = selectedResource.value?.maxBookingMinutes;
  if (
    maxMin != null &&
    end.getTime() - start.getTime() > maxMin * 60 * 1000
  ) {
    toast.warning(
      `Длительность брони не может превышать ${maxMin} мин. для этого ресурса`,
    );
    return;
  }
  editSubmitting.value = true;
  try {
    const id = editRow.value.id;
    const updated = await http<BookingDto>(`/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        title: editTitle.value.trim() || 'Бронь',
      }),
    });
    const idx = rows.value.findIndex((b) => b.id === id);
    if (idx >= 0) {
      rows.value[idx] = updated;
    }
    toast.success('Изменения сохранены');
    closeEdit();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось сохранить изменения'));
  } finally {
    editSubmitting.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const [bookings, resList] = await Promise.all([
      http<BookingDto[]>('/bookings?mine=true'),
      http<ResourceDto[]>('/resources'),
    ]);
    rows.value = bookings;
    resources.value = resList;
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось загрузить данные'));
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
          v-if="row.status === 'confirmed' || row.status === 'in_progress'"
          class="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3"
        >
          <Button
            variant="outline"
            size="sm"
            type="button"
            @click="openEdit(row)"
          >
            <Pencil class="mr-2 size-4" />
            Изменить
          </Button>
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
            <TableHead class="w-[120px] text-right">
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
            <TableCell class="flex justify-end gap-1">
              <Button
                v-if="row.status === 'confirmed' || row.status === 'in_progress'"
                variant="ghost"
                size="icon"
                type="button"
                aria-label="Изменить бронь"
                @click="openEdit(row)"
              >
                <Pencil class="size-4" />
              </Button>
              <Button
                v-if="row.status === 'confirmed' || row.status === 'in_progress'"
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

    <FormDialog
      v-model:open="editOpen"
      title="Редактировать бронь"
      :description="editDescription"
    >
      <form
        id="edit-booking-form"
        class="space-y-4"
        @submit.prevent="saveEdit"
      >
        <div class="space-y-2">
          <Label for="edit-title">Название</Label>
          <Input
            id="edit-title"
            v-model="editTitle"
            type="text"
            placeholder="Встреча"
            autocomplete="off"
          />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="edit-start">Начало</Label>
            <input
              id="edit-start"
              v-model="editStart"
              type="datetime-local"
              :class="inputClass"
            >
          </div>
          <div class="space-y-2">
            <Label for="edit-end">Конец</Label>
            <input
              id="edit-end"
              v-model="editEnd"
              type="datetime-local"
              :class="inputClass"
            >
          </div>
        </div>
        <p
          v-if="selectedResource?.maxBookingMinutes != null && editDurationMinutesDisplay != null"
          class="text-xs leading-relaxed text-muted-foreground"
        >
          Длительность:
          <span class="font-medium tabular-nums text-foreground">
            {{ editDurationMinutesDisplay }} мин
          </span>
          <span class="text-muted-foreground">
            (не более
            <span class="tabular-nums">{{ selectedResource.maxBookingMinutes }}</span> мин)
          </span>
        </p>
        <p
          v-if="editExceedsMaxDuration"
          class="text-xs font-medium text-destructive"
        >
          Укоротите интервал: превышена максимальная длительность для этого ресурса.
        </p>
      </form>
      <template #footer>
        <Button
          type="button"
          variant="outline"
          @click="closeEdit"
        >
          Закрыть
        </Button>
        <Button
          type="submit"
          form="edit-booking-form"
          :disabled="editSubmitting || editExceedsMaxDuration"
        >
          {{ editSubmitting ? 'Сохранение…' : 'Сохранить' }}
        </Button>
      </template>
    </FormDialog>
  </section>
</template>
