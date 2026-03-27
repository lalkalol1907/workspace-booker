import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Toaster } from 'vue-sonner';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import 'vue-sonner/style.css';
import './style.css';

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);
  // eslint-disable-next-line vue/multi-word-component-names
  app.component('Toaster', Toaster);

  const auth = useAuthStore();
  await auth.bootstrap();

  app.mount('#app');
}

void main();
