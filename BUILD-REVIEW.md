# Build review

> **Superseded in part.** Nitro has since been removed. Measured floor: a
> hello-world Nitro Worker was **42.9 KiB gzip**, the full app **75.9 KiB**, so
> the framework was 57% of the upload — more than the Vue SSR renderer it
> hosted, to serve two routes. The replacement is a plain
> `export default { fetch }` in `server/worker.ts`:
>
> | | Nitro | plain Worker |
> | --- | --- | --- |
> | upload raw | 221.71 KiB | 88.9 KiB |
> | upload gzip | 82.35 KiB | 35.4 KiB |
>
> That also removed `.output/`, the `#ssr` alias, `publicAssets`,
> `devServer.watch` and the build-order guard — so the sections below about
> output directories and ordering no longer apply. `wrangler dev` replaced
> `nitro dev` and runs real workerd rather than an emulation.

Three Vite/Nitro stages, ~3.3s cold. Verified by running the real
`.output/server/index.mjs`, not a harness.

| Stage | Time | Output |
| --- | --- | --- |
| `build:client` | 0.48s | `dist/client/` — 67 kB, 25 kB gzip |
| `build:ssr` | 0.35s | `dist/server/entry-server.mjs` — 224 kB unminified |
| `build:worker` | 2.46s | `.output/` — 240 kB, **78 kB gzip** total |

78 kB gzip against a 3 MB Worker limit. Size is not a concern here.

---

## Fixed in this pass

### `public/` was a build target, not a source folder

`outDir: 'public'` plus `emptyOutDir: true` meant the client build owned that
directory and wiped it on every build. Dropping a `favicon.ico` or `robots.txt`
in there would have survived exactly until the next `pnpm build`. `publicDir`
was set to `false` to stop Vite copying `public/` into itself — the config was
working around a problem it created.

Now: `public/` is input only, `dist/client/` is the build output, and Vite
copies one into the other. Verified that `public/robots.txt` and
`public/favicon.ico` land in `dist/client/` and then `.output/public/`, with
`public/` untouched.

### Dev served stale SSR after every edit

`dev:ssr` rebuilds the SSR artifact on each `.vue` change, but Nitro only
watches `srcDir`. I confirmed the dev server kept serving the *previous* render
indefinitely — a `.vue` edit showed up only when some unrelated file under
`server/` happened to change.

Note this is a top-level `watch` vs `devServer.watch` distinction: the
top-level option silently does nothing for this. Fixed with
`devServer: { watch: [ssrEntry] }`, verified by editing a template and watching
the served HTML change without touching `server/`.

### The copy step is gone

`scripts/copy-public-assets.mjs` duplicated what Nitro's `publicAssets` already
does. Nitro now assembles `.output/public` from `dist/client` directly — one
fewer thing to keep in sync, one fewer script.

### Also

- `.gitignore` added — `dist/`, `.output/`, `.nitro/`, `.wrangler/`, and the
  generated `worker-configuration.d.ts` were all untracked-but-unignored.
- `tsconfig.json` still listed the now-deleted `scripts` directory.
- `server.proxy['/api']` removed: Vite serves modules only, the app is always
  on Nitro's port, so nothing ever hit it.

---

## Open — highest value first

### 1. Assets are unhashed, so they cannot be cached

```
dist/client/assets/entry-client.js
dist/client/assets/main.css
```

Fixed names, and the generated `.output/public/_headers` is **empty**. So
either Cloudflare serves them with a short TTL (every visit re-downloads 25 kB
gzip), or a long TTL is set and a deploy strands users on stale JavaScript.
There is no third option with fixed filenames.

The config is also inconsistent about it: `chunkFileNames` already uses
`[hash]`, only the entry and CSS don't.

The fix is a contained one:

1. `entryFileNames: 'assets/[name]-[hash].js'`, same for `assetFileNames`.
2. `build.manifest: true` in `vite.config.ts`.
3. Have the SSR entry import `dist/client/.vite/manifest.json` and emit the
   real filenames, instead of the two hardcoded paths currently in
   `server/routes/[...slug].ts`.

Build order already cooperates — the client build runs before the SSR build, so
the manifest exists when the SSR bundle needs it.

### 2. Still nothing type-checks

Unchanged from the code review. `types` is `wrangler types` (codegen);
`vue-tsc` is installed and never invoked. `tsconfig.worker.json` — including
the `#ssr` path mapping added for the SSR work — is fed to no compiler.

### 3. `"latest"` on every dependency

Against a `3.6.0-rc.2` Vue and an `h3` RC. The build now has three stages that
must agree on Vue's version; a silent minor bump to `@vitejs/plugin-vue` could
change SSR compiler output without anything failing loudly.

### 4. No sourcemaps anywhere

`sourceMap: false` in Nitro, `sourcemap: false` in Vite. A production stack
trace from the Worker will be unreadable. Wrangler can upload sourcemaps for
Worker exception reporting; worth turning on for the server bundle at least,
where the bytes don't reach users.

### 5. Smaller

- **Duplicate `compatibility_date`** in `nitro.config.ts` and `wrangler.jsonc`
  (`2026-06-25`). Nothing checks they agree.
- **`preview` / `deploy` pass a positional entry** (`wrangler dev
  .output/server/index.mjs`) while `wrangler.jsonc` already declares both `main`
  and `assets`. Harmless but redundant — and the two could drift.
- **Nitro warns `Node.js compatibility is not enabled`** on every build. Nothing
  in this bundle needs it, so either add `nodejs_compat` to the compat flags or
  accept the noise permanently.
- **`build:client` and `build:ssr` are independent** and could run in parallel.
  Saves ~0.35s — noted only for completeness; not worth the complexity.
- **No CI.** With three build stages that can disagree, a `pnpm build` on push
  would be worth having as soon as there's a repo to push to.
