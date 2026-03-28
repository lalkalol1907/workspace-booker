import type { BookingStatus } from '@/api/types';

const LABELS: Record<BookingStatus, string> = {
  confirmed: 'Подтверждена',
  in_progress: 'Идёт сейчас',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

export function bookingStatusLabel(status: BookingStatus): string {
  return LABELS[status] ?? status;
}
