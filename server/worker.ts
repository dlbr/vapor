import { renderApp } from '../src/entry-server';
import { Pico } from './pico';
import type { C, Handler } from './pico-types';
import {
  blogApiRoute,
  blogFeedRoute,
  blogMediaRoute,
  blogSitemapRoute,
  loadBlogPageForRender,
} from './blog';
import type { BlogPageData } from '../src/blog-types';

declare const __DEV_SHELL__: boolean;

export { Pico };
export type { C, Fetch, Handler, PicoType, Route } from './pico-types';

/**
 * The Cloudflare Worker entry.
 *
 * Static files are handled by the Assets binding before this code runs — the
 * asset router matches `dist/client` first and only falls through to the Worker
 * on a miss. So `/robots.txt`, `/llms.txt` and everything under `/assets/`
 * never reach this handler.
 */

const BASE_SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  // Redundant beside `frame-ancestors 'none'`, but understood by clients that
  // predate CSP Level 2.
  'x-frame-options': 'DENY',
  // Severs the opener relationship with any window that navigated here, so a
  // popup or referring page cannot reach into this one.
  'cross-origin-opener-policy': 'same-origin',
} as const;

/**
 * Two years, every subdomain, and marked for the preload list.
 *
 * `includeSubDomains` takes effect immediately and is the part with teeth: any
 * subdomain of dlbr.app served over plain HTTP becomes unreachable for anyone
 * whose browser has seen this header, until the max-age lapses. `preload` does
 * nothing until the domain is submitted at hstspreload.org — and removal from
 * that list takes months, so treat submission as one-way.
 */
const HSTS = 'max-age=63072000; includeSubDomains; preload';

/**
 * HSTS is ignored over plain HTTP by spec, but sending it from a dev server
 * would be actively harmful if a browser ever did honour it: `http://127.0.0.1`
 * would stop resolving for two years. Gate on the actual scheme.
 */
function securityHeaders(url: URL) {
  if (url.protocol !== 'https:') return BASE_SECURITY_HEADERS;
  return { ...BASE_SECURITY_HEADERS, 'strict-transport-security': HSTS };
}

const ENCODER = new TextEncoder();
/**
 * Content Security Policy for HTML responses.
 *
 * Styles and scripts are loaded from same-origin assets. There are no inline
 * styles or scripts in the document.
 *
 * `require-trusted-types-for 'script'` is deliberately **absent** here and
 * report-only below. `@vue/runtime-vapor@3.6.0-rc.2` assigns compiled templates
 * straight to `innerHTML` in `template()` without routing them through the
 * `vue` policy the way the virtual DOM path does for `v-html`. Enforcing it
 * survives the first page load — hydration adopts server-rendered nodes and
 * never calls `template()` — and then throws on the first client-side
 * navigation, leaving a blank screen. Flip it to enforcing once Vapor's
 * `template()` uses the policy.
 */
function documentCsp(allowRemoteImages = false) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    allowRemoteImages ? "img-src 'self' data: https:" : "img-src 'self' data:",
    "style-src 'self'",
    "script-src 'self'",
    "connect-src 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * Both screens render from the path alone — no cookies, no per-visitor data —
 * so one cached document is correct for everyone.
 *
 * `max-age=0` keeps browsers revalidating while `s-maxage` lets Cloudflare
 * answer from the edge without invoking the Worker at all. The stale window
 * bounds how long a deploy takes to reach everyone: within it, a visitor can
 * receive markup from the previous build alongside the new client bundle. Vapor
 * treats that as a hydration mismatch and re-renders on the client, so it
 * degrades to a flash rather than a break — but purging the cache on deploy is
 * the way to avoid it entirely.
 */
const DOCUMENT_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';

/** Canonicalisation is permanent, so it can be cached hard. */
const REDIRECT_CACHE = 'public, max-age=31536000';

/** Staged, not enforced — see documentCsp. Violations surface in the console. */
const TRUSTED_TYPES_REPORT_ONLY = "require-trusted-types-for 'script'; trusted-types vue";

const CLIENT_ENTRY = '/assets/entry-client.js';
const IS_DEV_SHELL = __DEV_SHELL__;
const CLIENT_SCRIPTS = IS_DEV_SHELL
  ? '<script type="module" src="http://127.0.0.1:5173/@vite/client"></script><script type="module" src="http://127.0.0.1:5173/src/main.ts"></script>'
  : `<script type="module" src="${CLIENT_ENTRY}"></script>`;
const MODULE_PRELOAD = IS_DEV_SHELL ? '' : `<link rel="modulepreload" href="${CLIENT_ENTRY}">`;

