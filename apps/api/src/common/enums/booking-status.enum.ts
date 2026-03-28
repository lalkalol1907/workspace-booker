export enum BookingStatus {
  /** Ожидает начала */
  CONFIRMED = 'confirmed',
  /** Идёт сейчас (между startsAt и endsAt) */
  IN_PROGRESS = 'in_progress',
  /** Завершено по времени */
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
