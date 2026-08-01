import type { RouteConfig } from './router';
import PosRegisterView from './views/PosRegisterView.vue';
import PosSetupView from './views/PosSetupView.vue';

export const routes: RouteConfig[] = [
  { path: '/', component: PosRegisterView },
  { path: '/setup', component: PosSetupView },
  { path: '*', redirect: '/' },
];