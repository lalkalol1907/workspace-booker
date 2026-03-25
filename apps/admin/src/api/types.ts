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
  hosts: string[];
  createdAt: string;
}

export interface PlatformAdminSummary {
  id: string;
  email: string;
  displayName: string;
}

export interface PlatformAdminUpsertResult {
  userId: string;
  email: string;
  displayName: string;
  action: 'created' | 'promoted' | 'already_super_admin';
  temporaryPassword?: string | null;
}
