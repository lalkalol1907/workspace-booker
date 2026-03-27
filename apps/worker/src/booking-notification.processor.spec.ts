import { describe, it, expect, rstest } from '@rstest/core';

rstest.mock('api/entities/booking.entity', () => ({ Booking: class {} }));
rstest.mock('api/entities/user.entity', () => ({ User: class {} }));
rstest.mock('api/entities/resource.entity', () => ({ Resource: class {} }));
rstest.mock('api/entities/organization.entity', () => ({ Organization: class {} }));
rstest.mock('api/entities/organization-host.entity', () => ({
  OrganizationHost: class {},
}));
rstest.mock('api/entities/location.entity', () => ({ Location: class {} }));

import { BookingNotificationProcessor } from './booking-notification.processor';

const BOOKING_ID = 'b-1';

const mockBooking = (overrides: Record<string, any> = {}) => ({
  id: BOOKING_ID,
  title: 'Встреча',
  status: 'confirmed',
  startsAt: new Date('2025-06-01T10:00:00Z'),
  endsAt: new Date('2025-06-01T11:00:00Z'),
  user: { email: 'user@test.com', displayName: 'Test' },
  resource: { name: 'Room A' },
  ...overrides,
});

function createProcessor() {
  const bookingRepo = {
    findOne: rstest.fn(),
  };
  const mailer = {
    sendMail: rstest.fn().mockResolvedValue(undefined),
  };

  const processor = new BookingNotificationProcessor(
    bookingRepo as any,
    mailer as any,
  );

  return { processor, bookingRepo, mailer };
}

function makeJob(name: string, bookingId = BOOKING_ID) {
  return { name, data: { bookingId } } as any;
}

describe('BookingNotificationProcessor', () => {
  describe('created', () => {
    it('sends confirmation email', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(mockBooking());

      await processor.process(makeJob('created'));

      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Бронирование подтверждено',
        }),
      );
    });
  });

  describe('reminder', () => {
    it('sends reminder email for confirmed booking', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(mockBooking());

      await processor.process(makeJob('reminder'));

      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Напоминание: бронирование через 15 минут',
        }),
      );
    });

    it('skips reminder if booking is cancelled', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ status: 'cancelled' }),
      );

      await processor.process(makeJob('reminder'));

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('cancelled', () => {
    it('sends cancellation email', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ status: 'cancelled' }),
      );

      await processor.process(makeJob('cancelled'));

      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Бронирование отменено',
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('skips when booking not found', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(null);

      await processor.process(makeJob('created'));

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('skips when user has no email', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ user: { email: null } }),
      );

      await processor.process(makeJob('created'));

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('skips unknown job name', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(mockBooking());

      await processor.process(makeJob('unknown'));

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('includes resource name and title in email text', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(mockBooking());

      await processor.process(makeJob('created'));

      const call = mailer.sendMail.mock.calls[0][0];
      expect(call.text).toContain('Room A');
      expect(call.text).toContain('Встреча');
    });

    it('uses fallback resource name when resource is null', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ resource: null }),
      );

      await processor.process(makeJob('created'));

      const call = mailer.sendMail.mock.calls[0][0];
      expect(call.text).toContain('Ресурс');
    });
  });
});
