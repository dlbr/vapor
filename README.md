# Vapor Worker

Minimal Cloudflare-native application stack:

- Streaming SSR from a plain Cloudflare Worker, hydrated by Vue Vapor in the browser
- One source of truth for markup: the `.vue` files, compiled twice
- SSR-safe router factory with no top-level browser globals
- Build-time assertion that the VDOM renderer never enters the client bundle

There is no server framework. `server/worker.ts` is an `export default { fetch }`
of about a hundred lines. Nitro was removed after measurement: its runtime was
43 KiB gzipped — 57% of the uploaded script, and more than the Vue SSR renderer
it was hosting — to serve two routes. See `BUILD-REVIEW.md` for the numbers.

## Commands

```sh
pnpm install
pnpm run types
pnpm run dev
pnpm run build
pnpm run preview
```

`pnpm run dev` runs three processes: a watching Worker build, `wrangler dev` on
`http://127.0.0.1:3000`, and Vite on `http://127.0.0.1:5173` for client assets
and HMR. They start in that order — wrangler waits for the Worker artifact to
exist, Vite waits for port `3000` — so a backend failure surfaces directly
instead of hiding behind proxy spam.

`wrangler dev` runs the real workerd runtime, so bindings behave as they do in
production. It also watches `main` itself: rebuild the Worker and it reloads,
with no watch configuration to keep in sync.

Cloudflare Worker bindings are typed by Wrangler. After editing `wrangler.jsonc`, run `pnpm run types`; it regenerates `worker-configuration.d.ts` from the real Worker configuration.

The browser app and Worker runtime use separate TypeScript programs. `tsconfig.json` keeps DOM/Vite globals for the client, while `tsconfig.worker.json` consumes the Wrangler-generated Worker globals without colliding with browser DOM declarations.

Vue Vapor runtime is pinned through `@vue/runtime-vapor` and matching `vue@3.6.0-rc.2`. Keep those versions aligned when upgrading Vapor.

## How SSR works

The SFCs are compiled **twice**, from the same source:

| Build | Compiler | Output | Consumed by |
| --- | --- | --- | --- |
| `build:client` (`vite.config.ts`) | `@vue/compiler-vapor` | `dist/client/` | the browser |
| `build:worker` (`vite.worker.config.ts`) | `@vue/compiler-ssr` | `dist/worker/index.mjs` | Cloudflare |

`@vitejs/plugin-vue` ignores the `vapor` attribute when building for SSR and
emits ordinary string-push render functions. Vapor's client runtime then
*hydrates that output directly*: its hydration walker looks for the `[` / `]`
comment anchors that `@vue/server-renderer` emits, adopting the server's DOM
nodes rather than re-creating them.

This is the reason there is no hand-written HTML anywhere. Templates live only
in the `.vue` files.

Both bundles inline their whole dependency graph (`ssr.noExternal` on the Worker
side) because Workers have no runtime module resolution.

### Directories

| Path | Role |
| --- | --- |
| `public/` | Hand-authored static files (robots.txt, llms.txt). **Input only** — nothing writes here. |
| `dist/worker/index.mjs` | The uploaded script. |
| `dist/client/` | The asset layer: client build plus everything copied from `public/`. |

Everything except `public/` is generated and gitignored. The two builds are
independent — each owns its own directory, so they can run in either order.

Static files are served by the Assets binding **before** the Worker runs: the
asset router matches `dist/client` first and only falls through to `main` on a
miss. `/robots.txt`, `/llms.txt` and `/assets/*` never reach `server/worker.ts`.

### Streaming

`server/worker.ts` composes three parts into one `ReadableStream`:

1. `<head>` and the opening `<div id="app">`, flushed immediately — the browser
   starts fetching CSS and the client entry before the app has rendered.
2. The app's chunks, forwarded as `renderToWebStream` produces them.
3. The closing tags.

Nothing is buffered, so the head reaches the wire ahead of the body and a
mid-stream render failure cannot change the status line — the handler closes out
a well-formed document and lets the client take over.

One caveat worth knowing: `renderToWebStream` is *not* pull-driven. It starts
rendering inside the stream's `start` callback, which runs on construction, so
holding an unread stream does not defer the work. Skipping a render has to be
requested up front — that is what `renderApp(path, { includeBody: false })` is
for, and what makes `HEAD` free rather than merely bodiless.

Route status is decided before anything renders, so redirects and misses never
pay for a body they will not send.

Two things ride on that first flush:

- **`<link rel="modulepreload">` for the client entry.** The `<script>` itself
  sits before `</body>`, so on a streamed response the browser would not
  discover it until the app had finished rendering. Preloading from the head
  starts the fetch in parallel with the render instead.
