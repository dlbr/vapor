import type { RouteConfig } from './router';
import AdminDashboardView from './views/AdminDashboardView.vue';

export const routes: RouteConfig[] = [
  { path: '/', component: AdminDashboardView },
  { path: '/admin', component: AdminDashboardView },
  { path: '*', redirect: '/' },
];
