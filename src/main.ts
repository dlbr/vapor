import { createVaporSSRApp, type VaporComponent } from '@vue/runtime-vapor';
import App from './App.vue';
import { createRouter, provideRouter } from './router';
import { routes } from './routes';
// Route stylesheets are imported by their own views, so the built stylesheet
// carries every screen — that is what makes client-side navigation styled.
import './styles/global.css';

const router = createRouter(routes, window.location.pathname, window.history);
await router.resolve(window.location.pathname);

const app = createVaporSSRApp(App as unknown as VaporComponent);
provideRouter(app, router);
app.mount('#app');

/**
 * Attach the full stylesheet after hydration.
 *
 * This document's own CSS is already inlined in the head, so the built sheet is
 * only needed for screens reached by client-side navigation — which cannot
 * happen before this code runs anyway. Shipping it as a `<link>` in the markup
 * put a render-blocking request for a file this page never uses into the
 * critical path; injecting it here keeps it out.
 *
 * Nothing degrades without JavaScript: a server-rendered page is fully styled
 * by the inlined critical CSS, and client-side navigation needs this script to
 * work regardless.
 */
if (import.meta.env.PROD) {
	const stylesheet = document.createElement('link');
	stylesheet.rel = 'stylesheet';
	stylesheet.href = '/assets/main.css';
	document.head.appendChild(stylesheet);
}