- **Critical CSS, inlined.** A linked stylesheet is render-blocking and costs a
  round trip before first paint. See below for what "critical" means here.

### Routing

A server-side router (one constructed with `history: null`) reports redirects
instead of following them, so an unmatched path returns a real `302` rather than
a soft `200`.

**Canonical URLs.** `https://dlbr.app` is the canonical origin. Host and path are
normalised together in a single `308`, so `www.dlbr.app/setup/?ref=till` reaches
`https://dlbr.app/setup?ref=till` in one hop rather than chaining redirects. The
query string rides along because the redirect is built from the parsed URL
rather than reassembled from the path.

Path normalisation collapses repeated slashes and strips a trailing one.
Without it `/setup/` matches neither exact route, falls into the `*` catch-all
and lands the visitor on the register. Collapsing repeats also guarantees a
single leading slash, so echoing the path into `Location` cannot become a
protocol-relative open redirect.

Only `www.dlbr.app` is rewritten — `localhost` and preview URLs are left alone,
so canonicalisation never fights the environment it is running in.
`workers_dev` is off in `wrangler.jsonc`, because a live
`vapor.<account>.workers.dev` would be a second origin serving identical content
and outside that redirect.

Methods are allow-listed per route rather than globally, so write endpoints can
declare their own verbs beside their handler. Everything today is a read:
anything outside `GET`/`HEAD` gets a `405` with an `Allow` header.

### Styles

```
src/styles/global.css          shared — inlined into every response
src/styles/routes/register.css  `/`      — inlined only when `/` is rendered
src/styles/routes/setup.css     `/setup` — inlined only when `/setup` is rendered
```

Each view imports its own stylesheet, so the built `main.css` carries every
screen. The server inlines only the global layer plus the screen it actually
rendered — a visitor landing on `/setup` never receives the register's CSS in
their document.

The document contains **no `<link rel="stylesheet">` at all**. The full sheet —
covering screens reachable by client-side navigation — is appended by `main.ts`
after hydration.

That placement was arrived at the hard way. It first sat at the end of `<body>`,
on the assumption that a stylesheet after all the content cannot block the paint
of content before it. Lighthouse disagreed: a `<link rel="stylesheet">` is
render-blocking wherever it sits, and it showed up in the critical request chain
at 167 ms for a file the page does not use. Injecting it from script after mount
removes it from that chain entirely, with no inline event handler and so no CSP
exception.

Nothing degrades without JavaScript. A server-rendered page is fully styled by
the inlined critical CSS, and client-side navigation — the only thing the full
sheet exists for — needs that script to work regardless.

`entry-server.ts` maps route path to stylesheet. That map is deliberately not
derived from `routes.ts`: only the server needs these strings, and importing
them from shared route config would embed every screen's CSS into the client JS
bundle as well. A route with no entry renders with the global layer alone.

The endgame is route-level code splitting, where each view chunk carries its own
CSS and Vite loads it on demand — that removes the duplication between the
inlined critical CSS and the full sheet. It needs hashed asset filenames first.

### Head

`head.ts` holds the config; there are two serializers over it. `renderHead` in
`entry-server.ts` produces markup for the document, and `useHead` applies the
same config to the DOM on client-side navigation.

Meta and link tags carry `data-head`. That marker is the contract between the
two: on its first run `useHead` adopts the server's tags rather than appending
duplicates, and — because it knows which elements are its own — it can remove
the ones a later route stops declaring.

That removal is the part worth keeping. Without it the head accumulates the
union of every route visited: a `rel=canonical` or `og:title` declared by one
screen silently follows the visitor to the next, so a shared link previews as
the wrong page. Tags outside the config — charset, viewport, the stylesheet —
are unmarked and never touched.

A `title` of `undefined` means "this route does not manage the title"; an empty
string clears it.

### Caching

| Response | `cache-control` |
| --- | --- |
| Document (200) | `public, max-age=0, s-maxage=60, stale-while-revalidate=600` |
| Canonical redirect (308) | `public, max-age=31536000` |
| `/api/config` | `no-store` |
| Anything in dev | `no-store` |

Both screens render from the path alone — no cookies, no per-visitor data — so
one cached document is correct for everyone. Cloudflare's Workers Caching is
header-driven, so an edge hit answers without invoking the Worker at all; no
Cache API plumbing is needed.

Be clear about what this does and does not buy. The Worker already runs at the
edge, so caching removes *execution* time, not network time — a few
milliseconds of TTFB and a lot of invocations, not the bulk of a Lighthouse
document timing, which is dominated by simulated round trips.

