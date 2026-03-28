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
import { apiErrorMessage } from '@/api/error-messages';
import { http } from '@/api/http';
import type { LocationDto } from '@/api/types';
import { cn } from '@/lib/utils';

const selectClass = cn(
  'select-glass flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
);

const rows = ref<LocationDto[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  name: '',
  parentId: '' as string,
});

const confirmOpen = ref(false);
const pendingLocation = ref<LocationDto | null>(null);

async function load() {
  loading.value = true;
  try {
    rows.value = await http<LocationDto[]>('/locations');
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось загрузить локации'));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function openCreate() {
  editingId.value = null;
  form.name = '';
  form.parentId = '';
  dialog.value = true;
}

function openEdit(row: LocationDto) {
  editingId.value = row.id;
  form.name = row.name;
  form.parentId = row.parentId ?? '';
  dialog.value = true;
}

async function save() {
  if (!form.name.trim()) {
    toast.warning('Укажите название');
    return;
  }
  try {
    if (editingId.value) {
      await http(`/locations/${editingId.value}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name.trim(),
          parentId: form.parentId || null,
        }),
      });
    } else {
      await http('/locations', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          parentId: form.parentId || undefined,
        }),
      });
    }
    dialog.value = false;
    toast.success('Сохранено');
    await load();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Ошибка сохранения'));
  }
}

function askRemove(row: LocationDto) {
  pendingLocation.value = row;
  confirmOpen.value = true;
}

async function confirmRemove() {
  const row = pendingLocation.value;
  if (!row) {
    return;
  }
  try {
    await http(`/locations/${row.id}`, { method: 'DELETE' });
    toast.success('Удалено');
    pendingLocation.value = null;
    confirmOpen.value = false;
    await load();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось удалить локацию'));
  }
}

function parentOptions() {
  return rows.value.filter((r) => r.id !== editingId.value);
}
</script>

<template>
  <section class="space-y-4">
    <div class="glass-panel mb-4 flex flex-wrap items-start justify-between gap-4 px-5 py-4">
      <div class="min-w-0">
        <h1>Локации</h1>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
          Иерархия помещений и зон: укажите родителя для вложенности. Удалить
          локацию можно только если у неё нет дочерних и привязанных ресурсов.
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
            <TableHead>Родитель</TableHead>
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
            <TableCell>
              {{ rows.find((r) => r.id === row.parentId)?.name ?? '—' }}
            </TableCell>
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
                variant="ghost"
                size="icon"
                class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                type="button"
                aria-label="Удалить"
                @click="askRemove(row)"
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
      :title="editingId ? 'Редактировать' : 'Новая локация'"
    >
      <form
        id="loc-form"
        class="space-y-4"
        @submit.prevent="save"
      >
        <div class="space-y-2">
          <Label for="loc-name">Название</Label>
          <Input
            id="loc-name"
            v-model="form.name"
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="loc-parent">Родитель (необязательно)</Label>
          <select
            id="loc-parent"
            v-model="form.parentId"
            :class="selectClass"
          >
            <option value="">
              —
            </option>
            <option
              v-for="p in parentOptions()"
              :key="p.id"
              :value="p.id"
            >
              {{ p.name }}
            </option>
          </select>
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
          form="loc-form"
        >
          Сохранить
        </Button>
      </template>
    </FormDialog>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="`Удалить «${pendingLocation?.name ?? ''}»?`"
      confirm-text="Удалить"
      cancel-text="Отмена"
      destructive
      @confirm="confirmRemove"
    />
  </section>
</template>
