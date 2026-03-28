import { describe, it, expect, rstest } from '@rstest/core';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import type { User } from '../entities/user.entity';

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

import { UsersService } from './users.service';

const ORG_ID = 'org-1';

const adminPayload: JwtPayload = {
  sub: 'admin-1',
  organizationId: ORG_ID,
  email: 'admin@test.com',
  role: UserRole.ADMIN,
  tokenVersion: 0,
};

const superAdminPayload: JwtPayload = {
  sub: 'sa-1',
  organizationId: null,
  email: 'sa@test.com',
  role: UserRole.SUPER_ADMIN,
  tokenVersion: 0,
};

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    organizationId: ORG_ID,
    email: 'member@test.com',
    passwordHash: 'hashed',
    displayName: 'Member',
    role: UserRole.MEMBER,
    mustChangePassword: false,
    tokenVersion: 0,
    ...overrides,
  }) as User;

function createService() {
  const userRepo = {
    find: rstest.fn().mockResolvedValue([]),
    findOne: rstest.fn(),
    save: rstest.fn((u: any) => u),
    create: rstest.fn((dto: any) => ({ id: 'new-user', ...dto })),
    remove: rstest.fn(),
    exist: rstest.fn(),
  };

  const service = new UsersService(userRepo as any);
  return { service, userRepo };
}

describe('UsersService', () => {
  describe('list', () => {
    it('returns mapped users', async () => {
      const { service, userRepo } = createService();
      userRepo.find.mockResolvedValue([mockUser()]);

      const result = await service.list(ORG_ID);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('member@test.com');
    });
  });

  describe('invite', () => {
    it('creates user with mustChangePassword=true', async () => {
      const { service, userRepo } = createService();
      userRepo.exist.mockResolvedValue(false);

      const result = await service.invite(adminPayload, ORG_ID, {
        email: 'new@test.com',
      });

      expect(userRepo.save).toHaveBeenCalled();
      expect(result.email).toBe('new@test.com');
      expect(result.temporaryPassword).toBeDefined();
    });

    it('throws ConflictException on duplicate email', async () => {
      const { service, userRepo } = createService();
      userRepo.exist.mockResolvedValue(true);

      await expect(
        service.invite(adminPayload, ORG_ID, { email: 'existing@test.com' }),
      ).rejects.toMatchObject({ response: { errorCode: 'USER_ALREADY_EXISTS' } });
    });
  });

  describe('remove', () => {
    it('removes user', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(mockUser());

      await service.remove(adminPayload, ORG_ID, 'user-1');

      expect(userRepo.remove).toHaveBeenCalled();
    });

    it('throws NotFoundException when user missing', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(adminPayload, ORG_ID, 'missing'),
      ).rejects.toMatchObject({ response: { errorCode: 'USER_NOT_FOUND' } });
    });

    it('throws ForbiddenException when deleting self', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(mockUser({ id: 'admin-1' }));

      await expect(
        service.remove(adminPayload, ORG_ID, 'admin-1'),
      ).rejects.toMatchObject({ response: { errorCode: 'CANNOT_MODIFY_SELF' } });
    });

    it('non-super-admin cannot delete admin', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(
        mockUser({ id: 'other-admin', role: UserRole.ADMIN }),
      );

      await expect(
        service.remove(adminPayload, ORG_ID, 'other-admin'),
      ).rejects.toMatchObject({ response: { errorCode: 'INSUFFICIENT_ROLE' } });
    });
  });

  describe('resetPassword', () => {
    it('resets password and increments tokenVersion', async () => {
      const { service, userRepo } = createService();
      const user = mockUser();
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.resetPassword(
        adminPayload,
        ORG_ID,
        'user-1',
      );

      expect(result.temporaryPassword).toBeDefined();
      expect(userRepo.save).toHaveBeenCalled();
      expect(user.tokenVersion).toBe(1);
    });

    it('throws ForbiddenException when resetting own password', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(mockUser({ id: 'admin-1' }));

      await expect(
        service.resetPassword(adminPayload, ORG_ID, 'admin-1'),
      ).rejects.toMatchObject({ response: { errorCode: 'CANNOT_MODIFY_SELF' } });
    });
  });

  describe('updateRole', () => {
    it('allows SUPER_ADMIN to change role', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(mockUser());

      await service.updateRole(superAdminPayload, ORG_ID, 'user-1', {
        role: UserRole.ADMIN,
      });

      expect(userRepo.save).toHaveBeenCalled();
    });

    it('throws ForbiddenException for non-SUPER_ADMIN', async () => {
      const { service } = createService();

      await expect(
        service.updateRole(adminPayload, ORG_ID, 'user-1', {
          role: UserRole.ADMIN,
        }),
      ).rejects.toMatchObject({ response: { errorCode: 'INSUFFICIENT_ROLE' } });
    });

    it('cannot change own role', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(
        mockUser({ id: 'sa-1', role: UserRole.MEMBER }),
      );

      await expect(
        service.updateRole(superAdminPayload, ORG_ID, 'sa-1', {
          role: UserRole.ADMIN,
        }),
      ).rejects.toMatchObject({ response: { errorCode: 'CANNOT_MODIFY_SELF' } });
    });

    it('cannot change SUPER_ADMIN role', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(
        mockUser({ id: 'other-sa', role: UserRole.SUPER_ADMIN }),
      );

      await expect(
        service.updateRole(superAdminPayload, ORG_ID, 'other-sa', {
          role: UserRole.MEMBER,
        }),
      ).rejects.toMatchObject({ response: { errorCode: 'INSUFFICIENT_ROLE' } });
    });
  });
});
