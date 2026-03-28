import { describe, it, expect, rstest } from '@rstest/core';

/**
 * Rstest/Rspack тянет все entity и ловит TDZ (циклические импорты). В рантайме worker ок.
 * Для юнит-теста процессора достаточно заглушки класса Booking.
 */
rstest.mock('./entities/booking.entity', () => ({
  Booking: class Booking {},
}));

/** Rspack бандлит `ejs` некорректно (renderFile не функция). Процессор тестируем без реального EJS. */
rstest.mock('./mail/render-booking-mail', () => ({
  bookingMailSubject: (kind: string) => {
    const subjects: Record<string, string> = {
      created: 'Бронирование подтверждено',
      reminder: 'Напоминание: бронирование через 15 минут',
      ending_soon: 'Скоро окончание бронирования',
      ended: 'Бронирование завершилось',
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
    save: rstest.fn().mockResolvedValue(undefined),
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

  describe('ending_soon', () => {
    it('sends email for confirmed booking', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(mockBooking());

      await processor.process(makeJob('ending_soon'));

      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Скоро окончание бронирования',
          html: expect.stringContaining('<!DOCTYPE html>'),
        }),
      );
    });

    it('skips if booking is cancelled', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ status: 'cancelled' }),
      );

      await processor.process(makeJob('ending_soon'));

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('sends email when booking is in_progress', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ status: 'in_progress' }),
      );

      await processor.process(makeJob('ending_soon'));

      expect(mailer.sendMail).toHaveBeenCalled();
    });
  });

  describe('ended', () => {
    it('sends email for confirmed booking and marks completed', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      const b = mockBooking();
      bookingRepo.findOne.mockResolvedValue(b);

      await processor.process(makeJob('ended'));

      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Бронирование завершилось',
          html: expect.stringContaining('<!DOCTYPE html>'),
        }),
      );
      expect(b.status).toBe('completed');
      expect(bookingRepo.save).toHaveBeenCalled();
    });

    it('skips if booking is cancelled', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ status: 'cancelled' }),
      );

      await processor.process(makeJob('ended'));

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('skips if booking already completed', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ status: 'completed' }),
      );

      await processor.process(makeJob('ended'));

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('sends email for in_progress booking and marks completed', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      const b = mockBooking({ status: 'in_progress' });
      bookingRepo.findOne.mockResolvedValue(b);

      await processor.process(makeJob('ended'));

      expect(mailer.sendMail).toHaveBeenCalled();
      expect(b.status).toBe('completed');
      expect(bookingRepo.save).toHaveBeenCalled();
    });
  });

  describe('in_progress', () => {
    it('sets status in_progress when slot is active', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      const start = new Date(Date.now() - 30_000);
      const end = new Date(Date.now() + 3600_000);
      const b = mockBooking({
        status: 'confirmed',
        startsAt: start,
        endsAt: end,
      });
      bookingRepo.findOne.mockResolvedValue(b);

      await processor.process(makeJob('in_progress'));

      expect(b.status).toBe('in_progress');
      expect(bookingRepo.save).toHaveBeenCalled();
      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('sets completed when job runs after end', async () => {
      const { processor, bookingRepo, mailer } = createProcessor();
      const b = mockBooking({
        status: 'confirmed',
        startsAt: new Date(Date.now() - 7200_000),
        endsAt: new Date(Date.now() - 3600_000),
      });
      bookingRepo.findOne.mockResolvedValue(b);

      await processor.process(makeJob('in_progress'));

      expect(b.status).toBe('completed');
      expect(bookingRepo.save).toHaveBeenCalled();
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
