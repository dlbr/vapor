import type { RouteConfig } from './router';
import Index from './views/Index.vue';
import BlogView from './views/BlogView.vue';
import UseCases from './views/UseCases.vue';

export const routes: RouteConfig[] = [
  { path: '/', component: Index },
  { path: '/blog', component: BlogView },
  { path: '/blog/:slug', component: BlogView },
  { path: '/use-cases', redirect: '/use-cases/' },
  { path: '/use-cases/', component: UseCases },
  { path: '*', redirect: '/' },
];