/**
 * RFC 9116 puts security.txt under `/.well-known/`, and that file is served by
 * the asset layer before this Worker runs. The root path is a legacy location
 * scanners still probe, so point it at the canonical file — otherwise it falls
 * through to the catch-all and answers a security researcher with a rendered
 * page and a `200`.
 */
const SECURITY_TXT = '/.well-known/security.txt';

/** Everything here is a read. Write endpoints get their own allow-lists. */
const READ_ONLY_ALLOW = 'GET, HEAD';

/**
 * The apex is canonical; `www` redirects to it.
 *
 * Only this exact hostname is rewritten. Anything else — `localhost` in dev, a
 * preview URL — is left alone, so canonicalisation never fights the
 * environment it happens to be running in.
 */
const CANONICAL_HOST = 'dlbr.app';
const WWW_HOST = `www.${CANONICAL_HOST}`;

/**
 * Collapses repeated slashes and strips a trailing one, so each screen has a
 * single canonical URL.
 *
 * Without this, `/setup/` misses both exact routes, falls into the `*`
 * catch-all and lands the visitor on the register instead. Collapsing repeats
 * also guarantees the result starts with exactly one `/`, so echoing it back in
 * a `Location` header cannot become a protocol-relative open redirect.
 */
function normalizePath(pathname: string) {
  if (!pathname || (!pathname.includes('//') && !pathname.endsWith('/'))) return pathname || '/';
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  if (collapsed.length <= 1) return collapsed || '/';
  return collapsed.replace(/\/+$/, '') || '/';
}

function methodNotAllowed(allow: string, security: HeadersInit) {
  return new Response(null, { status: 405, headers: { allow, ...security } });
}

function json(body: unknown, headOnly: boolean, security: Record<string, string>) {
  const payload = JSON.stringify(body);
  return new Response(headOnly ? null : payload, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Deliberately uncached: this is the gate deciding whether the register
      // opens. A stale answer here strands an operator who has just configured
      // the fiscal helper.
      'cache-control': 'no-store',
      // Nothing is ever loaded from a JSON response, so nothing needs allowing.
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      // A HEAD response carries no body, so the length has to be stated rather
      // than inferred. For GET the runtime derives it from the body itself.
      ...(headOnly ? { 'content-length': String(ENCODER.encode(payload).byteLength) } : {}),
      ...security,
    },
  });
}

/**
 * Streams the shell around the app render:
 *
 *   1. `<head>` and the opening `<div id="app">` flush before the app has run,
 *      so the browser can start fetching the client entry immediately.
 *   2. The app's chunks are forwarded as `renderToWebStream` produces them.
 *   3. The closing tags flush last.
 *
 * Nothing is buffered, so the head reaches the wire ahead of the body.
 *
 * `HEAD` asks for no body at all. That has to be requested up front rather than
 * by dropping the stream: Vue starts rendering inside the stream's `start`
 * callback, so an unread stream has already done the work.
 */
async function renderDocument(path: string, headOnly: boolean, security: Record<string, string>, blogPageData: BlogPageData | null = null) {
  const { status, redirect, head, htmlAttrs, stream: appStream } = await renderApp(path, {
    includeBody: !headOnly,
    blogPageData,
  });

  if (redirect) {
    return new Response(null, { status: 302, headers: { location: redirect, ...security } });
  }

  const documentHeaders: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
    // Dev must never be cached; the shell points at a Vite server that moves.
    'cache-control': IS_DEV_SHELL || blogPageData?.preview || status !== 200 ? 'no-store' : DOCUMENT_CACHE,
    ...security,
    // Dev loads modules cross-origin from Vite and relies on its inline HMR
    // client, neither of which this policy allows. Production only.
    ...(IS_DEV_SHELL ? {} : {
      'content-security-policy': documentCsp(path === '/blog' || path.startsWith('/blog/')),
      'content-security-policy-report-only': TRUSTED_TYPES_REPORT_ONLY,
    }),
  };

  if (headOnly) {
    return new Response(null, { status, headers: documentHeaders });
  }

  // The script tag sits at the end of the body, so on a streamed response the
  // browser would not discover it until the app had finished rendering.
  // Preloading from the head starts that fetch in the first flush.
  const stylesheet = IS_DEV_SHELL ? '' : '<link rel="stylesheet" href="/assets/main.css">';
  const opening = `<!doctype html><html${htmlAttrs ? ` ${htmlAttrs}` : ''}><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" href="data:,">${head}${MODULE_PRELOAD}${stylesheet}</head><body><div id="app">`;
  const closing = `</div>${CLIENT_SCRIPTS}</body></html>`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(ENCODER.encode(opening));

      if (appStream) {
        const reader = appStream.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (error) {
          // The head is already on the wire, so the status line cannot change.
          // Close out a well-formed document and let the client take over.
          console.error('SSR stream failed', error);
          controller.enqueue(ENCODER.encode('<!--ssr-error-->'));
        } finally {
          reader.releaseLock();
        }
      }

      controller.enqueue(ENCODER.encode(closing));
      controller.close();
    },
  });

  return new Response(stream, { status, headers: documentHeaders });
}

