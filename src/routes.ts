import type { RouteConfig } from './router';
import AdminDashboardView from './views/AdminDashboardView.vue';
import LoginView from './views/LoginView.vue';

export const routes: RouteConfig[] = [
  { path: '/', component: LoginView },
  { path: '/login', component: LoginView },
  { path: '/admin', component: AdminDashboardView },
  { path: '*', redirect: '/' },
];
