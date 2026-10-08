import { createVaporSSRApp, type VaporComponent } from '@vue/runtime-vapor';
import App from './App.vue';
import { createRouter, provideRouter } from './router';
import { routes } from './routes';
// Vite bundles this shared stylesheet with the view's scoped CSS.
import './assets/css/main.css';

const router = createRouter(routes, window.location.pathname, window.history);
await router.resolve(window.location.pathname);

const app = createVaporSSRApp(App as unknown as VaporComponent);
provideRouter(app, router);
app.mount('#app');
