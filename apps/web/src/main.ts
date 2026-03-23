import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { setTenantHeadersProvider } from '@/api/tenant-headers';
import router from './router';
import { useAuthStore } from './stores/auth';
import { useTenantContextStore } from './stores/tenant-context';
import 'vue-sonner/style.css';
import './style.css';

async function main() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);
  setTenantHeadersProvider(() => {
    const auth = useAuthStore();
    const tenant = useTenantContextStore();
    if (
      auth.user?.role === 'super_admin' &&
      tenant.selectedOrgId
    ) {
      return { 'X-Organization-Id': tenant.selectedOrgId };
    }
    return {};
  });
  const auth = useAuthStore();
  await auth.bootstrap();
  app.mount('#app');
}

void main();
