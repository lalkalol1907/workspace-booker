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
  'flex h-9 min-w-[200px] max-w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[320px]',
);

const inputClass = cn(
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
      .map((b) => ({
        id: b.id,
        title: b.title,
        start: b.startsAt,
        end: b.endsAt,
        backgroundColor:
          b.userId === myId ? 'hsl(226 42% 84%)' : 'hsl(220 14% 82%)',
        borderColor:
          b.userId === myId ? 'hsl(226 36% 72%)' : 'hsl(220 12% 70%)',
        textColor:
          b.userId === myId ? 'hsl(222 28% 22%)' : 'hsl(220 10% 28%)',
      }));
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
  <div class="w-full">
    <h1>Календарь занятости</h1>
    <p class="mb-4 max-w-[52rem] text-sm leading-relaxed text-muted-foreground">
      Выберите ресурс — отображается расписание всех броней. Свои слоты
      выделены цветом темы, чужие — серым. Выделите интервал на календаре
      или нажмите «Новая бронь» — время можно уточнить в окне.
    </p>
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <select v-model="resourceId" :class="selectClass">
        <option value="" disabled>Ресурс</option>
        <option v-for="r in resources" :key="r.id" :value="r.id">
          {{ r.name }}
        </option>
      </select>
      <Button
        v-if="resourceId"
        type="button"
        variant="outline"
        @click="calendarExpanded = !calendarExpanded"
      >
        {{ calendarExpanded ? 'Свернуть календарь' : 'Развернуть календарь' }}
      </Button>
      <Button
        v-if="resourceId"
        type="button"
        @click="openBookingModal"
      >
        Новая бронь
      </Button>
    </div>
    <div
      v-show="calendarExpanded"
      class="relative mb-6 min-h-[200px] rounded-md border border-border/50 bg-muted/25"
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
      <form id="booking-form" class="space-y-4" @submit.prevent="createBooking">
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
            />
          </div>
          <div class="space-y-2">
            <Label for="book-end">Конец</Label>
            <input
              id="book-end"
              v-model="bookingEnd"
              type="datetime-local"
              :class="inputClass"
            />
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
        <Button type="submit" form="booking-form" :disabled="loading">
          {{ loading ? 'Сохранение…' : 'Забронировать' }}
        </Button>
      </template>
    </FormDialog>
  </div>
</template>

<style scoped>
:deep(.fc) {
  --fc-border-color: hsl(220 16% 91%);
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: hsl(220 14% 98%);
  --fc-list-event-hover-bg-color: hsl(220 20% 96%);
  --fc-highlight-color: hsl(220 45% 94%);
  --fc-button-bg-color: hsl(220 14% 97%);
  --fc-button-border-color: hsl(220 13% 88%);
  --fc-button-text-color: hsl(220 9% 44%);
  --fc-button-hover-bg-color: hsl(220 14% 94%);
  --fc-button-hover-border-color: hsl(220 13% 84%);
  --fc-button-active-bg-color: hsl(220 14% 91%);
  --fc-today-bg-color: hsl(220 40% 96%);
}

:deep(.fc .fc-col-header-cell) {
  color: hsl(220 9% 42%);
  font-weight: 500;
}

:deep(.fc .fc-timegrid-axis-cushion),
:deep(.fc .fc-timegrid-slot-label) {
  color: hsl(220 8% 52%);
}

:deep(.fc .fc-timegrid-slot) {
  border-color: hsl(220 16% 93%);
}

:deep(.fc .fc-button-primary) {
  background-color: hsl(220 32% 91%);
  border-color: hsl(220 22% 84%);
  color: hsl(222 26% 38%);
}

:deep(.fc .fc-button-primary:not(:disabled):hover) {
  background-color: hsl(220 32% 87%);
  border-color: hsl(220 22% 78%);
  color: hsl(222 28% 32%);
}

:deep(.fc .fc-event) {
  border-width: 1px;
}

:deep(.fc .fc-event-title) {
  font-weight: 500;
}
</style>
