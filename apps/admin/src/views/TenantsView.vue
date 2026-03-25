<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import { ApiError, http } from '@/api/http';
import type { OrganizationSummary } from '@/api/types';

const rows = ref<OrganizationSummary[]>([]);
const loading = ref(false);
const creating = ref(false);
const updatingId = ref<string | null>(null);

const createForm = reactive({
  name: '',
  slug: '',
  host: '',
});

const editOpen = ref(false);
const editForm = reactive({
  id: '',
  name: '',
  slug: '',
  host: '',
});

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
  editForm.id = row.id;
  editForm.name = row.name;
  editForm.slug = row.slug;
  editForm.host = row.host;
  editOpen.value = true;
}

async function submitCreate() {
  creating.value = true;
  try {
    await http<OrganizationSummary>('/platform/organizations', {
      method: 'POST',
      body: JSON.stringify(createForm),
    });
    createForm.name = '';
    createForm.slug = '';
    createForm.host = '';
    toast.success('Организация создана');
    await loadOrganizations();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Slug или host уже заняты');
    } else {
      toast.error('Не удалось создать организацию');
    }
  } finally {
    creating.value = false;
  }
}

async function submitEdit() {
  if (!editForm.id) return;
  updatingId.value = editForm.id;
  try {
    await http<OrganizationSummary>(`/platform/organizations/${editForm.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editForm.name,
        slug: editForm.slug,
        host: editForm.host,
      }),
    });
    editOpen.value = false;
    toast.success('Организация обновлена');
    await loadOrganizations();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Slug или host уже заняты');
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
        class="grid gap-3 md:grid-cols-3"
        @submit.prevent="submitCreate"
      >
        <input
          v-model="createForm.name"
          placeholder="Название"
          class="rounded-md border px-3 py-2"
          required
        >
        <input
          v-model="createForm.slug"
          placeholder="slug"
          class="rounded-md border px-3 py-2"
          required
        >
        <input
          v-model="createForm.host"
          placeholder="host (tenant.example.com)"
          class="rounded-md border px-3 py-2"
          required
        >
        <div class="md:col-span-3">
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
              <th class="px-3 py-2 text-left">Название</th>
              <th class="px-3 py-2 text-left">Slug</th>
              <th class="px-3 py-2 text-left">Host</th>
              <th class="px-3 py-2 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-b"
            >
              <td class="px-3 py-2">{{ row.name }}</td>
              <td class="px-3 py-2">{{ row.slug }}</td>
              <td class="px-3 py-2">{{ row.host }}</td>
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
    >
      <div class="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
        <h3 class="mb-4 text-lg font-semibold">Редактировать организацию</h3>
        <form
          class="space-y-3"
          @submit.prevent="submitEdit"
        >
          <input
            v-model="editForm.name"
            placeholder="Название"
            class="w-full rounded-md border px-3 py-2"
            required
          >
          <input
            v-model="editForm.slug"
            placeholder="slug"
            class="w-full rounded-md border px-3 py-2"
            required
          >
          <input
            v-model="editForm.host"
            placeholder="host"
            class="w-full rounded-md border px-3 py-2"
            required
          >
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
              :disabled="updatingId === editForm.id"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
