<script setup lang="ts">
import { Pencil } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
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
import type { OrganizationSummary } from '@/api/types';
import { useTenantContextStore } from '@/stores/tenant-context';

const router = useRouter();
const tenant = useTenantContextStore();

const rows = ref<OrganizationSummary[]>([]);
const loading = ref(false);
const createOpen = ref(false);
const createLoading = ref(false);
const name = ref('');
const slug = ref('');
const host = ref('');

const editOpen = ref(false);
const editLoading = ref(false);
const editingId = ref<string | null>(null);
const editName = ref('');
const editSlug = ref('');
const editHost = ref('');

async function load() {
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
  void load();
});

function openCreate() {
  name.value = '';
  slug.value = '';
  host.value = '';
  createOpen.value = true;
}

function openEdit(row: OrganizationSummary) {
  editingId.value = row.id;
  editName.value = row.name;
  editSlug.value = row.slug;
  editHost.value = row.host;
  editOpen.value = true;
}

async function submitEdit() {
  const id = editingId.value;
  if (!id) {
    return;
  }
  const n = editName.value.trim();
  const s = editSlug.value.trim().toLowerCase();
  const h = editHost.value.trim().toLowerCase();
  if (!n || !s || !h) {
    toast.warning('Заполните все поля');
    return;
  }
  if (!/^[a-z0-9-]+$/.test(s)) {
    toast.warning('Slug: только латиница, цифры и дефис');
    return;
  }
  editLoading.value = true;
  try {
    await http<OrganizationSummary>(`/platform/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: n, slug: s, host: h }),
    });
    toast.success('Организация обновлена');
    editOpen.value = false;
    editingId.value = null;
    await load();
    await tenant.ensureLoadedForSuperAdmin();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Такой slug или host уже занят');
    } else if (e instanceof ApiError && e.status === 404) {
      toast.error('Организация не найдена');
    } else {
      toast.error('Не удалось сохранить');
    }
  } finally {
    editLoading.value = false;
  }
}

async function submitCreate() {
  const n = name.value.trim();
  const s = slug.value.trim().toLowerCase();
  const h = host.value.trim().toLowerCase();
  if (!n || !s || !h) {
    toast.warning('Заполните все поля');
    return;
  }
  if (!/^[a-z0-9-]+$/.test(s)) {
    toast.warning('Slug: только латиница, цифры и дефис');
    return;
  }
  createLoading.value = true;
  try {
    await http<OrganizationSummary>('/platform/organizations', {
      method: 'POST',
      body: JSON.stringify({ name: n, slug: s, host: h }),
    });
    toast.success('Организация создана');
    createOpen.value = false;
    await load();
    await tenant.ensureLoadedForSuperAdmin();
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Такой slug или host уже занят');
    } else {
      toast.error('Не удалось создать организацию');
    }
  } finally {
    createLoading.value = false;
  }
}

function useAsContext(orgId: string) {
  tenant.setSelectedOrgId(orgId);
  void router.push({ name: 'admin-users' });
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1>Платформа: организации</h1>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
          Создание тенантов и выбор организации для работы в разделах календаря и
          администрирования (контекст задаётся в боковой панели).
        </p>
      </div>
      <Button type="button" @click="openCreate">
        Новая организация
      </Button>
    </div>

    <div class="relative rounded-md border">
      <LoadingOverlay v-if="loading" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Создана</TableHead>
            <TableHead class="min-w-[220px] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in rows" :key="row.id">
            <TableCell>{{ row.name }}</TableCell>
            <TableCell>
              <code class="rounded bg-muted px-1.5 py-0.5 text-xs">{{ row.slug }}</code>
            </TableCell>
            <TableCell class="font-mono text-sm">{{ row.host }}</TableCell>
            <TableCell class="text-muted-foreground text-sm">
              {{ formatDate(row.createdAt) }}
            </TableCell>
            <TableCell class="text-right">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="shrink-0"
                  aria-label="Редактировать"
                  @click="openEdit(row)"
                >
                  <Pencil class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="useAsContext(row.id)"
                >
                  Работать в org
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <p
      v-if="!loading && !rows.length"
      class="mt-4 text-sm text-muted-foreground"
    >
      Пока нет организаций — создайте первую.
    </p>

    <FormDialog
      v-model:open="createOpen"
      title="Новая организация"
      description="Имя, slug (латиница, дефисы) и hostname, по которому пользователи заходят в тенант."
    >
      <form
        id="platform-create-org"
        class="space-y-4"
        @submit.prevent="submitCreate"
      >
        <div class="space-y-2">
          <Label for="org-name">Название</Label>
          <Input id="org-name" v-model="name" required autocomplete="off" />
        </div>
        <div class="space-y-2">
          <Label for="org-slug">Slug</Label>
          <Input
            id="org-slug"
            v-model="slug"
            placeholder="acme-corp"
            required
            autocomplete="off"
          />
        </div>
        <div class="space-y-2">
          <Label for="org-host">Host</Label>
          <Input
            id="org-host"
            v-model="host"
            placeholder="booker.example.com"
            required
            autocomplete="off"
          />
        </div>
      </form>
      <template #footer>
        <Button type="button" variant="outline" @click="createOpen = false">
          Отмена
        </Button>
        <Button
          type="submit"
          form="platform-create-org"
          :disabled="createLoading"
        >
          {{ createLoading ? 'Создание…' : 'Создать' }}
        </Button>
      </template>
    </FormDialog>

    <FormDialog
      v-model:open="editOpen"
      title="Редактировать организацию"
      description="Изменение имени, slug или host влияет на вход пользователей по новому host."
    >
      <form
        id="platform-edit-org"
        class="space-y-4"
        @submit.prevent="submitEdit"
      >
        <div class="space-y-2">
          <Label for="edit-org-name">Название</Label>
          <Input
            id="edit-org-name"
            v-model="editName"
            required
            autocomplete="off"
          />
        </div>
        <div class="space-y-2">
          <Label for="edit-org-slug">Slug</Label>
          <Input
            id="edit-org-slug"
            v-model="editSlug"
            required
            autocomplete="off"
          />
        </div>
        <div class="space-y-2">
          <Label for="edit-org-host">Host</Label>
          <Input
            id="edit-org-host"
            v-model="editHost"
            required
            autocomplete="off"
          />
        </div>
      </form>
      <template #footer>
        <Button type="button" variant="outline" @click="editOpen = false">
          Отмена
        </Button>
        <Button
          type="submit"
          form="platform-edit-org"
          :disabled="editLoading"
        >
          {{ editLoading ? 'Сохранение…' : 'Сохранить' }}
        </Button>
      </template>
    </FormDialog>
  </div>
</template>
