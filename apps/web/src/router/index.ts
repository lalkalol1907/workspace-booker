import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/views/ChangePasswordView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      redirect: '/calendar',
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/views/CalendarView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/resources',
      name: 'resources',
      component: () => import('@/views/ResourcesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/bookings',
      name: 'bookings',
      component: () => import('@/views/BookingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/locations',
      name: 'admin-locations',
      component: () => import('@/views/AdminLocationsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/resources',
      name: 'admin-resources',
      component: () => import('@/views/AdminResourcesView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/AdminUsersView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!auth.token && to.meta.requiresAuth) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (auth.token && to.meta.guest) {
    return { path: '/' };
  }
  if (
    auth.token &&
    auth.user &&
    !auth.user.mustChangePassword &&
    to.name === 'change-password'
  ) {
    return { name: 'calendar' };
  }
  if (
    auth.token &&
    auth.user?.mustChangePassword &&
    to.name !== 'change-password'
  ) {
    return { name: 'change-password', query: { redirect: to.fullPath } };
  }
  if (to.meta.requiresAdmin) {
    if (!auth.isAdmin) {
      return { name: 'calendar' };
    }
    if (
      typeof window !== 'undefined' &&
      !window.matchMedia('(min-width: 768px)').matches
    ) {
      return { name: 'calendar' };
    }
  }
  return true;
});

export default router;
