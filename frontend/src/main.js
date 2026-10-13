import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';

import App from './App.vue';
import router from './router';
import './style.css';

createApp(App)
  .use(createPinia())
  .use(router)
  // The app has a light design only. Without this, PrimeVue follows the dark mode of the
  // operating system and the inputs turn black on the light page.
  .use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } })
  .use(ToastService)
  .use(ConfirmationService)
  .mount('#app');
