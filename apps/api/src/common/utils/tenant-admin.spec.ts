import { describe, it, expect } from '@rstest/core';
import { isTenantAdmin } from './tenant-admin';
import { UserRole } from '../enums/user-role.enum';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

const payload = (role: UserRole): JwtPayload => ({
  sub: 'user-id',
  organizationId: 'org-id',
  email: 'test@test.com',
  role,
});

describe('isTenantAdmin', () => {
  it('returns true for ADMIN', () => {
    expect(isTenantAdmin(payload(UserRole.ADMIN))).toBe(true);
  });

  it('returns true for SUPER_ADMIN', () => {
    expect(isTenantAdmin(payload(UserRole.SUPER_ADMIN))).toBe(true);
  });

  it('returns false for MEMBER', () => {
    expect(isTenantAdmin(payload(UserRole.MEMBER))).toBe(false);
  });
});
