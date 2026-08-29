# __APP_NAME__

Stamped from magma-kit's template. Finish the checklist below, then delete it.

## Setup checklist

If this app was stamped with `--from <donor>`, the chrome, fonts and icons are
already here and steps 1–3 are done. `new-app.mjs` prints anything still
outstanding.

1. **Vendored chrome** — byte-copy `app-shell.css`, `toast.css`, `toast.js`
   from `website/ware/shell/` into `app/shell/`, plus `fonts.css`. That last
   one carries the shell's only path assumption (`url('../fonts/…')`), which
   holds as long as `shell/` and `fonts/` stay siblings under `app/` — they do
   here. See that directory's README for the contract.
2. **Fonts** — copy `app/fonts/` from a sibling app (self-hosted woff2/ttf; the
   CSP is `font-src 'self'`).
3. **Icons** — `desktop/src-tauri/icons/`. **Not optional**: `tauri-build`
   fails without them, so the Rust build does not compile until this is done.
4. **Install** — `npm install` here and in `desktop/`.
5. **Verify** — `npm run check`, then `cd desktop && npm run dev`.
6. **Register** — add this app's path to `magma-kit/consumers.json`, so the
   kit's own tests keep it in sync when a kit file changes.
7. **git init** and a first commit (magmacrunchmedia@gmail.com, no AI
   attribution).
8. Replace `app/core/sample.js` with the first real module, and delete this
   checklist.

Optional: `desktop/src-tauri/src/config.rs.example` is the per-machine config
pattern (typed Config / redacted View / Patch / clamp / atomic save). Rename
and edit it when this app needs settings on disk.

## Commands

```
npm run check        lint + tests
npm run sync-kit     re-vendor app/kit/ and tests/kit/ from magma-kit
npm run check:kit    verify the vendored kit has not drifted
npm run serve        browser build on :3300
cd desktop && npm run dev
```

See AGENTS.md for the conventions this app is built on.
