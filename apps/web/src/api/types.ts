export type UserRole = 'super_admin' | 'admin' | 'member';

export type ResourceType = 'desk' | 'room' | 'other';

export type BookingStatus = 'confirmed' | 'cancelled';

export interface MeResponse {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  mustChangePassword: boolean;
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
  host: string;
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
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface BookingDto {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
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
