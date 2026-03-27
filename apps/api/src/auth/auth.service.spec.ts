import { describe, it, expect, rstest } from '@rstest/core';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums/user-role.enum';
import type { User } from '../entities/user.entity';
import type { OrganizationHost } from '../entities/organization-host.entity';

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

import { AuthService } from './auth.service';

const HASH = bcrypt.hashSync('correct-password', 1);

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    organizationId: 'org-1',
    email: 'user@example.com',
    passwordHash: HASH,
    displayName: 'Test User',
    role: UserRole.MEMBER,
    mustChangePassword: false,
    tokenVersion: 0,
    organization: { name: 'Test Org' },
    ...overrides,
  }) as User;

const mockOrgHost = (): OrganizationHost =>
  ({
    id: 'oh-1',
    organizationId: 'org-1',
    host: 'tenant.example.com',
    organization: { id: 'org-1', name: 'Test Org' },
  }) as any;

function createService() {
  const orgHostRepo = {
    findOne: rstest.fn(),
  };
  const userRepo = {
    findOne: rstest.fn(),
    save: rstest.fn(),
  };
  const jwt = {
    sign: rstest.fn().mockReturnValue('signed-token'),
  };
  const config = {
    get: rstest.fn().mockReturnValue(undefined),
    getOrThrow: rstest.fn(),
  };

  const service = new AuthService(
    orgHostRepo as any,
    userRepo as any,
    jwt as any,
    config as any,
  );

  return { service, orgHostRepo, userRepo, jwt, config };
}

describe('AuthService', () => {
  describe('login', () => {
    it('returns token on valid credentials', async () => {
      const { service, orgHostRepo, userRepo } = createService();
      orgHostRepo.findOne.mockResolvedValue(mockOrgHost());
      userRepo.findOne
        .mockResolvedValueOnce(mockUser())
        .mockResolvedValueOnce(null);

      const result = await service.login(
        { email: 'user@example.com', password: 'correct-password' },
        'tenant.example.com',
      );

      expect(result.accessToken).toBe('signed-token');
    });

    it('throws when tenant not found', async () => {
      const { service, orgHostRepo } = createService();
      orgHostRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'user@example.com', password: 'any' },
          'unknown.host',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws on wrong password', async () => {
      const { service, orgHostRepo, userRepo } = createService();
      orgHostRepo.findOne.mockResolvedValue(mockOrgHost());
      userRepo.findOne.mockResolvedValue(mockUser());

      await expect(
        service.login(
          { email: 'user@example.com', password: 'wrong' },
          'tenant.example.com',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('allows super admin login from any tenant', async () => {
      const { service, orgHostRepo, userRepo } = createService();
      orgHostRepo.findOne.mockResolvedValue(mockOrgHost());
      const superAdmin = mockUser({
        id: 'sa-1',
        role: UserRole.SUPER_ADMIN,
        organizationId: null,
      });
      userRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(superAdmin);

      const result = await service.login(
        { email: 'user@example.com', password: 'correct-password' },
        'tenant.example.com',
      );

      expect(result.accessToken).toBe('signed-token');
    });
  });

  describe('platformLogin', () => {
    it('returns token for super admin', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(
        mockUser({ role: UserRole.SUPER_ADMIN }),
      );

      const result = await service.platformLogin({
        email: 'admin@example.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('signed-token');
    });

    it('throws when user not found', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.platformLogin({
          email: 'nobody@example.com',
          password: 'any',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws on wrong password', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(
        mockUser({ role: UserRole.SUPER_ADMIN }),
      );

      await expect(
        service.platformLogin({
          email: 'admin@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('returns user data', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(mockUser());

      const result = await service.me({
        sub: 'user-1',
        organizationId: 'org-1',
        email: 'user@example.com',
        role: UserRole.MEMBER,
        tokenVersion: 0,
      });

      expect(result.userId).toBe('user-1');
      expect(result.email).toBe('user@example.com');
      expect(result.organizationName).toBe('Test Org');
    });

    it('throws when user not found', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.me({
          sub: 'missing',
          organizationId: 'org-1',
          email: 'x@x.com',
          role: UserRole.MEMBER,
          tokenVersion: 0,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      const { service, userRepo } = createService();
      const user = mockUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.changePassword(
        {
          sub: 'user-1',
          organizationId: 'org-1',
          email: 'user@example.com',
          role: UserRole.MEMBER,
          tokenVersion: 0,
        },
        { currentPassword: 'correct-password', newPassword: 'new-password' },
      );

      expect(userRepo.save).toHaveBeenCalled();
      expect(user.mustChangePassword).toBe(false);
      expect(user.tokenVersion).toBe(1);
    });

    it('throws on wrong current password', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(mockUser());

      await expect(
        service.changePassword(
          {
            sub: 'user-1',
            organizationId: 'org-1',
            email: 'x@x.com',
            role: UserRole.MEMBER,
            tokenVersion: 0,
          },
          { currentPassword: 'wrong', newPassword: 'new' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when new password equals current', async () => {
      const { service, userRepo } = createService();
      userRepo.findOne.mockResolvedValue(mockUser());

      await expect(
        service.changePassword(
          {
            sub: 'user-1',
            organizationId: 'org-1',
            email: 'x@x.com',
            role: UserRole.MEMBER,
            tokenVersion: 0,
          },
          {
            currentPassword: 'correct-password',
            newPassword: 'correct-password',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('issueTokens (via login)', () => {
    it('sets organizationId to null for SUPER_ADMIN', async () => {
      const { service, userRepo, jwt, orgHostRepo } = createService();
      orgHostRepo.findOne.mockResolvedValue(mockOrgHost());
      userRepo.findOne
        .mockResolvedValueOnce(
          mockUser({
            role: UserRole.SUPER_ADMIN,
            organizationId: 'org-1',
          }),
        )
        .mockResolvedValueOnce(null);

      await service.login(
        { email: 'user@example.com', password: 'correct-password' },
        'tenant.example.com',
      );

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: null, tokenVersion: 0 }),
      );
    });
  });
});
