import { describe, it, expect, rstest } from '@rstest/core';
import { BookingStatus } from '../common/enums/booking-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import type { Booking } from '../entities/booking.entity';
import type { Resource } from '../entities/resource.entity';

rstest.mock('../entities/organization.entity', () => ({
  Organization: class {},
}));
rstest.mock('../entities/user.entity', () => ({ User: class {} }));
rstest.mock('../entities/booking.entity', () => ({ Booking: class {} }));
rstest.mock('../entities/location.entity', () => ({ Location: class {} }));
rstest.mock('../entities/resource.entity', () => ({ Resource: class {} }));
rstest.mock('../entities/organization-host.entity', () => ({
  OrganizationHost: class {},
}));
rstest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));

import { BookingsService } from './bookings.service';

const ORG_ID = 'org-1';

const memberPayload: JwtPayload = {
  sub: 'user-1',
  organizationId: ORG_ID,
  email: 'member@test.com',
  role: UserRole.MEMBER,
  tokenVersion: 0,
};

const adminPayload: JwtPayload = {
  sub: 'admin-1',
  organizationId: ORG_ID,
  email: 'admin@test.com',
  role: UserRole.ADMIN,
  tokenVersion: 0,
};

const mockBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: 'b-1',
    organizationId: ORG_ID,
    resourceId: 'r-1',
    userId: 'user-1',
    startsAt: new Date('2025-01-01T10:00:00Z'),
    endsAt: new Date('2025-01-01T11:00:00Z'),
    title: 'Test',
    status: BookingStatus.CONFIRMED,
    createdAt: new Date(),
    updatedAt: new Date(),
    resource: { name: 'Room A' },
    user: { displayName: 'Test', email: 'member@test.com' },
    ...overrides,
  }) as any;

const mockResource = (overrides: Partial<Resource> = {}): Resource =>
  ({
    id: 'r-1',
    organizationId: ORG_ID,
    isActive: true,
    maxBookingMinutes: null,
    ...overrides,
  }) as any;

function createMockQb(overrides: Record<string, any> = {}) {
  const qb: Record<string, any> = {
    where: rstest.fn().mockReturnThis(),
    andWhere: rstest.fn().mockReturnThis(),
    orderBy: rstest.fn().mockReturnThis(),
    leftJoinAndSelect: rstest.fn().mockReturnThis(),
    getMany: rstest.fn().mockResolvedValue([]),
    getCount: rstest.fn().mockResolvedValue(0),
    ...overrides,
  };
  return qb;
}

function createService() {
  const qb = createMockQb();
  const bookingRepo = {
    findOne: rstest.fn(),
    save: rstest.fn((b: any) => b),
    create: rstest.fn((dto: any) => ({ id: 'b-new', ...dto })),
    createQueryBuilder: rstest.fn().mockReturnValue(qb),
  };
  const resourceRepo = {
    findOne: rstest.fn(),
  };
  const notifications = {
    sendCreated: rstest.fn().mockResolvedValue(undefined),
    scheduleReminder: rstest.fn().mockResolvedValue(undefined),
    sendCancelled: rstest.fn().mockResolvedValue(undefined),
  };

  const service = new BookingsService(
    bookingRepo as any,
    resourceRepo as any,
    notifications as any,
  );

  return { service, bookingRepo, resourceRepo, notifications, qb };
}

