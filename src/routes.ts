import type { RouteConfig } from './router';
import Index from './views/Index.vue';

export const routes: RouteConfig[] = [
  { path: '/', component: Index },
  { path: '*', redirect: '/' },
];
