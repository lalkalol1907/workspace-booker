<script setup lang="ts">
import { KeyRound, Trash2 } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
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
import { ApiError, http } from '@/api/http';
import type { InviteUserResponse, UserSummary } from '@/api/types';
import { useAuthStore } from '@/stores/auth';
import { useTenantContextStore } from '@/stores/tenant-context';

const auth = useAuthStore();
const tenant = useTenantContextStore();

const inviteModalOpen = ref(false);
const email = ref('');
const displayName = ref('');
const inviteLoading = ref(false);

const resultOpen = ref(false);
const resultTitle = ref('Доступ выдан');
const inviteResult = ref<InviteUserResponse | null>(null);

const rows = ref<UserSummary[]>([]);
const listLoading = ref(false);
const roleUpdatingId = ref<string | null>(null);

const confirmOpen = ref(false);
const pendingDelete = ref<UserSummary | null>(null);

const resetConfirmOpen = ref(false);
const pendingReset = ref<UserSummary | null>(null);
const resetLoading = ref(false);

function roleLabel(role: string) {
  if (role === 'super_admin') {
    return 'Админ платформы';
  }
  if (role === 'admin') {
    return 'Администратор';
  }
  return 'Участник';
}

function openInviteModal() {
  email.value = '';
  displayName.value = '';
  inviteModalOpen.value = true;
}

async function loadUsers() {
  listLoading.value = true;
  try {
    rows.value = await http<UserSummary[]>('/users');
  } catch {
    toast.error('Не удалось загрузить пользователей');
  } finally {
    listLoading.value = false;
  }
}

onMounted(() => {
  void loadUsers();
});

async function submitInvite() {
  const em = email.value.trim();
  if (!em) {
    toast.warning('Укажите email');
    return;
  }
  inviteLoading.value = true;
  try {
    const body: { email: string; displayName?: string } = { email: em };
    const dn = displayName.value.trim();
    if (dn) {
      body.displayName = dn;
    }
    const res = await http<InviteUserResponse>('/users/invite', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    inviteModalOpen.value = false;
    resultTitle.value = 'Доступ выдан';
    inviteResult.value = res;
    resultOpen.value = true;
    email.value = '';
    displayName.value = '';
    toast.success('Пользователь создан');
    await loadUsers();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Пользователь с таким email уже есть');
    } else {
      toast.error('Не удалось создать пользователя');
    }
  } finally {
    inviteLoading.value = false;
  }
}

async function copyPassword() {
  const t = inviteResult.value?.temporaryPassword;
  if (!t) {
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
    } else {
      throw new Error('Clipboard API is unavailable');
    }
    toast.success('Пароль скопирован');
  } catch {
    toast.error('Не удалось скопировать');
  }
}

function askDelete(row: UserSummary) {
  pendingDelete.value = row;
  confirmOpen.value = true;
}

async function confirmDelete() {
  const row = pendingDelete.value;
  if (!row) {
    return;
  }
  try {
    await http<void>(`/users/${row.id}`, { method: 'DELETE' });
    toast.success('Пользователь удалён');
    pendingDelete.value = null;
    confirmOpen.value = false;
    await loadUsers();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 403) {
      toast.error('Нельзя удалить себя или администратора');
    } else if (e instanceof ApiError && e.status === 404) {
      toast.error('Пользователь не найден');
    } else {
      toast.error('Не удалось удалить');
    }
  }
}

function canDelete(row: UserSummary) {
  if (row.id === auth.user?.userId) {
    return false;
  }
  if (row.role === 'admin') {
    return false;
  }
  return true;
}

function canResetPassword(row: UserSummary) {
  if (row.id === auth.user?.userId) {
    return false;
  }
  if (row.role === 'admin') {
    return auth.isSuperAdmin;
  }
  return true;
}

function askResetPassword(row: UserSummary) {
  pendingReset.value = row;
  resetConfirmOpen.value = true;
}

async function confirmResetPassword() {
  if (resetLoading.value) {
    return;
  }
  const row = pendingReset.value;
  if (!row) {
    return;
  }
  resetLoading.value = true;
  try {
    const res = await http<InviteUserResponse>(
      `/users/${row.id}/reset-password`,
      { method: 'POST' },
    );
    resultTitle.value = 'Пароль сброшен';
    inviteResult.value = res;
    resetConfirmOpen.value = false;
    pendingReset.value = null;
    resultOpen.value = true;
    toast.success('Новый временный пароль сгенерирован');
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 403) {
      toast.error('Нельзя сбросить пароль себе или другому администратору');
    } else if (e instanceof ApiError && e.status === 404) {
      toast.error('Пользователь не найден');
    } else {
      toast.error('Не удалось сбросить пароль');
    }
  } finally {
    resetLoading.value = false;
  }
}

function canChangeTenantRole(row: UserSummary): boolean {
  if (!auth.isSuperAdmin) {
    return false;
  }
  if (row.role === 'super_admin') {
    return false;
  }
  if (row.id === auth.user?.userId) {
    return false;
  }
  return true;
}

