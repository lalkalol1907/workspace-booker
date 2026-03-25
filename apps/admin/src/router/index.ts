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
      path: '/',
      redirect: '/tenants',
    },
    {
      path: '/tenants',
      name: 'tenants',
      component: () => import('@/views/TenantsListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tenants/platform-admins',
      name: 'platform-admins',
      component: () => import('@/views/PlatformAdminsView.vue'),
      meta: { requiresAuth: true },
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
  return true;
});

export default router;
