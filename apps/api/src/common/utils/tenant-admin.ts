import { UserRole } from '../enums/user-role.enum';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

export function isTenantAdmin(user: JwtPayload): boolean {
  return (
    user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN
  );
}
