/// <reference types="vite/client" />

export {};

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean;
    requiresAuth?: boolean;
  }
}
