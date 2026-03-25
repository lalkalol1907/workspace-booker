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
  <div class="mx-auto mt-10 max-w-md rounded-xl border bg-white p-6 shadow-sm">
    <h1 class="mb-2 text-2xl font-semibold">Platform Admin</h1>
    <p class="mb-6 text-sm text-slate-600">Вход только для super_admin.</p>
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
          class="w-full rounded-md border px-3 py-2 outline-none ring-indigo-200 focus:ring"
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
          class="w-full rounded-md border px-3 py-2 outline-none ring-indigo-200 focus:ring"
          required
        >
      </div>
      <button
        type="submit"
        class="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? 'Вход...' : 'Войти' }}
      </button>
    </form>
  </div>
</template>
