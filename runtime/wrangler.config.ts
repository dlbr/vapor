import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
	minify: true,
	assetsDirectory: "../dist/client",
});
