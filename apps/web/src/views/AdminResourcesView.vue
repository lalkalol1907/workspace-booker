<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import { onMounted, reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import ConfirmDialog from '@/components/ui/alert-dialog/ConfirmDialog.vue';
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
import type { LocationDto, ResourceDto, ResourceType } from '@/api/types';
import { resourceTypeLabel, resourceTypeOptions } from '@/utils/resource-type-label';
import { cn } from '@/lib/utils';

const selectClass = cn(
  'select-glass flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
);

const rows = ref<ResourceDto[]>([]);
const locations = ref<LocationDto[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  locationId: '',
  name: '',
  type: 'room' as ResourceType,
  capacity: 1,
  maxBookingMinutes: null as number | null,
});

const confirmOpen = ref(false);
const pendingResource = ref<ResourceDto | null>(null);

async function load() {
  loading.value = true;
  try {
    rows.value = await http<ResourceDto[]>('/resources');
    locations.value = await http<LocationDto[]>('/locations');
  } catch {
    toast.error('Не удалось загрузить данные');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function openCreate() {
  editingId.value = null;
  form.locationId = locations.value[0]?.id ?? '';
  form.name = '';
  form.type = 'room';
  form.capacity = 1;
  form.maxBookingMinutes = null;
  dialog.value = true;
}

function openEdit(row: ResourceDto) {
  editingId.value = row.id;
  form.locationId = row.locationId;
  form.name = row.name;
  form.type = row.type;
  form.capacity = row.capacity;
  form.maxBookingMinutes = row.maxBookingMinutes ?? null;
  dialog.value = true;
}

async function save() {
  if (!form.name.trim() || !form.locationId) {
    toast.warning('Заполните поля');
    return;
  }
  const maxBookingMinutes =
    typeof form.maxBookingMinutes === 'number' &&
    Number.isFinite(form.maxBookingMinutes)
      ? form.maxBookingMinutes
      : null;
  try {
    if (editingId.value) {
      await http(`/resources/${editingId.value}`, {
        method: 'PATCH',
        body: JSON.stringify({
          locationId: form.locationId,
          name: form.name.trim(),
          type: form.type,
          capacity: form.capacity,
          maxBookingMinutes,
        }),
      });
    } else {
      await http('/resources', {
        method: 'POST',
        body: JSON.stringify({
          locationId: form.locationId,
          name: form.name.trim(),
          type: form.type,
          capacity: form.capacity,
          maxBookingMinutes,
        }),
      });
    }
    dialog.value = false;
    toast.success('Сохранено');
    await load();
  } catch {
    toast.error('Ошибка сохранения');
  }
}

function askDeactivate(row: ResourceDto) {
  pendingResource.value = row;
  confirmOpen.value = true;
}

async function confirmDeactivate() {
  const row = pendingResource.value;
  if (!row) {
    return;
  }
  try {
    await http(`/resources/${row.id}`, { method: 'DELETE' });
    toast.success('Готово');
    pendingResource.value = null;
    confirmOpen.value = false;
    await load();
  } catch {
    toast.error('Ошибка');
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="glass-panel mb-4 flex flex-wrap items-start justify-between gap-4 px-5 py-4">
      <div class="min-w-0">
        <h1>Ресурсы</h1>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
          Рабочие места, переговорные и другие объекты для бронирования. Каждый
          ресурс привязан к локации; тип и вместимость отображаются в календаре.
          Колонка «Активен» и действие с корзиной отражают доступность ресурса
          для бронирования.
        </p>
      </div>
      <Button
        type="button"
        class="shrink-0"
        @click="openCreate"
      >
        Добавить
      </Button>
    </div>
    <div class="glass-panel relative p-3">
      <LoadingOverlay v-if="loading" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Вместимость</TableHead>
            <TableHead class="whitespace-nowrap">
              Макс. бронь
            </TableHead>
            <TableHead>Локация</TableHead>
            <TableHead>Активен</TableHead>
            <TableHead class="w-[100px] text-right">
              Действия
            </TableHead>
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
            <TableCell class="tabular-nums text-muted-foreground">
              <template v-if="row.maxBookingMinutes != null">
                {{ row.maxBookingMinutes }} мин
              </template>
              <span v-else>—</span>
            </TableCell>
            <TableCell>
              {{ locations.find((l) => l.id === row.locationId)?.name ?? '—' }}
            </TableCell>
            <TableCell>{{ row.isActive ? 'да' : 'нет' }}</TableCell>
            <TableCell class="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                class="text-muted-foreground hover:text-foreground"
                type="button"
                aria-label="Изменить"
                @click="openEdit(row)"
              >
                <Pencil class="size-4" />
              </Button>
              <Button
                v-if="row.isActive"
                variant="ghost"
                size="icon"
                class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                type="button"
                aria-label="Деактивировать"
                @click="askDeactivate(row)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <FormDialog
      v-model:open="dialog"
      :title="editingId ? 'Редактировать' : 'Новый ресурс'"
    >
      <form
        id="resource-form"
        class="space-y-4"
        @submit.prevent="save"
      >
        <div class="space-y-2">
          <Label for="res-loc">Локация</Label>
          <select
            id="res-loc"
            v-model="form.locationId"
            required
            :class="selectClass"
          >
            <option
              v-for="l in locations"
              :key="l.id"
              :value="l.id"
            >
              {{ l.name }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <Label for="res-name">Название</Label>
          <Input
            id="res-name"
            v-model="form.name"
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="res-type">Тип</Label>
          <select
            id="res-type"
            v-model="form.type"
            :class="selectClass"
          >
            <option
              v-for="t in resourceTypeOptions"
              :key="t.value"
              :value="t.value"
            >
              {{ t.label }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <Label for="res-cap">Вместимость</Label>
          <input
            id="res-cap"
            v-model.number="form.capacity"
            type="number"
            min="1"
            :class="selectClass"
          >
        </div>
        <div class="space-y-2">
          <Label for="res-max-booking">Макс. длительность брони (мин.)</Label>
          <input
            id="res-max-booking"
            v-model.number="form.maxBookingMinutes"
            type="number"
            min="1"
            :class="selectClass"
            placeholder="Без ограничения"
          >
        </div>
      </form>
      <template #footer>
        <Button
          type="button"
          variant="outline"
          @click="dialog = false"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          form="resource-form"
        >
          Сохранить
        </Button>
      </template>
    </FormDialog>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="`Деактивировать «${pendingResource?.name ?? ''}»?`"
      confirm-text="Деактивировать"
      cancel-text="Отмена"
      destructive
      @confirm="confirmDeactivate"
    />
  </section>
</template>
