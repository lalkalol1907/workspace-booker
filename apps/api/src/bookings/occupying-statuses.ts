import { BookingStatus } from '../common/enums/booking-status.enum';

/** Брони, которые занимают ресурс в интервале (пересечения и занятость). */
export const OCCUPYING_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];
