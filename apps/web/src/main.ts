import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import { setTenantHeadersProvider } from '@/api/tenant-headers';
import router from './router';
import { useAuthStore } from './stores/auth';
import { useTenantContextStore } from './stores/tenant-context';
import { useThemeStore } from './stores/theme';
import 'vue-sonner/style.css';
import './style.css';

 
registerSW({ immediate: true });

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);
  useThemeStore().init();
  setTenantHeadersProvider((): Record<string, string> => {
    const auth = useAuthStore();
    const tenant = useTenantContextStore();
    if (auth.user?.role === 'super_admin') {
      if (tenant.selectedOrgId) {
        return { 'X-Organization-Id': tenant.selectedOrgId };
      }
      const host = window.location.hostname.trim().toLowerCase();
      const matched = tenant.organizations.find((o) =>
        o.hosts.some((h) => h.trim().toLowerCase() === host),
      );
      if (matched) {
        return { 'X-Organization-Id': matched.id };
      }
    }
    return {};
  });
  const auth = useAuthStore();
  await auth.bootstrap();
  app.mount('#app');
}

void main();
