# __APP_NAME__

Stamped from magma-kit's template. Finish the checklist below, then delete it.

## Setup checklist

1. **Vendored chrome** — byte-copy `app-shell.css`, `toast.css`, `toast.js`
   from `website/ware/shell/` into `app/shell/`, and fork `fonts.css` there
   with paths rewritten for this depth (`../fonts/…`). See that directory's
   README for the contract.
2. **Fonts** — copy `app/fonts/` from a sibling app (self-hosted woff2/ttf;
   the CSP is `font-src 'self'`).
3. **Icons** — put `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`,
   `icon.ico` in `desktop/src-tauri/icons/`.
4. **Install** — `npm install` here and in `desktop/`.
5. **Verify** — `npm run check`, then `cd desktop && npm run dev`.
6. **git init** and a first commit (magmacrunchmedia@gmail.com, no AI
   attribution).
7. Replace `app/core/sample.js` with the first real module, and delete this
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
