<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import Button from '@/components/ui/button/Button.vue';
import Card from '@/components/ui/card/Card.vue';
import CardContent from '@/components/ui/card/CardContent.vue';
import CardHeader from '@/components/ui/card/CardHeader.vue';
import CardTitle from '@/components/ui/card/CardTitle.vue';
import Input from '@/components/ui/input/Input.vue';
import Label from '@/components/ui/label/Label.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);

async function submit() {
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Пароли не совпадают');
    return;
  }
  if (newPassword.value.length < 8) {
    toast.error('Новый пароль: минимум 8 символов');
    return;
  }
  loading.value = true;
  try {
    await auth.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    toast.success('Пароль обновлён');
    const redirect = route.query.redirect as string | undefined;
    await router.replace(redirect || '/calendar');
  } catch {
    toast.error('Не удалось сменить пароль (проверьте текущий пароль)');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md pt-8">
    <Card>
      <CardHeader>
        <CardTitle>Смена пароля</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="mb-4 text-sm text-muted-foreground">
          Установите новый пароль для входа. Временный пароль больше не будет
          действовать.
        </p>
        <form class="space-y-4" @submit.prevent="submit">
          <div class="space-y-2">
            <Label for="cur-pw">Текущий пароль</Label>
            <Input
              id="cur-pw"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
            />
          </div>
          <div class="space-y-2">
            <Label for="new-pw">Новый пароль</Label>
            <Input
              id="new-pw"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <div class="space-y-2">
            <Label for="new-pw2">Повторите новый пароль</Label>
            <Input
              id="new-pw2"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Сохранение…' : 'Сохранить' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
