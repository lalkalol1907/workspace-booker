export enum UserRole {
  /** Platform operator: all tenants, tenant context via X-Organization-Id. */
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MEMBER = 'member',
}
