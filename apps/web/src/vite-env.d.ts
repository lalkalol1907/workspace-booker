/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

export {};

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean;
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
  }
}
