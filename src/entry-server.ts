import { createSSRApp } from 'vue';
import { renderToWebStream } from 'vue/server-renderer';
import App from './App.vue';
import { getRouteHead, type HeadConfig } from './head';
import { createRouter, provideRouter } from './router';
import { routes } from './routes';
import { provideStateRegistry } from './use-state';
import globalStyles from './styles/global.css?inline';
import adminStyles from './styles/routes/admin.css?inline';
import loginStyles from './styles/routes/login.css?inline';

/**
 * Route path -> the stylesheet for that screen.
 *
 * Deliberately keyed by path rather than derived from `routes.ts`: only the
 * server needs these strings, and importing them from shared route config
 * would embed every screen's CSS into the client JS bundle as well.
 *
 * A route with no entry here simply renders with the global styles.
 */
const routeStyles: Record<string, string> = {
  '/': loginStyles,
  '/login': loginStyles,
  '/admin': adminStyles,
};

/** `</style>` is neutralised so a stylesheet can never close its own tag. */
function sanitizeCss(css: string) {
  return css.replace(/<\/(style)/gi, '<\\/$1');
}

/**
 * Critical CSS for one route: the shared layer plus that screen's own rules,
 * and nothing belonging to screens the visitor has not reached.
 *
 * Inlining this beats linking it — a linked stylesheet is render-blocking, so
 * it costs a round trip before first paint. The remaining screens' CSS arrives
 * with the full stylesheet, which the document loads without blocking paint.
 */
export function getInlineStyles(path: string) {
  return sanitizeCss(globalStyles + (routeStyles[path] ?? ''));
}

export interface RenderResult {
  status: number;
  /** Set when the matched route is a redirect; the caller should answer 302. */
  redirect?: string;
  /** Serialized `<head>` children, already escaped. */
  head: string;
  /** Serialized attributes for the `<html>` element, already escaped. */
  htmlAttrs: string;
  /** Critical CSS for this route: global layer plus this screen's own rules. */
  styles: string;
  /**
   * App markup. Null for redirects, misses, and `includeBody: false`.
   *
   * Note this is *not* pull-driven: `renderToWebStream` starts rendering inside
   * the stream's `start` callback, which runs on construction. Declining to
   * read it does not avoid the work — that is what `includeBody` is for.
   */
  stream: ReadableStream<Uint8Array> | null;
}

export interface RenderOptions {
  /**
   * Set false to resolve the route and its head without rendering the body,
   * which is what a `HEAD` request needs.
   */
  includeBody?: boolean;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

/**
 * Serializes a head config to markup.
 *
 * Meta and link tags carry `data-head`, which is how `useHead` recognises them
 * on the client: it adopts them instead of appending duplicates, and can then
 * remove the ones a later route stops declaring. Tags outside this config —
 * charset, viewport, the stylesheet — are deliberately unmarked and never
 * touched by the client.
 */
export function renderHead(config: HeadConfig) {
  const title = config.title ? `<title>${escapeHtml(config.title)}</title>` : '';
  const meta = (config.meta ?? []).map((item) => {
    const attribute = item.name ? `name="${escapeHtml(item.name)}"` : `property="${escapeHtml(item.property ?? '')}"`;
    return `<meta ${attribute} content="${escapeHtml(item.content)}" data-head>`;
  });
  const links = (config.link ?? []).map((item) => `<link rel="${escapeHtml(item.rel)}" href="${escapeHtml(item.href)}" data-head>`);

  return [title, ...meta, ...links].filter(Boolean).join('');
}

export function renderHtmlAttrs(config: HeadConfig) {
  return Object.entries(config.htmlAttrs ?? {})
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(' ');
}

/**
 * Renders the real component tree.
 *
 * The SFCs are compiled twice: through `@vue/compiler-ssr` here (string-push
 * render functions) and through `@vue/compiler-vapor` for the browser. Vapor's
 * client runtime adopts this markup during hydration rather than re-creating
 * it, so the `.vue` files stay the single source of truth for the markup.
 *
 * The route is resolved before anything renders, so the caller knows the status
 * and can flush `<head>` ahead of the body. Rendering itself begins as soon as
 * `renderToWebStream` is called rather than on first read; the caller still
 * controls wire order, but not whether the work happens.
 */
export async function renderApp(path: string, options: RenderOptions = {}): Promise<RenderResult> {
  // `history: null` marks this router as server-side: redirects are reported
  // instead of followed, so the browser gets a real 302 and the correct URL.
  const router = createRouter(routes, path, null);
  const result = await router.resolve(path);
  const head = getRouteHead(path);

  if (result.status !== 200) {
    return {
      status: result.status,
      redirect: result.redirect,
      head: renderHead(head),
      htmlAttrs: renderHtmlAttrs(head),
      // No document is produced for a redirect or a miss, so there is nothing
      // for critical CSS to be critical to.
      styles: '',
      stream: null,
    };
  }

  const base = {
    status: 200 as const,
    head: renderHead(head),
    htmlAttrs: renderHtmlAttrs(head),
  };

  if (options.includeBody === false) {
    return { ...base, styles: '', stream: null };
  }

  const app = createSSRApp(App as never);
  provideRouter(app, router);
  provideStateRegistry(app);

  return {
    ...base,
    styles: getInlineStyles(path),
    stream: renderToWebStream(app, {}),
  };
}
