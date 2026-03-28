<script setup lang="ts">
import type { DateSelectArg, EventInput, EventSourceFuncArg } from '@fullcalendar/core';
import ruLocale from '@fullcalendar/core/locales/ru';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/vue3';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { apiErrorMessage } from '@/api/error-messages';
import Button from '@/components/ui/button/Button.vue';
import FormDialog from '@/components/ui/dialog/FormDialog.vue';
import Input from '@/components/ui/input/Input.vue';
import Label from '@/components/ui/label/Label.vue';
import ConfirmDialog from '@/components/ui/alert-dialog/ConfirmDialog.vue';
import LoadingOverlay from '@/components/ui/loading-overlay/LoadingOverlay.vue';
import { http } from '@/api/http';
import type { BookingDto, BookingStatus, ResourceDto } from '@/api/types';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useIsMdUp } from '@/composables/useMediaQuery';
import { cn } from '@/lib/utils';

const isMdUp = useIsMdUp();

const selectClass = cn(
  'select-glass flex h-9 min-w-[200px] max-w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[320px]',
);

const inputClass = cn(
  'flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const auth = useAuthStore();
const theme = useThemeStore();

/** HSL из theme tokens на :root (учитывает брендинг тенанта). */
function hslFromCssVar(name: string, alpha: number): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) {
    return `hsl(0 0% 50% / ${alpha})`;
  }
  return `hsl(${raw} / ${alpha})`;
}

function hslSolidFromCssVar(name: string): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) {
    return 'hsl(0 0% 50%)';
  }
  return `hsl(${raw})`;
}

function calendarEventColors(dark: boolean, mine: boolean) {
  if (dark) {
    if (mine) {
      return {
        backgroundColor: hslFromCssVar('--primary', 0.38),
        borderColor: hslFromCssVar('--primary', 0.55),
        textColor: hslSolidFromCssVar('--foreground'),
      };
    }
    return {
      backgroundColor: hslFromCssVar('--muted', 0.55),
      borderColor: hslFromCssVar('--border', 0.55),
      textColor: hslSolidFromCssVar('--muted-foreground'),
    };
  }
  if (mine) {
    return {
      backgroundColor: hslFromCssVar('--primary', 0.16),
      borderColor: hslFromCssVar('--primary', 0.42),
      textColor: hslSolidFromCssVar('--foreground'),
    };
  }
  return {
    backgroundColor: hslFromCssVar('--muted', 0.92),
    borderColor: hslFromCssVar('--border', 0.78),
    textColor: hslSolidFromCssVar('--muted-foreground'),
  };
}

const resources = ref<ResourceDto[]>([]);
const resourceId = ref('');
const loading = ref(false);
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null);

const bookingModalOpen = ref(false);
const editingBookingId = ref<string | null>(null);
const editingBookingMeta = ref<{ userDisplayName: string; userEmail: string } | null>(
  null,
);
const bookingTitle = ref('');
const bookingStart = ref('');
const bookingEnd = ref('');

const cancelConfirmOpen = ref(false);
const cancelLoading = ref(false);
const pendingCancel = ref<{
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
  userDisplayName: string;
  userEmail: string;
} | null>(null);

const calendarExpanded = ref(true);

// Control visible time range (for timeGrid views).
// Default range: 07:00 - 22:00; expanded via buttons to midnight bounds.
const fromMidnight = ref(false);
const toMidnight = ref(false);

const slotMinTime = computed(() =>
  fromMidnight.value ? '00:00:00' : '07:00:00',
);
const slotMaxTime = computed(() =>
  toMidnight.value ? '24:00:00' : '22:00:00',
);
const scrollTime = computed(() => (fromMidnight.value ? '00:00:00' : '08:00:00'));

const selectedResource = computed(
  () => resources.value.find((r) => r.id === resourceId.value) ?? null,
);

const bookingModalDescription = computed(() => {
  const base = editingBookingId.value
    ? 'Измените название и время. Пересечение с другими подтверждёнными бронями на этот ресурс недопустимо.'
    : 'Укажите название и время. При выделении слота на календаре время подставляется автоматически.';
  const max = selectedResource.value?.maxBookingMinutes;
  if (max == null) {
    return base;
  }
  return `${base} Максимальная длительность одной брони для выбранного ресурса — ${max} мин.`;
});

