import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  /** Null for platform super_admin (no home tenant). */
  organizationId: string | null;
  email: string;
  role: UserRole;
}
