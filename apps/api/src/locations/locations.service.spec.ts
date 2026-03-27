import { describe, it, expect, rstest } from '@rstest/core';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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

import { LocationsService } from './locations.service';

const ORG_ID = 'org-1';

const mockLocation = (overrides: Partial<Location> = {}): Location =>
  ({
    id: 'loc-1',
    organizationId: ORG_ID,
    name: 'Floor 1',
    parentId: null,
    createdAt: new Date(),
    ...overrides,
  }) as Location;

function createService() {
  const locationRepo = {
    find: rstest.fn().mockResolvedValue([]),
    findOne: rstest.fn(),
    save: rstest.fn((l: any) => l),
    create: rstest.fn((dto: any) => ({ id: 'loc-new', ...dto })),
    count: rstest.fn().mockResolvedValue(0),
    delete: rstest.fn(),
  };
  const resourceRepo = {
    count: rstest.fn().mockResolvedValue(0),
  };

  const service = new LocationsService(
    locationRepo as any,
    resourceRepo as any,
  );
  return { service, locationRepo, resourceRepo };
}

describe('LocationsService', () => {
  describe('create', () => {
    it('creates a location', async () => {
      const { service, locationRepo } = createService();

      const result = await service.create(ORG_ID, { name: 'New Room' });

      expect(locationRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('New Room');
    });

    it('creates with valid parentId', async () => {
      const { service, locationRepo } = createService();
      locationRepo.findOne.mockResolvedValue(mockLocation());

      const result = await service.create(ORG_ID, {
        name: 'Sub',
        parentId: 'loc-1',
      });

      expect(result.parentId).toBe('loc-1');
    });

    it('rejects invalid parentId', async () => {
      const { service, locationRepo } = createService();
      locationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(ORG_ID, { name: 'Sub', parentId: 'missing' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates name', async () => {
      const { service, locationRepo } = createService();
      locationRepo.findOne.mockResolvedValue(mockLocation());

      const result = await service.update(ORG_ID, 'loc-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
      expect(locationRepo.save).toHaveBeenCalled();
    });

    it('rejects self as parent', async () => {
      const { service, locationRepo } = createService();
      locationRepo.findOne.mockResolvedValue(mockLocation());

      await expect(
        service.update(ORG_ID, 'loc-1', { parentId: 'loc-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects parent from different org', async () => {
      const { service, locationRepo } = createService();
      locationRepo.findOne
        .mockResolvedValueOnce(mockLocation())
        .mockResolvedValueOnce(null);

      await expect(
        service.update(ORG_ID, 'loc-1', { parentId: 'foreign-loc' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deletes location with no children or resources', async () => {
      const { service, locationRepo, resourceRepo } = createService();
      locationRepo.findOne.mockResolvedValue(mockLocation());
      locationRepo.count.mockResolvedValue(0);
      resourceRepo.count.mockResolvedValue(0);

      await service.remove(ORG_ID, 'loc-1');

      expect(locationRepo.delete).toHaveBeenCalledWith('loc-1');
    });

    it('rejects deletion if has children', async () => {
      const { service, locationRepo } = createService();
      locationRepo.findOne.mockResolvedValue(mockLocation());
      locationRepo.count.mockResolvedValue(2);

      await expect(service.remove(ORG_ID, 'loc-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects deletion if has resources', async () => {
      const { service, locationRepo, resourceRepo } = createService();
      locationRepo.findOne.mockResolvedValue(mockLocation());
      locationRepo.count.mockResolvedValue(0);
      resourceRepo.count.mockResolvedValue(3);

      await expect(service.remove(ORG_ID, 'loc-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for missing location', async () => {
      const { service, locationRepo } = createService();
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(ORG_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