`/api/config` is uncached on purpose: it is the gate deciding whether the
register opens, and a stale answer strands an operator who has just configured
the fiscal helper.

**The stale window is a deploy window.** For up to `s-maxage +
stale-while-revalidate` after a deploy, a visitor can receive markup from the
previous build alongside the new client bundle. Vapor treats that as a hydration
mismatch and re-renders on the client, so it degrades to a flash rather than a
break — but purging the cache as part of deploy avoids it entirely, and is worth
adding before the stale window is lengthened.

### Security contact

`public/.well-known/security.txt` follows [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116).
The asset layer serves it directly; `/security.txt` — the legacy location
scanners still probe — gets a `301` to the canonical path from the Worker, so a
researcher never receives a rendered page in place of a contact address.

**`Expires` is required and needs renewing.** It is currently `2027-08-01`. Past
that date the file is read as stale, which is worse than not publishing one at
all: it advertises a reporting channel and then signals that nobody is
maintaining it. Treat the date as a recurring task, not a set-and-forget value.

`Contact` points at a personal address. `security@dlbr.app` would be the
sturdier choice if you set up mail routing for the zone — it survives a change
of maintainer, which a personal mailbox does not.

### Security headers

Set in `server/worker.ts`, per response:

| Header | Notes |
| --- | --- |
| `strict-transport-security` | `max-age=63072000; includeSubDomains; preload` — HTTPS only. |
| `content-security-policy` | Nonced inline style, `script-src 'self'`, no `unsafe-inline`. |
| `content-security-policy-report-only` | Trusted Types, staged. See below. |
| `x-content-type-options`, `referrer-policy`, `x-frame-options` | |

HSTS is gated on `url.protocol === 'https:'`. It is ignored over plain HTTP by
spec, but a browser that ever did honour it from the dev server would refuse
`http://127.0.0.1` for two years. `includeSubDomains` takes effect immediately
and is the part with teeth — any subdomain of `dlbr.app` served over HTTP breaks
for anyone who has seen the header. `preload` does nothing until the domain is
submitted at hstspreload.org, and removal from that list takes months, so treat
submission as one-way.

The inlined critical CSS is allowed by **content hash**, not a nonce. That is a
consequence of caching: a cached document replays a single nonce to every
visitor for the life of the cache entry, which is precisely what a nonce exists
to prevent. A hash is stable under caching and pins the exact stylesheet. There
are no inline scripts at all, so `script-src` needs nothing beyond `'self'`.

**Trusted Types is report-only on purpose.** `@vue/runtime-vapor@3.6.0-rc.2`
assigns compiled templates straight to `innerHTML` in `template()` without
routing them through the `vue` policy the way the virtual DOM path does for
`v-html`. Enforcing `require-trusted-types-for 'script'` survives a page load —
hydration adopts server-rendered nodes and never calls `template()` — and then
throws on the first client-side navigation, leaving a blank screen. That failure
shape passes any smoke test that only loads a page, which is exactly why it is
worth writing down. Flip the directive into the enforcing policy once Vapor's
`template()` uses the policy.

Adding a pass-through default Trusted Types policy would silence the audit, but
it would allow every assignment it claims to guard. Not worth the green tick.

**If you see a CSP violation for `static.cloudflareinsights.com`, do not widen
`script-src`.** Cloudflare Web Analytics injects that beacon by rewriting the
HTML at the edge, so it is not in this repo and the policy has no way to
anticipate it. The decision here was to disable Web Analytics for the zone
rather than admit a third-party origin into `script-src` on a till terminal —
the one thing the directive exists to prevent.

Cloudflare also skips beacon injection when the response carries
`Cache-Control: no-transform`, which would keep the fix in version control
rather than the dashboard. It is not used here: `no-transform` asks
intermediaries not to alter the payload *including its content-coding*, and
losing Brotli on a 67 kB bundle costs far more than the console error it
removes. Verify compression survives before reaching for it.

### Keeping VDOM out of the client

`assertVaporOnly()` in `vite-plugins.ts` fails the client build if virtual DOM
renderer symbols survive tree-shaking. It runs as `renderChunk` with
`order: 'pre'` — after tree-shaking, before minification — which is the only
point where both the symbol names and the shake results are true. A
post-build grep cannot work here: the minifier renames every one of those
identifiers, so it passes unconditionally.

`vaporOnly()` separately rejects any SFC that is not `<script setup vapor>`.

### Server state

Worker isolates are reused across requests, so module-level state is shared
between users. `provideStateRegistry(app)` gives each SSR request its own
`useState` registry; the module-level map in `use-state.ts` is a browser-only
convenience for calling `useState` outside a component.