describe('BookingsService', () => {
  describe('create', () => {
    it('creates a booking successfully', async () => {
      const { service, resourceRepo, bookingRepo, qb } = createService();
      resourceRepo.findOne.mockResolvedValue(mockResource());
      qb.getCount.mockResolvedValue(0);
      bookingRepo.findOne.mockResolvedValue(mockBooking());

      const result = await service.create(memberPayload, ORG_ID, {
        resourceId: 'r-1',
        startsAt: new Date('2025-01-01T10:00:00Z'),
        endsAt: new Date('2025-01-01T11:00:00Z'),
        title: 'Test',
      });

      expect(result.id).toBeDefined();
      expect(bookingRepo.save).toHaveBeenCalled();
    });

    it('rejects when resource not found', async () => {
      const { service, resourceRepo } = createService();
      resourceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(memberPayload, ORG_ID, {
          resourceId: 'missing',
          startsAt: new Date('2025-01-01T10:00:00Z'),
          endsAt: new Date('2025-01-01T11:00:00Z'),
          title: 'Test',
        }),
      ).rejects.toMatchObject({ response: { errorCode: 'RESOURCE_NOT_AVAILABLE' } });
    });

    it('rejects when endsAt <= startsAt', async () => {
      const { service, resourceRepo } = createService();
      resourceRepo.findOne.mockResolvedValue(mockResource());

      const t = new Date('2025-01-01T10:00:00Z');
      await expect(
        service.create(memberPayload, ORG_ID, {
          resourceId: 'r-1',
          startsAt: t,
          endsAt: t,
          title: 'Bad',
        }),
      ).rejects.toMatchObject({ response: { errorCode: 'VALIDATION_ERROR' } });
    });

    it('rejects when duration exceeds maxBookingMinutes', async () => {
      const { service, resourceRepo } = createService();
      resourceRepo.findOne.mockResolvedValue(
        mockResource({ maxBookingMinutes: 30 }),
      );

      await expect(
        service.create(memberPayload, ORG_ID, {
          resourceId: 'r-1',
          startsAt: new Date('2025-01-01T10:00:00Z'),
          endsAt: new Date('2025-01-01T11:00:00Z'),
          title: 'Too long',
        }),
      ).rejects.toMatchObject({ response: { errorCode: 'BOOKING_DURATION_EXCEEDED' } });
    });

    it('rejects overlapping bookings', async () => {
      const { service, resourceRepo, qb } = createService();
      resourceRepo.findOne.mockResolvedValue(mockResource());
      qb.getCount.mockResolvedValue(1);

      await expect(
        service.create(memberPayload, ORG_ID, {
          resourceId: 'r-1',
          startsAt: new Date('2025-01-01T10:00:00Z'),
          endsAt: new Date('2025-01-01T10:30:00Z'),
          title: 'Overlap',
        }),
      ).rejects.toMatchObject({ response: { errorCode: 'BOOKING_CONFLICT' } });
    });
  });

  describe('findOne', () => {
    it('returns booking for owner', async () => {
      const { service, bookingRepo } = createService();
      bookingRepo.findOne.mockResolvedValue(mockBooking());

      const result = await service.findOne(memberPayload, ORG_ID, 'b-1');
      expect(result.id).toBe('b-1');
    });

    it('throws NotFoundException when missing', async () => {
      const { service, bookingRepo } = createService();
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(memberPayload, ORG_ID, 'missing'),
      ).rejects.toMatchObject({ response: { errorCode: 'BOOKING_NOT_FOUND' } });
    });

    it('throws ForbiddenException for non-owner non-admin', async () => {
      const { service, bookingRepo } = createService();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ userId: 'other-user' }),
      );

      await expect(
        service.findOne(memberPayload, ORG_ID, 'b-1'),
      ).rejects.toMatchObject({ response: { errorCode: 'BOOKING_FORBIDDEN' } });
    });

    it('allows admin to view any booking', async () => {
      const { service, bookingRepo } = createService();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ userId: 'other-user' }),
      );

      const result = await service.findOne(adminPayload, ORG_ID, 'b-1');
      expect(result.id).toBe('b-1');
    });
  });

  describe('update', () => {
    it('updates status', async () => {
      const { service, bookingRepo } = createService();
      const booking = mockBooking();
      bookingRepo.findOne
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(booking);

      await service.update(memberPayload, ORG_ID, 'b-1', {
        status: BookingStatus.CANCELLED,
      });

      expect(bookingRepo.save).toHaveBeenCalled();
    });

    it('throws ForbiddenException for non-owner member', async () => {
      const { service, bookingRepo } = createService();
      bookingRepo.findOne.mockResolvedValue(
        mockBooking({ userId: 'other-user' }),
      );

      await expect(
        service.update(memberPayload, ORG_ID, 'b-1', {
          status: BookingStatus.CANCELLED,
        }),
      ).rejects.toMatchObject({ response: { errorCode: 'BOOKING_FORBIDDEN' } });
    });
  });

  describe('remove', () => {
    it('sets status to CANCELLED', async () => {
      const { service, bookingRepo } = createService();
      const booking = mockBooking();
      bookingRepo.findOne.mockResolvedValue(booking);

      await service.remove(memberPayload, ORG_ID, 'b-1');

      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(bookingRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException for missing booking', async () => {
      const { service, bookingRepo } = createService();
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(memberPayload, ORG_ID, 'missing'),
      ).rejects.toMatchObject({ response: { errorCode: 'BOOKING_NOT_FOUND' } });
    });
  });
});
