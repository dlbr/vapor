import { createVaporSSRApp, type VaporComponent } from '@vue/runtime-vapor';
import { watch } from 'vue';
import App from './App.vue';
import { createRouter, provideRouter } from './router';
import { routes } from './routes';
import { useState } from './use-state';
// Route stylesheets are imported by their own views, so the built stylesheet
// carries every screen — that is what makes client-side navigation styled.
import './styles/global.css';

const router = createRouter(routes, window.location.pathname, window.history);
await router.resolve(window.location.pathname);

const configState = useState('config', () => ({
	isChecked: false,
	isConfigured: false,
}), { persist: true });
let setupVisited = window.location.pathname === '/setup';

async function guard(path: string) {
	if (path === '/setup') {
		setupVisited = true;
		return;
	}

	if (!configState.value.isChecked) {
		try {
			const response = await fetch('/api/config', {
				headers: { 'X-Compatibility-Date': '2026-06-25' },
			});
			if (response.ok) {
				const config = await response.json();
				configState.value.isConfigured = Boolean(config?.lPfrUrl);
			}
		} catch {
			configState.value.isConfigured = false;
		}
		configState.value.isChecked = true;
	}

	if (!configState.value.isConfigured && !setupVisited) {
		await router.navigate('/setup', { replace: true });
	}
}

watch(
	() => router.currentPath.value,
	(path) => {
		void guard(path);
	},
	{ immediate: true },
);

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