import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { assertVaporOnly, vaporOnly } from './vite-plugins.ts';

// Builds the browser half: the same SFCs compiled through @vue/compiler-vapor,
// with no virtual DOM. See vite.worker.config.ts for the server half.
const vueVaporOptions = { features: { vapor: true } };

export default defineConfig({
  // `public/` is hand-authored static input (robots.txt, llms.txt). Vite copies
  // it into the build output; nothing ever writes back into it. Wrangler
  // uploads the whole of `dist/client` as the asset layer.
  publicDir: 'public',
  plugins: [vaporOnly(), vue(vueVaporOptions as never), assertVaporOnly()],
  build: {
    target: 'es2022',
    outDir: 'dist/client',
    emptyOutDir: true,
    cssCodeSplit: true,
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: 'src/main.ts',
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
      output: {
        entryFileNames: 'assets/entry-client.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
