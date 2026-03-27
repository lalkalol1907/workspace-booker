import { describe, it, expect, rstest } from '@rstest/core';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import type { User } from '../entities/user.entity';
import type { Organization } from '../entities/organization.entity';

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

import { PlatformService } from './platform.service';

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'u-1',
    organizationId: null,
    email: 'admin@test.com',
    passwordHash: 'hashed',
    displayName: 'Admin',
    role: UserRole.SUPER_ADMIN,
    mustChangePassword: false,
    ...overrides,
  }) as User;

const mockOrg = (overrides: Partial<Organization> = {}): Organization =>
  ({
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    createdAt: new Date(),
    hosts: [{ host: 'acme.example.com' }],
    ...overrides,
  }) as any;

function createService() {
  const orgRepo = {
    find: rstest.fn().mockResolvedValue([]),
    findOne: rstest.fn(),
    findOneOrFail: rstest.fn(),
    save: rstest.fn((o: any) => o),
    create: rstest.fn((dto: any) => ({ id: 'org-new', ...dto })),
    exist: rstest.fn().mockResolvedValue(false),
  };
  const orgHostRepo = {
    findOne: rstest.fn(),
    save: rstest.fn((h: any) => h),
    create: rstest.fn((dto: any) => dto),
    exist: rstest.fn().mockResolvedValue(false),
    delete: rstest.fn(),
  };
  const userRepo = {
    find: rstest.fn().mockResolvedValue([]),
    findOne: rstest.fn(),
    save: rstest.fn((u: any) => u),
    create: rstest.fn((dto: any) => ({ id: 'u-new', ...dto })),
  };
  const config = {
    get: rstest.fn().mockReturnValue(undefined),
  };

  const service = new PlatformService(
    orgRepo as any,
    orgHostRepo as any,
    userRepo as any,
    config as any,
  );
  return { service, orgRepo, orgHostRepo, userRepo, config };
}

describe('PlatformService', () => {
  describe('upsertPlatformAdmin', () => {
    it('creates new super admin when user does not exist', async () => {
      const { service, userRepo } = createService();
      userRepo.find.mockResolvedValue([]);

      const result = await service.upsertPlatformAdmin({
        email: 'new@test.com',
      });

      expect(result.action).toBe('created');
      expect(result.temporaryPassword).toBeDefined();
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('promotes existing non-admin user', async () => {
      const { service, userRepo } = createService();
      userRepo.find.mockResolvedValue([mockUser({ role: UserRole.MEMBER })]);

      const result = await service.upsertPlatformAdmin({
        email: 'member@test.com',
      });

      expect(result.action).toBe('promoted');
      expect(result.temporaryPassword).toBeNull();
    });

    it('returns already_super_admin for existing super admin', async () => {
      const { service, userRepo } = createService();
      userRepo.find.mockResolvedValue([
        mockUser({ role: UserRole.SUPER_ADMIN }),
      ]);

      const result = await service.upsertPlatformAdmin({
        email: 'admin@test.com',
      });

      expect(result.action).toBe('already_super_admin');
    });

    it('throws ConflictException on duplicate emails', async () => {
      const { service, userRepo } = createService();
      userRepo.find.mockResolvedValue([mockUser(), mockUser({ id: 'u-2' })]);

      await expect(
        service.upsertPlatformAdmin({ email: 'dup@test.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createOrganization', () => {
    it('creates organization with hosts', async () => {
      const { service, orgRepo, orgHostRepo } = createService();
      orgRepo.exist.mockResolvedValue(false);
      orgHostRepo.exist.mockResolvedValue(false);
      orgRepo.findOneOrFail.mockResolvedValue(mockOrg());

      const result = await service.createOrganization({
        name: 'Acme',
        slug: 'acme',
        hosts: ['acme.example.com'],
      });

      expect(result.name).toBe('Acme');
      expect(orgRepo.save).toHaveBeenCalled();
    });

    it('rejects empty hosts', async () => {
      const { service } = createService();

      await expect(
        service.createOrganization({
          name: 'No Host',
          slug: 'nohost',
          hosts: [''],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate slug', async () => {
      const { service, orgRepo, orgHostRepo } = createService();
      orgRepo.exist.mockResolvedValue(true);
      orgHostRepo.exist.mockResolvedValue(false);

      await expect(
        service.createOrganization({
          name: 'Dup',
          slug: 'taken',
          hosts: ['dup.example.com'],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects duplicate host', async () => {
      const { service, orgRepo, orgHostRepo } = createService();
      orgRepo.exist.mockResolvedValue(false);
      orgHostRepo.exist.mockResolvedValue(true);

      await expect(
        service.createOrganization({
          name: 'DupHost',
          slug: 'duphost',
          hosts: ['taken.example.com'],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects reserved platform host', async () => {
      const { service, config, orgRepo, orgHostRepo } = createService();
      config.get.mockImplementation((key: string) =>
        key === 'PLATFORM_HOST' ? 'admin.example.com' : undefined,
      );
      orgRepo.exist.mockResolvedValue(false);
      orgHostRepo.exist.mockResolvedValue(false);

      await expect(
        service.createOrganization({
          name: 'Reserved',
          slug: 'reserved',
          hosts: ['admin.example.com'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateOrganization', () => {
    it('updates name and slug', async () => {
      const { service, orgRepo, orgHostRepo } = createService();
      orgRepo.findOne.mockResolvedValue(mockOrg());
      orgHostRepo.findOne.mockResolvedValue(null);
      orgRepo.findOneOrFail.mockResolvedValue(
        mockOrg({ name: 'Updated', slug: 'updated' }),
      );

      const result = await service.updateOrganization('org-1', {
        name: 'Updated',
        slug: 'updated',
        hosts: ['updated.example.com'],
      });

      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException for missing org', async () => {
      const { service, orgRepo } = createService();
      orgRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateOrganization('missing', {
          name: 'X',
          slug: 'x',
          hosts: ['x.com'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects slug conflict with different org', async () => {
      const { service, orgRepo, orgHostRepo } = createService();
      orgRepo.findOne
        .mockResolvedValueOnce(mockOrg())
        .mockResolvedValueOnce(mockOrg({ id: 'other-org' }));
      orgHostRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateOrganization('org-1', {
          name: 'X',
          slug: 'taken',
          hosts: ['x.com'],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
