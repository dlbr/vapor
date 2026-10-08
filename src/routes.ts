import type { RouteConfig } from './router';
import Index from './views/Index.vue';
import BlogView from './views/BlogView.vue';
import UseCases from './views/UseCases.vue';
import LegalPage from './views/LegalPage.vue';

export const routes: RouteConfig[] = [
  { path: '/', component: Index },
  { path: '/blog', component: BlogView },
  { path: '/blog/:slug', component: BlogView },
  { path: '/use-cases', component: UseCases },
  { path: '/privacy', component: LegalPage },
  { path: '/terms', component: LegalPage },
  { path: '*', redirect: '/' },
];
