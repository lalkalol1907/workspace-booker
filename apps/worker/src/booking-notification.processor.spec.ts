import { describe, it, expect, rstest } from '@rstest/core';

rstest.mock('api/entities/booking.entity', () => ({ Booking: class {} }));
rstest.mock('api/entities/user.entity', () => ({ User: class {} }));
rstest.mock('api/entities/resource.entity', () => ({ Resource: class {} }));
rstest.mock('api/entities/organization.entity', () => ({ Organization: class {} }));
rstest.mock('api/entities/organization-host.entity', () => ({
  OrganizationHost: class {},
}));
rstest.mock('api/entities/location.entity', () => ({ Location: class {} }));

/** Rspack бандлит `ejs` некорректно (renderFile не функция). Процессор тестируем без реального EJS. */
rstest.mock('./mail/render-booking-mail', () => ({
  bookingMailSubject: (kind: string) => {
    const subjects: Record<string, string> = {
      created: 'Бронирование подтверждено',
      reminder: 'Напоминание: бронирование через 15 минут',
      cancelled: 'Бронирование отменено',
    };
    return subjects[kind] ?? '';
  },
  buildBookingMailViewModel: (
    _kind: string,
    params: {
      appName: string;
      userName: string;
      resourceName: string;
      title: string;
      startsAt: string;
      endsAt: string;
    },
  ) => ({
    appName: params.appName,
    pageTitle: 't',
    headline: 'h',
    intro: 'i',
    badgeLabel: 'b',
    badgeBg: '#000000',
    userName: params.userName,
    resourceName: params.resourceName,
    title: params.title,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
  }),
  renderBookingMail: async (_kind: string, vm: { resourceName: string; title: string }) => ({
    html: '<!DOCTYPE html><html><body>test</body></html>',
    text: `TEXT:${vm.resourceName}:${vm.title}`,
  }),
}));

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
  const config = {
    getOrThrow: rstest.fn((key: string) => {
      if (key === 'mailer') {
        return {
          host: 'localhost',
          port: 587,
          user: '',
          pass: '',
          from: 'test@test.com',
          appName: 'Test App',
        };
      }
      throw new Error(`unexpected config ${key}`);
    }),
  };

  const processor = new BookingNotificationProcessor(
    bookingRepo as any,
    mailer as any,
    config as any,
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
          html: expect.stringContaining('<!DOCTYPE html>'),
          text: expect.stringContaining('Room A'),
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
          html: expect.stringContaining('<!DOCTYPE html>'),
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
          html: expect.stringContaining('<!DOCTYPE html>'),
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
