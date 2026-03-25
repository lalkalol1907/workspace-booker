<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { ApiError, http } from '@/api/http';
import type { OrganizationSummary } from '@/api/types';

const rows = ref<OrganizationSummary[]>([]);
const loading = ref(false);

const createOpen = ref(false);
const creating = ref(false);
const createName = ref('');
const createSlug = ref('');
const createHostFields = ref<string[]>(['']);

const editOpen = ref(false);
const editName = ref('');
const editSlug = ref('');
const editId = ref('');
const editHostFields = ref<string[]>(['']);
const updatingId = ref<string | null>(null);

/** Уникальные непустые домены после trim. */
function normalizeHostList(fields: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of fields) {
    const s = raw.trim();
    if (!s || seen.has(s)) {
      continue;
    }
    seen.add(s);
    out.push(s);
  }
  return out;
}

async function loadOrganizations() {
  loading.value = true;
  try {
    rows.value = await http<OrganizationSummary[]>('/platform/organizations');
  } catch {
    toast.error('Не удалось загрузить организации');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadOrganizations();
});

function addEditHostField() {
  editHostFields.value.push('');
}

function removeEditHostField(index: number) {
  if (editHostFields.value.length <= 1) {
    return;
  }
  editHostFields.value.splice(index, 1);
}

function openEdit(row: OrganizationSummary) {
  editId.value = row.id;
  editName.value = row.name;
  editSlug.value = row.slug;
  editHostFields.value = row.hosts.length > 0 ? row.hosts.map((h) => h) : [''];
  editOpen.value = true;
}

function openCreate() {
  createName.value = '';
  createSlug.value = '';
  createHostFields.value = [''];
  createOpen.value = true;
}

function closeCreate() {
  createOpen.value = false;
}

function addCreateHostField() {
  createHostFields.value.push('');
}

function removeCreateHostField(index: number) {
  if (createHostFields.value.length <= 1) {
    return;
  }
  createHostFields.value.splice(index, 1);
}

