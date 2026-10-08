import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "id-admin",
		compatibilityDate: "2026-06-25",
		entrypoint: "../dist/worker/index.mjs",
		workersDev: true,
		previewUrls: false,
		cache: {
			enabled: true,
		},
		env: {
			ID_STAGING: bindings.worker({
				worker: "id-staging",
			}),
			OG_IMAGES: bindings.worker({
				worker: "id-og",
			}),
			BLOG_CMS: bindings.worker({
				worker: "id-blog-cms",
				dev: { remote: true },
			}),
			BLOG_CMS_TOKEN: bindings.secret(),
			ASSETS: bindings.assets(),
		},
	},
});
