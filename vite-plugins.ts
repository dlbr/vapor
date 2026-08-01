import type { Plugin } from 'vite';

const SCRIPT_TAG_RE = /<script(\s[^>]*)?>/g;

/**
 * Fails the build on any SFC that is not `<script setup vapor>`.
 *
 * Attributes are read as a set rather than matched in sequence, so
 * `<script setup lang="ts" vapor>` and `<script vapor setup>` are both accepted
 * — the compiler does not care about ordering either.
 */
export function vaporOnly(): Plugin {
  return {
    name: 'dlbr-vapor-only',
    enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('.vue')) return null;
      if (id.includes('/node_modules/')) return null;

      const hasVaporSetup = [...source.matchAll(SCRIPT_TAG_RE)].some((match) => {
        const attrs = (match[1] ?? '').split(/\s+/).map((attr) => attr.split('=')[0]);
        return attrs.includes('setup') && attrs.includes('vapor');
      });

      if (!hasVaporSetup) {
        throw new Error(`${id} must use <script setup vapor>; VDOM fallback is disabled.`);
      }
      return null;
    },
  };
}

/**
 * Virtual DOM implementation symbols. These are function *definitions* from
 * @vue/runtime-core, not import specifiers or package names — the bundler
 * inlines modules, so package names survive only inside banner comments and
 * would produce false positives.
 */
const VDOM_MARKERS = [
  'function baseCreateRenderer',
  'function createBaseVNode',
  'function createVNode',
  'function createElementBlock',
  'function openBlock',
  'function patchKeyedChildren',
  'function createRenderer',
];

/**
 * Fails the client build if the virtual DOM renderer reaches the bundle.
 *
 * This replaces the previous post-build grep over `public/`, which could not
 * work: minification renames every one of these identifiers, so the scan passed
 * unconditionally. Running as `renderChunk` with `order: 'pre'` inspects the
 * code after tree-shaking but before the minifier — the only point where both
 * the symbol names and the shake results are true.
 */
export function assertVaporOnly(): Plugin {
  return {
    name: 'dlbr-assert-vapor-only',
    apply: 'build',
    enforce: 'post',
    renderChunk: {
      order: 'pre',
      handler(code, chunk) {
        const found = VDOM_MARKERS.filter((marker) => code.includes(marker));
        if (found.length > 0) {
          this.error(
            `VDOM runtime reached the Vapor client bundle (${chunk.fileName}).\n`
            + `Found: ${found.join(', ')}\n`
            + 'Something imported a virtual DOM entry point — check for imports of '
            + 'entry-server.ts, vue/server-renderer, or a non-vapor component.',
          );
        }
        return null;
      },
    },
  };
}
