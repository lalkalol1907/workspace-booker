export type UserRole = 'super_admin' | 'admin' | 'member';

export type ResourceType = 'desk' | 'room' | 'other';

export type BookingStatus =
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface MeResponse {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  mustChangePassword: boolean;
  /** Имя организации; для super_admin с аккаунта платформы обычно null. */
  organizationName: string | null;
}

export interface InviteUserResponse {
  userId: string;
  email: string;
  displayName: string;
  temporaryPassword: string;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface TokenResponse {
  accessToken: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  hosts: string[];
  createdAt: string;
}

export interface LocationDto {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface ResourceDto {
  id: string;
  locationId: string;
  name: string;
  type: ResourceType;
  capacity: number;
  maxBookingMinutes: number | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface BookingDto {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  startsAt: string;
  endsAt: string;
  title: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BusyInterval {
  startsAt: string;
  endsAt: string;
  bookingId: string;
}
