import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { vaporOnly } from './vite-plugins.ts';

// Builds the Cloudflare Worker. The SFCs compile through @vue/compiler-ssr here
// (string-push render functions) rather than @vue/compiler-vapor — Vapor's
// client runtime hydrates that output directly. See vite.config.ts for the
// browser half.
//
// No `assertVaporOnly()` in this build: the server *should* contain the virtual
// DOM renderer, since that is what @vue/server-renderer uses.
const vueVaporOptions = { features: { vapor: true } };

export default defineConfig(({ mode }) => ({
  // `import.meta.env.DEV` cannot be used for this: Vite forces PROD on SSR
  // builds regardless of `--mode`, so the dev branch compiled out and
  // `pnpm run dev` silently served production markup — the Vite dev server on
  // :5173 was running but nothing ever requested anything from it.
  define: { __DEV_SHELL__: JSON.stringify(mode === 'development') },
  publicDir: false,
  plugins: [vaporOnly(), vue(vueVaporOptions as never)],
  ssr: {
    // Workers have no runtime module resolution, so the whole dependency graph
    // has to be inlined into the uploaded script.
    noExternal: true,
    target: 'webworker',
  },
  build: {
    ssr: true,
    target: 'es2022',
    outDir: 'dist/worker',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: 'server/worker.ts',
      output: {
        format: 'esm',
        entryFileNames: 'index.mjs',
      },
    },
  },
}));