// Host and path are canonicalised together, so `www.dlbr.app/setup/` costs
// one redirect rather than chaining two. The query string rides along on the
// URL object; rebuilding from the path alone would drop it.
type RouteHandler = (
  context: C,
  path: string,
  security: ReturnType<typeof securityHeaders>
) => Response | Promise<Response>;

function canonicalize(handler: RouteHandler): Handler {
  return (context) => {
    const url = new URL(context.req.url);
    const path = normalizePath(url.pathname);
    const wrongHost = url.hostname === WWW_HOST;
    const security = securityHeaders(url);

    if (wrongHost || path !== url.pathname) {
      const target = new URL(url);
      if (wrongHost) target.hostname = CANONICAL_HOST;
      target.pathname = path;
      return new Response(null, {
        status: 308,
        headers: { location: target.toString(), 'cache-control': REDIRECT_CACHE, ...security },
      });
    }

    return handler(context, path, security);
  };
}

function renderRoute(headOnly: boolean): RouteHandler {
  return async (context, path, security) => {
    let blogPageData: BlogPageData | null = null;
    if (path === '/blog' || path.startsWith('/blog/')) {
      const previewToken = new URL(context.req.url).searchParams.get('_preview') ?? undefined;
      blogPageData = await loadBlogPageForRender(context, path, previewToken);
    }
    return renderDocument(path, headOnly, security, blogPageData);
  };
}

function configRoute(headOnly: boolean): RouteHandler {
  return (_context, _path, security) => json({ lPfrUrl: '' }, headOnly, security);
}

function apiTarget(context: C): Fetcher | null {
  const environment = new URL(context.req.url).searchParams.get('environment');
  return environment === 'production' ? null : context.env?.ID_STAGING ?? null;
}

function proxyApi(context: C): Promise<Response> {
  const target = apiTarget(context);
  if (!target) return Promise.resolve(new Response('Admin API binding unavailable', { status: 503 }));
  return target.fetch(new Request(context.req.url, context.req));
}

function proxyOgImage(context: C): Promise<Response> {
  const target = (context.env as { OG_IMAGES?: Fetcher } | undefined)?.OG_IMAGES;
  if (!target) return Promise.resolve(new Response('OG image service unavailable', { status: 503 }));
  return target.fetch(new Request(context.req.url, context.req));
}

async function logout(context: C): Promise<Response> {
  const target = apiTarget(context);
  if (target) {
    try {
      await target.fetch(new Request(context.req.url, context.req));
    } catch {
      // Clear the browser cookie even if the upstream cleanup is unavailable.
    }
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: '/',
      'set-cookie': 'admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
      'cache-control': 'no-store',
    },
  });
}

const router = Pico();

router.get('/api/blog', canonicalize((context, path, security) => blogApiRoute(context, path, false, security)));
router.head('/api/blog', canonicalize((context, path, security) => blogApiRoute(context, path, true, security)));
router.get('/api/blog/:slug', canonicalize((context, path, security) => blogApiRoute(context, path, false, security)));
router.head('/api/blog/:slug', canonicalize((context, path, security) => blogApiRoute(context, path, true, security)));
router.get('/blog/rss.xml', canonicalize((context, _path, security) => blogFeedRoute(context, false, security)));
router.head('/blog/rss.xml', canonicalize((context, _path, security) => blogFeedRoute(context, true, security)));
router.get('/blog/sitemap.xml', canonicalize((context, _path, security) => blogSitemapRoute(context, false, security)));
router.head('/blog/sitemap.xml', canonicalize((context, _path, security) => blogSitemapRoute(context, true, security)));
router.get('/blog/media/*', canonicalize((context, path, security) => blogMediaRoute(context, path, false, security)));
router.head('/blog/media/*', canonicalize((context, path, security) => blogMediaRoute(context, path, true, security)));
router.get('/api/config', canonicalize(configRoute(false)));
router.head('/api/config', canonicalize(configRoute(true)));
router.get('/og-image', canonicalize((context) => proxyOgImage(context)));
router.head('/og-image', canonicalize((context) => proxyOgImage(context)));
router.get('/auth/github', proxyApi);
router.get('/auth/github/callback', proxyApi);
router.get('/admin/logout', logout);
router.get('/admin/api/metrics', proxyApi);
router.get('*', canonicalize(renderRoute(false)));
router.head('*', canonicalize(renderRoute(true)));
router.all('*', canonicalize((_context, _path, security) => methodNotAllowed(READ_ONLY_ALLOW, security)));

export default router;
