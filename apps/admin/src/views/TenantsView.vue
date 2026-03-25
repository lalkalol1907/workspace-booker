<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { ApiError, http } from '@/api/http';
import type { OrganizationSummary } from '@/api/types';

const rows = ref<OrganizationSummary[]>([]);
const loading = ref(false);
const creating = ref(false);
const updatingId = ref<string | null>(null);

const createName = ref('');
const createSlug = ref('');
const createHostFields = ref<string[]>(['']);

const editOpen = ref(false);
const editName = ref('');
const editSlug = ref('');
const editId = ref('');
const editHostFields = ref<string[]>(['']);

/** Уникальные непустые домены после trim (нормализация на сервере). */
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

function addCreateHostField() {
  createHostFields.value.push('');
}

function removeCreateHostField(index: number) {
  if (createHostFields.value.length <= 1) {
    return;
  }
  createHostFields.value.splice(index, 1);
}

function addEditHostField() {
  editHostFields.value.push('');
}

function removeEditHostField(index: number) {
  if (editHostFields.value.length <= 1) {
    return;
  }
  editHostFields.value.splice(index, 1);
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

function openEdit(row: OrganizationSummary) {
  editId.value = row.id;
  editName.value = row.name;
  editSlug.value = row.slug;
  editHostFields.value =
    row.hosts.length > 0 ? row.hosts.map((h) => h) : [''];
  editOpen.value = true;
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
    createName.value = '';
    createSlug.value = '';
    createHostFields.value = [''];
    toast.success('Организация создана');
    await loadOrganizations();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Slug или один из доменов уже заняты');
    } else {
      toast.error('Не удалось создать организацию');
    }
  } finally {
    creating.value = false;
  }
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
    } else {
      toast.error('Не удалось обновить организацию');
    }
  } finally {
    updatingId.value = null;
  }
}
</script>

<template>
  <div class="space-y-8">
    <section class="rounded-xl border bg-white p-5 shadow-sm">
      <h1 class="mb-2 text-2xl font-semibold">Организации платформы</h1>
      <p class="text-sm text-slate-600">Создание и редактирование тенантов.</p>
    </section>

    <section class="rounded-xl border bg-white p-5 shadow-sm">
      <h2 class="mb-4 text-lg font-semibold">Создать организацию</h2>
      <form
        class="grid gap-4 md:grid-cols-2"
        @submit.prevent="submitCreate"
      >
        <input
          v-model="createName"
          placeholder="Название"
          class="rounded-md border border-slate-300 px-3 py-2"
          required
        >
        <input
          v-model="createSlug"
          placeholder="slug"
          class="rounded-md border border-slate-300 px-3 py-2"
          required
        >
        <div class="md:col-span-2">
          <div class="mb-2 flex items-end justify-between gap-2">
            <label class="text-xs font-medium text-slate-600">Домены (вход по хосту)</label>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
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
                :placeholder="index === 0 ? 'booker.example.com' : 'дополнительный домен'"
                class="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                autocomplete="off"
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
        <div class="md:col-span-2">
          <button
            type="submit"
            class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-60"
            :disabled="creating"
          >
            {{ creating ? 'Создание...' : 'Создать' }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-xl border bg-white p-5 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Список</h2>
        <button
          type="button"
          class="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-100"
          @click="loadOrganizations"
        >
          Обновить
        </button>
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
            <tr class="border-b bg-slate-50">
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
              class="border-b"
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
                  class="rounded-md border px-3 py-1.5 hover:bg-slate-100"
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
            class="w-full rounded-md border border-slate-300 px-3 py-2"
            required
          >
          <input
            v-model="editSlug"
            placeholder="slug"
            class="w-full rounded-md border border-slate-300 px-3 py-2"
            required
          >
          <div>
            <div class="mb-2 flex items-end justify-between gap-2">
              <label class="text-xs font-medium text-slate-600">Домены</label>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
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
                  class="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
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
              class="rounded-md border px-3 py-1.5 hover:bg-slate-100"
              @click="editOpen = false"
            >
              Отмена
            </button>
            <button
              type="submit"
              class="rounded-md bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-500 disabled:opacity-60"
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
