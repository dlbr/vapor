/**
 * True only when the Worker is built with `--mode development`, i.e. by
 * `dev:worker`. Set via `define` rather than read from `import.meta.env`,
 * because Vite forces PROD on SSR builds and the dev branch would compile away.
 */
declare const __DEV_SHELL__: boolean;

interface ImportMetaEnv {
  readonly VITE_SSR_HYDRATE?: string;
  readonly DEV: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { VaporComponent } from '@vue/runtime-vapor';

  const component: VaporComponent;
  export default component;
}

declare module '*.css' {}

// `?inline` returns the processed stylesheet as a string instead of emitting a
// file, which is how the SSR entry inlines critical CSS into the document head.
declare module '*.css?inline' {
  const css: string;
  export default css;
}