const bookingDialogTitle = computed(() =>
  editingBookingId.value ? 'Редактировать бронь' : 'Новая бронь',
);

/** Длительность интервала в миллисекундах или null, если даты не заданы или некорректны */
const bookingDurationMs = computed(() => {
  if (!bookingStart.value || !bookingEnd.value) {
    return null;
  }
  const start = new Date(bookingStart.value);
  const end = new Date(bookingEnd.value);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }
  return end.getTime() - start.getTime();
});

const bookingDurationMinutesDisplay = computed(() => {
  if (bookingDurationMs.value == null) {
    return null;
  }
  return Math.floor(bookingDurationMs.value / 60_000);
});

/** Совпадает с проверкой на API: длительность строго больше лимита */
const bookingExceedsMaxDuration = computed(() => {
  const max = selectedResource.value?.maxBookingMinutes;
  if (max == null || bookingDurationMs.value == null) {
    return false;
  }
  return bookingDurationMs.value > max * 60 * 1000;
});

watch(
  isMdUp,
  (md) => {
    if (!md) {
      calendarExpanded.value = true;
    }
  },
  { immediate: true },
);

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openBookingModal() {
  if (!resourceId.value) {
    toast.warning('Сначала выберите ресурс');
    return;
  }
  editingBookingId.value = null;
  editingBookingMeta.value = null;
  if (!bookingStart.value || !bookingEnd.value) {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    bookingStart.value = toLocalDatetimeValue(now);
    bookingEnd.value = toLocalDatetimeValue(end);
  }
  bookingModalOpen.value = true;
}

function openEditBookingModal(args: {
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
  userDisplayName: string;
  userEmail: string;
}) {
  editingBookingId.value = args.id;
  editingBookingMeta.value = {
    userDisplayName: args.userDisplayName,
    userEmail: args.userEmail,
  };
  bookingTitle.value = args.title;
  bookingStart.value = args.start ? toLocalDatetimeValue(args.start) : '';
  bookingEnd.value = args.end ? toLocalDatetimeValue(args.end) : '';
  bookingModalOpen.value = true;
}

function openCancelFromEditModal() {
  if (!editingBookingId.value || !editingBookingMeta.value) {
    return;
  }
  const start = bookingStart.value ? new Date(bookingStart.value) : null;
  const end = bookingEnd.value ? new Date(bookingEnd.value) : null;
  pendingCancel.value = {
    id: editingBookingId.value,
    title: bookingTitle.value,
    start,
    end,
    userDisplayName: editingBookingMeta.value.userDisplayName,
    userEmail: editingBookingMeta.value.userEmail,
  };
  bookingModalOpen.value = false;
  editingBookingId.value = null;
  editingBookingMeta.value = null;
  cancelConfirmOpen.value = true;
}

watch(calendarExpanded, async (open) => {
  if (open) {
    await nextTick();
    calendarRef.value?.getApi?.()?.updateSize?.();
  }
});

watch([fromMidnight, toMidnight], async () => {
  await nextTick();
  const api = calendarRef.value?.getApi?.();
  if (!api) {
    return;
  }
  // Apply time-grid bounds without fully recreating the calendar.
  api.setOption?.('slotMinTime', slotMinTime.value);
  api.setOption?.('slotMaxTime', slotMaxTime.value);
  api.setOption?.('scrollTime', scrollTime.value);
  api.updateSize?.();
});

watch(bookingModalOpen, (open) => {
  if (!open) {
    editingBookingId.value = null;
    editingBookingMeta.value = null;
    void nextTick(() => {
      calendarRef.value?.getApi?.()?.unselect?.();
    });
  }
});

async function loadEvents(info: EventSourceFuncArg): Promise<EventInput[]> {
  if (!resourceId.value) {
    return [];
  }
  loading.value = true;
  try {
    const q = new URLSearchParams({
      resourceId: resourceId.value,
      from: info.start.toISOString(),
      to: info.end.toISOString(),
    });
    const rows = await http<BookingDto[]>(`/bookings?${q.toString()}`);
    const myId = auth.user?.userId;
    return rows
      .filter((b) => b.status !== 'cancelled')
      .map((b) => {
        const dark = document.documentElement.classList.contains('dark');
        const mine = b.userId === myId;
        const palette = calendarEventColors(dark, mine);
        return {
          id: b.id,
          title: b.title,
          start: b.startsAt,
          end: b.endsAt,
          extendedProps: {
            userDisplayName: b.userDisplayName,
            userEmail: b.userEmail,
            userId: b.userId,
            status: b.status,
          },
          ...palette,
        };
      });
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось загрузить расписание'));
    return [];
  } finally {
    loading.value = false;
  }
}

