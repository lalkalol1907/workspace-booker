import { describe, it, expect } from 'vitest';
import { bookingStatusLabel } from './booking-status-label';

describe('bookingStatusLabel', () => {
  it('returns "Подтверждена" for confirmed', () => {
    expect(bookingStatusLabel('confirmed')).toBe('Подтверждена');
  });

  it('returns "Отменена" for cancelled', () => {
    expect(bookingStatusLabel('cancelled')).toBe('Отменена');
  });

  it('returns raw value for unknown status', () => {
    expect(bookingStatusLabel('pending' as any)).toBe('pending');
  });
});
