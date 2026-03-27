import { describe, it, expect, rstest } from '@rstest/core';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResourceType } from '../common/enums/resource-type.enum';
import type { Resource } from '../entities/resource.entity';
import type { Location } from '../entities/location.entity';

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

import { ResourcesService } from './resources.service';

const ORG_ID = 'org-1';

const mockResource = (overrides: Partial<Resource> = {}): Resource =>
  ({
    id: 'r-1',
    organizationId: ORG_ID,
    locationId: 'loc-1',
    name: 'Room A',
    type: ResourceType.ROOM,
    capacity: 10,
    maxBookingMinutes: null,
    isActive: true,
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  }) as Resource;

function createMockQb(overrides: Record<string, any> = {}) {
  const qb: Record<string, any> = {
    where: rstest.fn().mockReturnThis(),
    andWhere: rstest.fn().mockReturnThis(),
    orderBy: rstest.fn().mockReturnThis(),
    getMany: rstest.fn().mockResolvedValue([]),
    ...overrides,
  };
  return qb;
}

function createService() {
  const qb = createMockQb();
  const resourceRepo = {
    findOne: rstest.fn(),
    save: rstest.fn((r: any) => r),
    create: rstest.fn((dto: any) => ({ id: 'r-new', ...dto })),
    createQueryBuilder: rstest.fn().mockReturnValue(qb),
  };
  const locationRepo = {
    findOne: rstest.fn(),
  };
  const bookingRepo = {
    createQueryBuilder: rstest.fn().mockReturnValue(createMockQb()),
  };

  const service = new ResourcesService(
    resourceRepo as any,
    locationRepo as any,
    bookingRepo as any,
  );
  return { service, resourceRepo, locationRepo };
}

describe('ResourcesService', () => {
  describe('create', () => {
    it('creates a resource', async () => {
      const { service, locationRepo, resourceRepo } = createService();
      locationRepo.findOne.mockResolvedValue({ id: 'loc-1' } as Location);

      const result = await service.create(ORG_ID, {
        locationId: 'loc-1',
        name: 'Desk 1',
        type: ResourceType.ROOM,
        capacity: 1,
      });

      expect(resourceRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Desk 1');
    });

    it('rejects invalid locationId', async () => {
      const { service, locationRepo } = createService();
      locationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(ORG_ID, {
          locationId: 'missing',
          name: 'Bad',
          type: ResourceType.ROOM,
          capacity: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates resource fields', async () => {
      const { service, resourceRepo } = createService();
      resourceRepo.findOne.mockResolvedValue(mockResource());

      const result = await service.update(ORG_ID, 'r-1', {
        name: 'Updated',
        capacity: 20,
      });

      expect(result.name).toBe('Updated');
      expect(result.capacity).toBe(20);
    });

    it('throws NotFoundException for missing resource', async () => {
      const { service, resourceRepo } = createService();
      resourceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(ORG_ID, 'missing', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting isActive=false', async () => {
      const { service, resourceRepo } = createService();
      const resource = mockResource();
      resourceRepo.findOne.mockResolvedValue(resource);

      await service.remove(ORG_ID, 'r-1');

      expect(resource.isActive).toBe(false);
      expect(resourceRepo.save).toHaveBeenCalled();
    });
  });

  describe('availability', () => {
    it('rejects when to <= from', async () => {
      const { service, resourceRepo } = createService();
      resourceRepo.findOne.mockResolvedValue(mockResource());

      const t = new Date('2025-01-01T10:00:00Z');
      await expect(
        service.availability(ORG_ID, 'r-1', { from: t, to: t }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