function handleSelect(sel: DateSelectArg) {
  editingBookingId.value = null;
  editingBookingMeta.value = null;
  bookingStart.value = toLocalDatetimeValue(sel.start);
  bookingEnd.value = toLocalDatetimeValue(sel.end);
  bookingModalOpen.value = true;
}

async function loadResources() {
  resources.value = await http<ResourceDto[]>('/resources');
  if (resources.value.length && !resourceId.value) {
    resourceId.value = resources.value[0].id;
  }
}

function refetchCalendar() {
  const api = calendarRef.value?.getApi?.();
  api?.refetchEvents();
}

watch(
  () => theme.effectiveMode,
  () => {
    refetchCalendar();
  },
);

watch(
  () => [theme.tenantLight, theme.tenantDark],
  () => {
    refetchCalendar();
  },
  { deep: true },
);

async function submitBooking() {
  if (!resourceId.value || !bookingStart.value || !bookingEnd.value) {
    toast.warning('Укажите начало и конец');
    return;
  }
  const start = new Date(bookingStart.value);
  const end = new Date(bookingEnd.value);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    toast.warning('Некорректные дата и время');
    return;
  }
  if (end <= start) {
    toast.warning('Конец должен быть позже начала');
    return;
  }
  const maxMin = selectedResource.value?.maxBookingMinutes;
  if (
    maxMin != null &&
    end.getTime() - start.getTime() > maxMin * 60 * 1000
  ) {
    toast.warning(
      `Длительность брони не может превышать ${maxMin} мин. для этого ресурса`,
    );
    return;
  }
  loading.value = true;
  try {
    const payload = {
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      title: bookingTitle.value.trim() || 'Бронь',
    };
    if (editingBookingId.value) {
      await http(`/bookings/${editingBookingId.value}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      toast.success('Изменения сохранены');
    } else {
      await http('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          resourceId: resourceId.value,
          ...payload,
        }),
      });
      toast.success('Забронировано');
    }
    bookingModalOpen.value = false;
    editingBookingId.value = null;
    editingBookingMeta.value = null;
    bookingTitle.value = '';
    bookingStart.value = '';
    bookingEnd.value = '';
    calendarRef.value?.getApi?.()?.unselect?.();
    refetchCalendar();
  } catch (e: unknown) {
    toast.error(
      apiErrorMessage(
        e,
        editingBookingId.value
          ? 'Не удалось сохранить изменения'
          : 'Не удалось создать бронь',
      ),
    );
  } finally {
    loading.value = false;
  }
}

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: (isMdUp.value ? 'timeGridWeek' : 'timeGridDay') as string,
  locale: ruLocale,
  firstDay: 1,
  headerToolbar: isMdUp.value
    ? {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }
    : {
        left: 'prev,next',
        center: 'title',
        right: 'today dayGridMonth',
      },
  buttonText: {
    today: 'Сегодня',
    month: 'Месяц',
    week: 'Неделя',
    day: 'День',
  },
  allDaySlot: false,
  nowIndicator: true,
  scrollTime: scrollTime.value,
  slotMinTime: slotMinTime.value,
  slotMaxTime: slotMaxTime.value,
  slotDuration: '00:30:00',
  slotLabelInterval: '01:00',
  selectable: true,
  selectMirror: true,
  height: 'auto' as const,
  contentHeight: isMdUp.value ? 620 : 440,
  eventContent: (arg: any) => {
    const ext = arg.event.extendedProps as unknown as {
      userDisplayName?: string;
      userEmail?: string;
    };

    const userName = ext.userDisplayName ?? '';
    const userEmail = ext.userEmail ?? '';

    const tooltip = `${userName}${userEmail ? ` (${userEmail})` : ''}`.trim();
    const title = arg.event.title ?? '';

    const escapeHtml = (s: string) =>
      s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    // FullCalendar accepts HTML strings for eventContent.
    return {
      html: `
        <div style="display:flex;flex-direction:column;gap:2px;padding:0 4px;">
          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;font-size:12px;" title="${escapeHtml(
            String(title),
          )}">
            ${escapeHtml(String(title))}
          </div>
          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;opacity:0.8;" title="${escapeHtml(
            tooltip,
          )}">
            ${escapeHtml(String(userName))} ${escapeHtml(String(userEmail))}
          </div>
        </div>
      `,
    };
  },
  events: (
    info: EventSourceFuncArg,
    success: (events: EventInput[]) => void,
    failure: (err: Error) => void,
  ) => {
    void loadEvents(info)
      .then(success)
      .catch((e) =>
        failure(e instanceof Error ? e : new Error(String(e))),
      );
  },
  select: handleSelect,
  eventClick: (arg: any) => {
    arg.jsEvent.preventDefault();
    const ext = arg.event.extendedProps as unknown as {
      userDisplayName?: string;
      userEmail?: string;
      userId?: string;
      status?: BookingStatus;
    };

    const userDisplayName = ext.userDisplayName ?? '';
    const userEmail = ext.userEmail ?? '';
    const bookingUserId = ext.userId;
    const bookingStatus = ext.status ?? 'confirmed';

    const isOwnerOrAdmin =
      auth.isAdmin || (bookingUserId != null && bookingUserId === auth.user?.userId);
    const canEdit =
      isOwnerOrAdmin &&
      (bookingStatus === 'confirmed' || bookingStatus === 'in_progress');

    if (canEdit) {
      openEditBookingModal({
        id: String((arg.event as any).id),
        title: String(arg.event.title ?? ''),
        start: arg.event.start ?? null,
        end: arg.event.end ?? null,
        userDisplayName,
        userEmail,
      });
      return;
    }

    const start = arg.event.start?.toLocaleString() ?? '';
    const end = arg.event.end?.toLocaleString() ?? '';
    const suffix = userEmail ? `\n${userDisplayName} (${userEmail})` : `\n${userDisplayName}`;
    toast.info(`${arg.event.title}\n${start} — ${end}${suffix}`);
  },
}));

async function confirmCancel() {
  if (cancelLoading.value) {
    return;
  }
  const target = pendingCancel.value;
  if (!target) {
    return;
  }
  cancelLoading.value = true;
  try {
    await http(`/bookings/${target.id}`, { method: 'DELETE' });
    toast.success('Бронь отменена');
    cancelConfirmOpen.value = false;
    pendingCancel.value = null;
    refetchCalendar();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось отменить бронь'));
  } finally {
    cancelLoading.value = false;
  }
}

const cancelDescription = computed(() => {
  if (!pendingCancel.value) {
    return '';
  }

  const start = pendingCancel.value.start?.toLocaleString() ?? '';
  const end = pendingCancel.value.end?.toLocaleString() ?? '';
  const occupied = pendingCancel.value.userEmail
    ? `${pendingCancel.value.userDisplayName} (${pendingCancel.value.userEmail})`
    : pendingCancel.value.userDisplayName;

  return `Бронь: "${pendingCancel.value.title}"\n${start} — ${end}\nЗанял: ${occupied}`;
});

watch(isMdUp, async () => {
  await nextTick();
  const api = calendarRef.value?.getApi?.();
  if (!api) {
    return;
  }
  const next = isMdUp.value ? 'timeGridWeek' : 'timeGridDay';
  if (api.view.type !== next) {
    api.changeView(next);
  }
  api.updateSize();
});

onMounted(async () => {
  try {
    await loadResources();
    await nextTick();
    refetchCalendar();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Не удалось загрузить ресурсы'));
  }
});

watch(resourceId, () => {
  void nextTick(() => refetchCalendar());
});
</script>

<template>
  <section class="w-full space-y-4">
    <div class="glass-panel px-5 py-4">
      <h1>Календарь занятости</h1>
      <p
        class="max-w-[52rem] text-xs leading-relaxed text-muted-foreground md:text-sm"
      >
        Выберите ресурс — отображается расписание всех броней. Свои слоты
        выделены цветом темы, чужие — серым. Выделите интервал на календаре
        или нажмите «Новая бронь» — время можно уточнить в окне.
      </p>
    </div>
    <div
      class="glass-panel mb-3 flex flex-col gap-3 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center md:mb-4 md:px-4"
    >
      <select
        v-model="resourceId"
        :class="cn(selectClass, 'min-w-0 flex-1 sm:min-w-[200px] sm:flex-none')"
      >
        <option
          value=""
          disabled
        >
          Ресурс
        </option>
        <option
          v-for="r in resources"
          :key="r.id"
          :value="r.id"
        >
          {{ r.name }}
        </option>
      </select>
      <div class="flex flex-wrap items-center gap-2 sm:contents">
        <Button
          v-if="resourceId && isMdUp"
          type="button"
          variant="glass"
          class="shrink-0"
          @click="calendarExpanded = !calendarExpanded"
        >
          {{ calendarExpanded ? 'Свернуть календарь' : 'Развернуть календарь' }}
        </Button>
        <Button
          v-if="resourceId"
          type="button"
          variant="glass"
          class="shrink-0"
          @click="openBookingModal"
        >
          Новая бронь
        </Button>
        <Button
          v-if="resourceId && isMdUp"
          type="button"
          variant="glass"
          class="shrink-0"
          @click="fromMidnight = !fromMidnight"
        >
          {{ fromMidnight ? 'С 07:00' : 'С 00:00' }}
        </Button>
        <Button
          v-if="resourceId && isMdUp"
          type="button"
          variant="glass"
          class="shrink-0"
          @click="toMidnight = !toMidnight"
        >
          {{ toMidnight ? 'До 22:00' : 'До 24:00' }}
        </Button>
      </div>
      <div
        class="flex w-full flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:ml-auto sm:w-auto md:text-xs"
      >
        <span class="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/50 px-2 py-1">
          <span class="size-2 rounded-full bg-primary/80" />
          Мои брони
        </span>
        <span class="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/50 px-2 py-1">
          <span class="size-2 rounded-full bg-slate-400/80" />
          Другие
        </span>
      </div>
    </div>
    <div
      v-show="calendarExpanded || !isMdUp"
      class="glass-panel relative mb-4 min-h-[200px] p-2 min-[480px]:p-3 md:mb-6"
    >
      <LoadingOverlay v-if="loading && resourceId" />
      <FullCalendar
        v-if="resourceId"
        ref="calendarRef"
        :options="calendarOptions"
      />
      <div
        v-else
        class="flex min-h-[200px] items-center justify-center p-8 text-center text-sm text-muted-foreground"
      >
        Нет ресурсов — создайте в админке
      </div>
    </div>

    <FormDialog
      v-model:open="bookingModalOpen"
      :title="bookingDialogTitle"
      :description="bookingModalDescription"
    >
      <form
        id="booking-form"
        class="space-y-4"
        @submit.prevent="submitBooking"
      >
        <div class="space-y-2">
          <Label for="book-title">Название</Label>
          <Input
            id="book-title"
            v-model="bookingTitle"
            type="text"
            placeholder="Встреча"
            autocomplete="off"
          />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="book-start">Начало</Label>
            <input
              id="book-start"
              v-model="bookingStart"
              type="datetime-local"
              :class="inputClass"
            >
          </div>
          <div class="space-y-2">
            <Label for="book-end">Конец</Label>
            <input
              id="book-end"
              v-model="bookingEnd"
              type="datetime-local"
              :class="inputClass"
            >
          </div>
        </div>
        <p
          v-if="selectedResource?.maxBookingMinutes != null && bookingDurationMinutesDisplay != null"
          class="text-xs leading-relaxed text-muted-foreground"
        >
          Длительность:
          <span class="font-medium tabular-nums text-foreground">
            {{ bookingDurationMinutesDisplay }} мин
          </span>
          <span class="text-muted-foreground">
            (не более
            <span class="tabular-nums">{{ selectedResource.maxBookingMinutes }}</span> мин)
          </span>
        </p>
        <p
          v-if="bookingExceedsMaxDuration"
          class="text-xs font-medium text-destructive"
        >
          Укоротите интервал: превышена максимальная длительность для этого ресурса.
        </p>
      </form>
      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            v-if="editingBookingId"
            type="button"
            variant="ghost"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive sm:order-first"
            @click="openCancelFromEditModal"
          >
            Отменить бронь
          </Button>
          <div class="flex flex-1 justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              @click="bookingModalOpen = false"
            >
              Закрыть
            </Button>
            <Button
              type="submit"
              form="booking-form"
              :disabled="loading || bookingExceedsMaxDuration"
            >
              {{
                loading
                  ? 'Сохранение…'
                  : editingBookingId
                    ? 'Сохранить'
                    : 'Забронировать'
              }}
            </Button>
          </div>
        </div>
      </template>
    </FormDialog>

    <ConfirmDialog
      v-model:open="cancelConfirmOpen"
      title="Отменить бронирование?"
      :description="cancelDescription"
      confirm-text="Отменить"
      cancel-text="Назад"
      destructive
      @confirm="confirmCancel"
      @cancel="() => { cancelConfirmOpen = false; pendingCancel = null; }"
    />
  </section>
</template>

<style scoped>
:deep(.fc) {
  --fc-border-color: hsl(var(--border) / 0.45);
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: hsl(var(--background) / 0.25);
  --fc-list-event-hover-bg-color: hsl(var(--primary) / 0.22);
  --fc-highlight-color: hsl(var(--primary) / 0.28);
  --fc-button-bg-color: hsl(var(--background) / 0.5);
  --fc-button-border-color: hsl(var(--border) / 0.55);
  --fc-button-text-color: hsl(var(--muted-foreground));
  --fc-button-hover-bg-color: hsl(var(--primary) / 0.18);
  --fc-button-hover-border-color: hsl(var(--border) / 0.75);
  --fc-button-active-bg-color: hsl(var(--primary) / 0.28);
  --fc-today-bg-color: hsl(var(--primary) / 0.14);
  border-radius: 0.9rem;
}

:deep(.fc .fc-toolbar.fc-header-toolbar) {
  margin-bottom: 1rem;
}

@media (max-width: 767px) {
  :deep(.fc .fc-toolbar.fc-header-toolbar) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  :deep(.fc .fc-toolbar-chunk) {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25rem;
  }
}

:deep(.fc .fc-toolbar-title) {
  font-weight: 600;
  letter-spacing: -0.01em;
  font-size: 0.95rem;
  text-align: center;
}

@media (min-width: 768px) {
  :deep(.fc .fc-toolbar-title) {
    font-size: 1.05rem;
    text-align: inherit;
  }
}

:deep(.fc .fc-button) {
  border-radius: 0.75rem;
  box-shadow: none;
}

:deep(.fc .fc-scrollgrid) {
  border-radius: 0.8rem;
  overflow: hidden;
  background: hsl(var(--background) / 0.28);
  backdrop-filter: blur(5px);
}

:deep(.fc .fc-col-header-cell) {
  color: hsl(var(--muted-foreground));
  font-weight: 600;
  font-size: 0.83rem;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  background: hsl(var(--background) / 0.32);
}

:deep(.fc .fc-timegrid-axis-cushion),
:deep(.fc .fc-timegrid-slot-label) {
  color: hsl(var(--muted-foreground));
  font-size: 0.78rem;
}

:deep(.fc .fc-timegrid-slot) {
  border-color: hsl(var(--border) / 0.4);
}

:deep(.fc .fc-button-primary) {
  background-color: hsl(var(--background) / 0.56);
  border-color: hsl(var(--border) / 0.6);
  color: hsl(var(--foreground));
  backdrop-filter: blur(6px);
}

:deep(.fc .fc-button-primary:not(:disabled):hover) {
  background-color: hsl(var(--primary) / 0.22);
  border-color: hsl(var(--border) / 0.75);
  color: hsl(var(--foreground));
}

:deep(.fc .fc-button-primary:not(:disabled).fc-button-active) {
  background-color: hsl(var(--primary) / 0.82);
  border-color: hsl(var(--primary) / 0.92);
  color: hsl(var(--primary-foreground));
}

:deep(.fc .fc-event) {
  border-width: 1px;
  border-radius: 0.55rem;
  box-shadow: 0 8px 18px -14px rgba(0, 0, 0, 0.45);
}

:deep(.fc .fc-event-title) {
  font-weight: 500;
}

:deep(.fc .fc-timegrid-now-indicator-line) {
  border-color: hsl(var(--primary) / 0.8);
}

:deep(.fc .fc-timegrid-now-indicator-arrow) {
  border-top-color: hsl(var(--primary) / 0.8);
  border-bottom-color: hsl(var(--primary) / 0.8);
}
</style>
