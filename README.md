# MAGMA//KIT

The shared engine under the family's desktop apps (sprite-forge,
magma-ops-app, and whatever comes next). Extracted, not invented: every module
here existed in two or three hand-cloned copies before it was one.

Three parts:

- **`js/`** — classic scripts attaching to `window.MagmaKit.*`, vendored into
  a consumer's `app/kit/` by byte-copy. Crash-reporting boot, the Tauri bridge
  substrate, keyboard resolver, undo/redo history, localStorage prefs,
  `<dialog>` modal idioms, DOM primitives.
- **`crate/`** — a Rust library consumed as a sibling path dependency
  (`magma-kit = { path = "../../../magma-kit/crate" }`). Filesystem bridge
  with path containment, the two-sided log file, tray-popover anchoring
  geometry, dirty tracking (+ close guard behind feature `dialog`), autostart
  (feature `autostart`).
- **`template/`** — a stampable minimal app carrying the house conventions:
  CSP, minimal capabilities, `[lib]` split, release profile, test wiring.

## Using it in a consumer

```
npm run sync-kit     # node ../magma-kit/scripts/sync.mjs .   — (re)vendor
npm run check:kit    # node ../magma-kit/scripts/sync.mjs --check .
```

`scripts/sync.mjs` is the only writer of `app/kit/` and `tests/kit/`. Files
are byte-copies; `app/kit/KIT.md` records the kit version and per-file hashes.
Edit kit files **here**, never in a consumer, then re-sync every consumer.

## New app

```
node scripts/new-app.mjs ../my-app --name "MY//APP" --ns MyApp
```

Then follow the checklist it prints (shell chrome, fonts, icons, git init).

## Developing the kit

```
npm run check                          # lint + node tests/run.mjs
cd crate && cargo test                 # base modules
cd crate && cargo test --features dialog,autostart
```

After any kit change: run the above, then re-sync and `npm run check` in every
consumer. The kit's tests protect the kit; the consumers' tests protect the
migrations.

## What deliberately is NOT here

- **`ware/shell`** (app-shell.css, toast, fonts) — chrome stays upstream in
  the website repo per its README's vendoring contract; apps vendor it from
  there exactly as before.
- Docking, command palettes, autosave, plugin systems — none of the apps have
  them, so the kit does not speculate about them.
- App vocabulary: bindings tables, history caps, command catalogs, status
  pills. Those are data the app passes in — kit files stay byte-identical
  across consumers.
