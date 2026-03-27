<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    await auth.platformLogin({
      email: email.value.trim(),
      password: password.value,
    });
    const redirect = route.query.redirect as string | undefined;
    await router.push(redirect || '/tenants');
  } catch {
    toast.error('Неверные данные или нет доступа platform admin');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto mt-14 max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
    <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
      Platform Console
    </p>
    <h1 class="mb-2 text-2xl font-semibold tracking-tight">
      Авторизация
    </h1>
    <p class="mb-6 text-sm text-slate-600">
      Доступ только для super_admin.
    </p>
    <form
      class="space-y-4"
      @submit.prevent="submit"
    >
      <div>
        <label
          class="mb-1 block text-sm font-medium"
          for="email"
        >Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="username"
          class="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
          required
        >
      </div>
      <div>
        <label
          class="mb-1 block text-sm font-medium"
          for="password"
        >Пароль</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          class="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
          required
        >
      </div>
      <button
        type="submit"
        class="w-full rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? 'Вход...' : 'Войти' }}
      </button>
    </form>
  </div>
</template>
