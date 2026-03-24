/// <reference types="vite/client" />

export {};

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean;
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    /** Только super_admin (управление тенантами платформы). */
    requiresPlatformAdmin?: boolean;
  }
}
