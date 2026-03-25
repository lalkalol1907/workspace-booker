<script setup lang="ts">
import type { DateSelectArg, EventInput, EventSourceFuncArg } from '@fullcalendar/core';
import ruLocale from '@fullcalendar/core/locales/ru';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/vue3';
import { nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { toast } from 'vue-sonner';
import Button from '@/components/ui/button/Button.vue';
import FormDialog from '@/components/ui/dialog/FormDialog.vue';
import Input from '@/components/ui/input/Input.vue';
import Label from '@/components/ui/label/Label.vue';
import LoadingOverlay from '@/components/ui/loading-overlay/LoadingOverlay.vue';
import { http } from '@/api/http';
import type { BookingDto, ResourceDto } from '@/api/types';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

const selectClass = cn(
  'select-glass flex h-9 min-w-[200px] max-w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[320px]',
);

const inputClass = cn(
  'flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const auth = useAuthStore();
const resources = ref<ResourceDto[]>([]);
const resourceId = ref('');
const loading = ref(false);
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null);

const bookingModalOpen = ref(false);
const bookingTitle = ref('');
const bookingStart = ref('');
const bookingEnd = ref('');

const calendarExpanded = ref(false);

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openBookingModal() {
  if (!resourceId.value) {
    toast.warning('Сначала выберите ресурс');
    return;
  }
  if (!bookingStart.value || !bookingEnd.value) {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    bookingStart.value = toLocalDatetimeValue(now);
    bookingEnd.value = toLocalDatetimeValue(end);
  }
  bookingModalOpen.value = true;
}

watch(calendarExpanded, async (open) => {
  if (open) {
    await nextTick();
    calendarRef.value?.getApi?.()?.updateSize?.();
  }
});

watch(bookingModalOpen, (open) => {
  if (!open) {
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
      .filter((b) => b.status === 'confirmed')
      .map((b) => {
        const dark = document.documentElement.classList.contains('dark');
        const mine = b.userId === myId;
        const palette = dark
          ? mine
            ? {
                backgroundColor: 'hsl(231 32% 26% / 0.76)',
                borderColor: 'hsl(230 68% 62% / 0.42)',
                textColor: 'hsl(223 30% 90%)',
              }
            : {
                backgroundColor: 'hsl(231 16% 23% / 0.68)',
                borderColor: 'hsl(230 20% 40% / 0.45)',
                textColor: 'hsl(223 20% 84%)',
              }
          : mine
            ? {
                backgroundColor: 'hsl(229 85% 92% / 0.85)',
                borderColor: 'hsl(229 64% 76% / 0.75)',
                textColor: 'hsl(229 34% 30%)',
              }
            : {
                backgroundColor: 'hsl(220 26% 90% / 0.74)',
                borderColor: 'hsl(220 20% 74% / 0.75)',
                textColor: 'hsl(220 18% 34%)',
              };
        return {
          id: b.id,
          title: b.title,
          start: b.startsAt,
          end: b.endsAt,
          ...palette,
        };
      });
  } catch {
    toast.error('Не удалось загрузить расписание');
    return [];
  } finally {
    loading.value = false;
  }
}

function handleSelect(sel: DateSelectArg) {
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

async function createBooking() {
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
  loading.value = true;
  try {
    await http('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: resourceId.value,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        title: bookingTitle.value.trim() || 'Бронь',
      }),
    });
    toast.success('Забронировано');
    bookingModalOpen.value = false;
    bookingTitle.value = '';
    bookingStart.value = '';
    bookingEnd.value = '';
    calendarRef.value?.getApi?.()?.unselect?.();
    refetchCalendar();
  } catch {
    toast.error('Не удалось создать бронь (пересечение или ошибка)');
  } finally {
    loading.value = false;
  }
}

const calendarOptions = shallowRef({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locale: ruLocale,
  firstDay: 1,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  buttonText: {
    today: 'Сегодня',
    month: 'Месяц',
    week: 'Неделя',
    day: 'День',
  },
  allDaySlot: false,
  nowIndicator: true,
  scrollTime: '08:00:00',
  slotMinTime: '07:00:00',
  slotMaxTime: '22:00:00',
  slotDuration: '00:30:00',
  slotLabelInterval: '01:00',
  selectable: true,
  selectMirror: true,
  height: 'auto',
  contentHeight: 620,
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
  eventClick: (arg: {
    event: { title: string; start: Date | null; end: Date | null };
    jsEvent: Event;
  }) => {
    arg.jsEvent.preventDefault();
    const start = arg.event.start?.toLocaleString() ?? '';
    const end = arg.event.end?.toLocaleString() ?? '';
    toast.info(`${arg.event.title}\n${start} — ${end}`);
  },
});

onMounted(async () => {
  try {
    await loadResources();
    await nextTick();
    refetchCalendar();
  } catch {
    toast.error('Не удалось загрузить ресурсы');
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
      <p class="max-w-[52rem] text-sm leading-relaxed text-muted-foreground">
        Выберите ресурс — отображается расписание всех броней. Свои слоты
        выделены цветом темы, чужие — серым. Выделите интервал на календаре
        или нажмите «Новая бронь» — время можно уточнить в окне.
      </p>
    </div>
    <div class="glass-panel mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
      <select
        v-model="resourceId"
        :class="selectClass"
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
      <Button
        v-if="resourceId"
        type="button"
        variant="glass"
        @click="calendarExpanded = !calendarExpanded"
      >
        {{ calendarExpanded ? 'Свернуть календарь' : 'Развернуть календарь' }}
      </Button>
      <Button
        v-if="resourceId"
        type="button"
        variant="glass"
        @click="openBookingModal"
      >
        Новая бронь
      </Button>
      <div class="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
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
      v-show="calendarExpanded"
      class="glass-panel relative mb-6 min-h-[200px] p-3"
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
      title="Новая бронь"
      description="Укажите название и время. При выделении слота на календаре время подставляется автоматически."
    >
      <form
        id="booking-form"
        class="space-y-4"
        @submit.prevent="createBooking"
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
      </form>
      <template #footer>
        <Button
          type="button"
          variant="outline"
          @click="bookingModalOpen = false"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          form="booking-form"
          :disabled="loading"
        >
          {{ loading ? 'Сохранение…' : 'Забронировать' }}
        </Button>
      </template>
    </FormDialog>
  </section>
</template>

<style scoped>
:deep(.fc) {
  --fc-border-color: hsl(var(--border) / 0.45);
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: hsl(var(--background) / 0.25);
  --fc-list-event-hover-bg-color: hsl(var(--accent) / 0.35);
  --fc-highlight-color: hsl(var(--accent) / 0.45);
  --fc-button-bg-color: hsl(var(--background) / 0.5);
  --fc-button-border-color: hsl(var(--border) / 0.55);
  --fc-button-text-color: hsl(var(--muted-foreground));
  --fc-button-hover-bg-color: hsl(var(--accent) / 0.45);
  --fc-button-hover-border-color: hsl(var(--border) / 0.75);
  --fc-button-active-bg-color: hsl(var(--accent) / 0.65);
  --fc-today-bg-color: hsl(var(--accent) / 0.35);
  border-radius: 0.9rem;
}

:deep(.fc .fc-toolbar.fc-header-toolbar) {
  margin-bottom: 1rem;
}

:deep(.fc .fc-toolbar-title) {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
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
  background-color: hsl(var(--accent) / 0.6);
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
