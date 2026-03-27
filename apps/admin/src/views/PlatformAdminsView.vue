<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { ApiError, http } from '@/api/http';
import type {
  PlatformAdminSummary,
  PlatformAdminUpsertResult,
} from '@/api/types';

const admins = ref<PlatformAdminSummary[]>([]);
const adminsLoading = ref(false);
const adminSaving = ref(false);
const adminEmail = ref('');
const adminDisplayName = ref('');
const adminResult = ref<PlatformAdminUpsertResult | null>(null);

async function loadAdmins() {
  adminsLoading.value = true;
  try {
    admins.value = await http<PlatformAdminSummary[]>('/platform/admins');
  } catch {
    toast.error('Не удалось загрузить админов платформы');
  } finally {
    adminsLoading.value = false;
  }
}

onMounted(() => {
  void loadAdmins();
});

async function submitPlatformAdmin() {
  const email = adminEmail.value.trim();
  if (!email) {
    toast.error('Укажите email');
    return;
  }
  adminSaving.value = true;
  try {
    adminResult.value = await http<PlatformAdminUpsertResult>(
      '/platform/admins',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          displayName: adminDisplayName.value.trim() || undefined,
        }),
      },
    );
    adminEmail.value = '';
    adminDisplayName.value = '';
    if (adminResult.value.action === 'created') {
      toast.success('Админ платформы создан');
    } else if (adminResult.value.action === 'promoted') {
      toast.success('Пользователь повышен до админа платформы');
    } else {
      toast.info('Пользователь уже является админом платформы');
    }
    await loadAdmins();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Найдено несколько пользователей с таким email');
    } else if (e instanceof ApiError && e.status === 400) {
      toast.error(e.message || 'Некорректные данные');
    } else {
      toast.error('Не удалось назначить админа платформы');
    }
  } finally {
    adminSaving.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <section
      class="rounded-xl border border-slate-300 bg-white p-5 shadow-sm"
    >
      <h2 class="mb-4 text-lg font-semibold">
        Админы платформы
      </h2>
      <form
        class="grid gap-3 md:grid-cols-3"
        @submit.prevent="submitPlatformAdmin"
      >
        <input
          v-model="adminEmail"
          type="email"
          placeholder="email"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
          required
        >
        <input
          v-model="adminDisplayName"
          placeholder="Имя (необязательно)"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
        >
        <div>
          <button
            type="submit"
            class="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
            :disabled="adminSaving"
          >
            {{ adminSaving ? 'Сохранение...' : 'Добавить / повысить' }}
          </button>
        </div>
      </form>

      <div
        v-if="adminResult"
        class="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm"
      >
        <p>
          <strong>Результат:</strong>
          {{
            adminResult.action === 'created'
              ? 'создан новый админ платформы'
              : adminResult.action === 'promoted'
                ? 'существующий пользователь повышен'
                : 'пользователь уже super_admin'
          }}
        </p>
        <p class="mt-1">
          {{ adminResult.email }} ({{ adminResult.displayName }})
        </p>
        <p
          v-if="adminResult.temporaryPassword"
          class="mt-1"
        >
          Одноразовый пароль:
          <code class="rounded bg-white px-2 py-0.5 font-mono text-xs">{{
            adminResult.temporaryPassword
          }}</code>
        </p>
      </div>

      <div class="mt-4">
        <p
          v-if="adminsLoading"
          class="text-sm text-slate-600"
        >
          Загрузка...
        </p>
        <ul
          v-else
          class="space-y-1 text-sm"
        >
          <li
            v-for="a in admins"
            :key="a.id"
            class="rounded-md border border-slate-200 px-3 py-2"
          >
            <span class="font-medium">{{ a.displayName }}</span>
            <span class="text-slate-600"> — {{ a.email }}</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

