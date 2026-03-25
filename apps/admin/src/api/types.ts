export type UserRole = 'super_admin' | 'admin' | 'member';

export interface TokenResponse {
  accessToken: string;
}

export interface MeResponse {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  mustChangePassword: boolean;
  organizationName: string | null;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  host: string;
  createdAt: string;
}