async function setTenantRole(row: UserSummary, role: 'admin' | 'member') {
  const currentRole = row.role === 'admin' ? 'admin' : 'member';
  if (currentRole === role) {
    return;
  }
  const orgId = tenant.selectedOrgId;
  if (!orgId) {
    toast.error('Выберите организацию в селекторе');
    return;
  }

  roleUpdatingId.value = row.id;
  try {
    await http<void>(`/platform/organizations/${orgId}/users/${row.id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    toast.success('Роль обновлена');
    await loadUsers();
  } catch {
    toast.error('Не удалось изменить роль');
  } finally {
    roleUpdatingId.value = null;
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="glass-panel mb-6 flex flex-wrap items-start justify-between gap-4 px-5 py-4">
      <div>
        <h1>Пользователи</h1>
        <p class="mt-2 max-w-xl text-sm text-muted-foreground">
          Сброс пароля выдаёт новый одноразовый пароль; пользователь сменит его
          при следующем входе. Удаление пользователя навсегда убирает его и
          все его брони в этой организации.
          <span
            v-if="auth.isSuperAdmin"
            class="block pt-1"
          >
            Только админ платформы может назначать администраторов в колонке
            «Роль».
          </span>
        </p>
      </div>
      <Button
        type="button"
        @click="openInviteModal"
      >
        Пригласить пользователя
      </Button>
    </div>

    <h2 class="mb-3 text-lg font-semibold">
      Список
    </h2>
    <div class="glass-panel relative p-3">
      <LoadingOverlay v-if="listLoading" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Имя</TableHead>
            <TableHead class="min-w-[200px]">
              Роль
            </TableHead>
            <TableHead class="w-[120px] text-right">
              Действия
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="row in rows"
            :key="row.id"
          >
            <TableCell>{{ row.email }}</TableCell>
            <TableCell>{{ row.displayName }}</TableCell>
            <TableCell>
              <select
                v-if="canChangeTenantRole(row)"
                class="select-glass flex h-9 max-w-[220px] rounded-xl border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                :value="row.role === 'admin' ? 'admin' : 'member'"
                :disabled="roleUpdatingId === row.id"
                @change="
                  setTenantRole(
                    row,
                    ($event.target as HTMLSelectElement).value as
                      | 'admin'
                      | 'member',
                  )
                "
              >
                <option value="member">
                  Участник
                </option>
                <option value="admin">
                  Администратор
                </option>
              </select>
              <span v-else>{{ roleLabel(row.role) }}</span>
            </TableCell>
            <TableCell class="flex justify-end gap-0.5">
              <Button
                v-if="canResetPassword(row)"
                variant="ghost"
                size="icon"
                class="text-muted-foreground hover:text-foreground"
                type="button"
                aria-label="Сбросить пароль"
                title="Сбросить пароль"
                @click="askResetPassword(row)"
              >
                <KeyRound class="size-4" />
              </Button>
              <Button
                v-if="canDelete(row)"
                variant="ghost"
                size="icon"
                class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                type="button"
                aria-label="Удалить пользователя"
                @click="askDelete(row)"
              >
                <Trash2 class="size-4" />
              </Button>
              <span
                v-if="!canResetPassword(row) && !canDelete(row)"
                class="px-2 text-xs text-muted-foreground"
              >—</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <FormDialog
      v-model:open="inviteModalOpen"
      title="Пригласить пользователя"
      description="Будет создан участник с временным паролем. Сохраните пароль из следующего окна."
    >
      <form
        id="invite-form"
        class="space-y-4"
        @submit.prevent="submitInvite"
      >
        <div class="space-y-2">
          <Label for="inv-email">Email</Label>
          <Input
            id="inv-email"
            v-model="email"
            type="email"
            autocomplete="off"
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="inv-name">Имя (необязательно)</Label>
          <Input
            id="inv-name"
            v-model="displayName"
            autocomplete="off"
          />
        </div>
      </form>
      <template #footer>
        <Button
          type="button"
          variant="outline"
          @click="inviteModalOpen = false"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          form="invite-form"
          :disabled="inviteLoading"
        >
          {{ inviteLoading ? 'Создание…' : 'Выдать доступ' }}
        </Button>
      </template>
    </FormDialog>

    <FormDialog
      v-model:open="resultOpen"
      :title="resultTitle"
    >
      <div
        v-if="inviteResult"
        class="space-y-3 text-sm"
      >
        <p>
          <span class="text-muted-foreground">Email:</span>
          {{ inviteResult.email }}
        </p>
        <p>
          <span class="text-muted-foreground">Временный пароль:</span>
          <code
            class="ml-2 rounded bg-muted px-2 py-0.5 font-mono text-xs"
          >{{ inviteResult.temporaryPassword }}</code>
        </p>
        <p class="text-xs text-muted-foreground">
          Сообщите пользователю пароль по безопасному каналу. Повторно он не
          отобразится.
        </p>
        <Button
          type="button"
          variant="outline"
          @click="copyPassword"
        >
          Скопировать пароль
        </Button>
      </div>
      <template #footer>
        <Button
          type="button"
          @click="resultOpen = false"
        >
          Закрыть
        </Button>
      </template>
    </FormDialog>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="`Удалить пользователя ${pendingDelete?.email ?? ''}?`"
      description="Все брони этого пользователя будут удалены без возможности восстановления."
      confirm-text="Удалить"
      cancel-text="Отмена"
      destructive
      @confirm="confirmDelete"
    />

    <ConfirmDialog
      v-model:open="resetConfirmOpen"
      :title="`Сбросить пароль: ${pendingReset?.email ?? ''}?`"
      description="Будет сгенерирован новый одноразовый пароль. Текущий пароль перестанет действовать. Пользователь обязан будет сменить пароль при входе."
      confirm-text="Сбросить"
      cancel-text="Отмена"
      @confirm="confirmResetPassword"
    />
  </section>
</template>