async function submitEdit() {
  if (!editId.value) return;
  const hosts = normalizeHostList(editHostFields.value);
  if (hosts.length === 0) {
    toast.error('Укажите хотя бы один домен');
    return;
  }
  updatingId.value = editId.value;
  try {
    await http<OrganizationSummary>(
      `/platform/organizations/${editId.value}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.value.trim(),
          slug: editSlug.value.trim(),
          hosts,
        }),
      },
    );
    editOpen.value = false;
    toast.success('Организация обновлена');
    await loadOrganizations();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Slug или один из доменов уже заняты');
    } else if (e instanceof ApiError && e.status === 400) {
      toast.error(e.message || 'Некорректные данные организации');
    } else {
      toast.error('Не удалось обновить организацию');
    }
  } finally {
    updatingId.value = null;
  }
}

async function submitCreate() {
  const hosts = normalizeHostList(createHostFields.value);
  if (hosts.length === 0) {
    toast.error('Укажите хотя бы один домен');
    return;
  }
  creating.value = true;
  try {
    await http<OrganizationSummary>('/platform/organizations', {
      method: 'POST',
      body: JSON.stringify({
        name: createName.value.trim(),
        slug: createSlug.value.trim(),
        hosts,
      }),
    });
    toast.success('Организация создана');
    closeCreate();
    await loadOrganizations();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Slug или один из доменов уже заняты');
    } else if (e instanceof ApiError && e.status === 400) {
      toast.error(e.message || 'Некорректные данные организации');
    } else {
      toast.error('Не удалось создать организацию');
    }
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <section
      class="rounded-xl border border-slate-300 bg-white p-5 shadow-sm"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Список</h2>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            @click="loadOrganizations"
          >
            Обновить
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
            @click="openCreate"
          >
            Создать
          </button>
        </div>
      </div>

      <div
        v-if="loading"
        class="text-sm text-slate-600"
      >
        Загрузка...
      </div>

      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-y border-slate-300 bg-slate-100">
              <th class="px-3 py-2 text-left">
                Название
              </th>
              <th class="px-3 py-2 text-left">
                Slug
              </th>
              <th class="px-3 py-2 text-left">
                Домены
              </th>
              <th class="px-3 py-2 text-right">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-b border-slate-200"
            >
              <td class="px-3 py-2">
                {{ row.name }}
              </td>
              <td class="px-3 py-2">
                {{ row.slug }}
              </td>
              <td class="max-w-md px-3 py-2 align-top">
                <span class="block whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
                  {{ row.hosts.join('\n') }}
                </span>
              </td>
              <td class="px-3 py-2 text-right">
                <button
                  type="button"
                  class="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                  @click="openEdit(row)"
                >
                  Редактировать
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div
      v-if="createOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeCreate"
    >
      <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
        <h3 class="mb-4 text-lg font-semibold">Создать организацию</h3>
        <form
          class="space-y-4"
          @submit.prevent="submitCreate"
        >
          <input
            v-model="createName"
            placeholder="Название"
            class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 focus:ring"
            required
          >
          <input
            v-model="createSlug"
            placeholder="slug"
            class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 focus:ring"
            required
          >
          <div>
            <div class="mb-2 flex items-end justify-between gap-2">
              <label class="text-xs font-medium text-slate-600">Домены</label>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                @click="addCreateHostField"
              >
                <span class="text-base leading-none">+</span>
                Добавить домен
              </button>
            </div>
            <ul class="space-y-2">
              <li
                v-for="(_h, index) in createHostFields"
                :key="`create-host-${index}`"
                class="flex items-center gap-2"
              >
                <input
                  v-model="createHostFields[index]"
                  type="text"
                  class="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-slate-200 focus:ring"
                  autocomplete="off"
                  :placeholder="index === 0 ? 'booker.example.com' : 'дополнительный домен'"
                >
                <button
                  type="button"
                  class="shrink-0 rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="createHostFields.length <= 1"
                  title="Убрать поле"
                  @click="removeCreateHostField(index)"
                >
                  −
                </button>
              </li>
            </ul>
            <p class="mt-2 text-xs text-slate-500">
              Без схемы https://. Пустые строки при сохранении игнорируются. Минимум один непустой домен.
            </p>
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              @click="closeCreate"
            >
              Отмена
            </button>
            <button
              type="submit"
              class="rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-white hover:bg-black disabled:opacity-60"
              :disabled="creating"
            >
              {{ creating ? 'Создание...' : 'Создать' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="editOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="editOpen = false"
    >
      <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
        <h3 class="mb-4 text-lg font-semibold">Редактировать организацию</h3>
        <form
          class="space-y-4"
          @submit.prevent="submitEdit"
        >
          <input
            v-model="editName"
            placeholder="Название"
            class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 focus:ring"
            required
          >
          <input
            v-model="editSlug"
            placeholder="slug"
            class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 focus:ring"
            required
          >
          <div>
            <div class="mb-2 flex items-end justify-between gap-2">
              <label class="text-xs font-medium text-slate-600">Домены</label>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                @click="addEditHostField"
              >
                <span class="text-base leading-none">+</span>
                Добавить домен
              </button>
            </div>
            <ul class="space-y-2">
              <li
                v-for="(_h, index) in editHostFields"
                :key="`edit-host-${index}`"
                class="flex items-center gap-2"
              >
                <input
                  v-model="editHostFields[index]"
                  type="text"
                  class="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-slate-200 focus:ring"
                  autocomplete="off"
                >
                <button
                  type="button"
                  class="shrink-0 rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="editHostFields.length <= 1"
                  title="Убрать поле"
                  @click="removeEditHostField(index)"
                >
                  −
                </button>
              </li>
            </ul>
            <p class="mt-2 text-xs text-slate-500">
              Сохранение полностью заменяет список доменов.
            </p>
          </div>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              @click="editOpen = false"
            >
              Отмена
            </button>
            <button
              type="submit"
              class="rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-white hover:bg-black disabled:opacity-60"
              :disabled="updatingId === editId"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

