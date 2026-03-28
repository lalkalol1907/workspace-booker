<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { apiErrorMessage } from '@/api/error-messages';
import { http } from '@/api/http';
import type { OrganizationSummary } from '@/api/types';

const router = useRouter();

const creating = ref(false);

const createName = ref('');
const createSlug = ref('');
const createHostFields = ref<string[]>(['']);

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

function addHostField() {
  createHostFields.value.push('');
}

function removeHostField(index: number) {
  if (createHostFields.value.length <= 1) {
    return;
  }
  createHostFields.value.splice(index, 1);
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
    void router.push('/tenants');
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось создать организацию'));
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
      <h2 class="mb-4 text-lg font-semibold">
        Создать организацию
      </h2>
      <form
        class="grid gap-4 md:grid-cols-2"
        @submit.prevent="submitCreate"
      >
        <input
          v-model="createName"
          placeholder="Название"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 focus:ring"
          required
        >
        <input
          v-model="createSlug"
          placeholder="slug"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 focus:ring"
          required
        >
        <div class="md:col-span-2">
          <div class="mb-2 flex items-end justify-between gap-2">
            <label class="text-xs font-medium text-slate-600">Домены (вход по хосту)</label>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              @click="addHostField"
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
                class="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-slate-200 focus:ring"
                autocomplete="off"
              >
              <button
                type="button"
                class="shrink-0 rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="createHostFields.length <= 1"
                title="Убрать поле"
                @click="removeHostField(index)"
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
            class="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
            :disabled="creating"
          >
            {{ creating ? 'Создание...' : 'Создать' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

