# MAGMA//KIT — conventions and invariants

Read README.md first for what this repo is. This file is the rules, and where
each was learned.

## The one law: kit files are byte-identical everywhere

`scripts/sync.mjs` byte-copies `js/` and `testkit/` into consumers and is the
ONLY thing that writes `app/kit/` or `tests/kit/` there. Nothing is templated
or rewritten on the way through, so `sync.mjs --check` (a hash compare) is a
complete drift detector. Anything app-specific — bindings tables, history
caps, snapshot callbacks, command names — is a PARAMETER the app passes in,
never an edit to a kit file. If a kit file needs app-specific content, the
design is wrong; move the content to the app and pass it in.

## js/ is classic scripts, not ES modules — do not convert

Same rule as sprite-forge and magma-ops-app, and it comes from the website:
magmacrunch.com is buildless and cache-busts by stamping `?v=<hash>` onto
`<script src>` tags. An `import` specifier inside a .js file is invisible to
that stamper, so ESM would sit behind stale caches with no way to force a
refresh. Kit js/ files stay stamper-compatible so the website can consume them
later if it ever wants to. They attach to `window.MagmaKit.*` via IIFEs.

Load order in a consumer page: `kit/boot.js` FIRST (it exists to report
failures in everything after it), then the remaining `kit/*.js`, then the
app's `core/`, then `ui/`. The app's test runner should assert this against
its index.html via the harness's `scriptOrder()`.

## bridge-core.js rides Tauri internals — the CLI pin lives with it

`MagmaKit.tauri.on()` calls `transformCallback` and `plugin:event|listen`
directly rather than depending on @tauri-apps/api (the house rule from
sprite-forge). Because that is an internal, EVERY consumer pins
`@tauri-apps/cli` to an exact version in desktop/package.json — and all
consumers pin the SAME version, since one kit file now rides the shape.
Absence of `MagmaKit.tauri` is the desktop/web feature switch; nothing
downstream ever asks "are we in Tauri".

## crate/ exposes plain functions, not commands

Apps keep three-line `#[tauri::command]` wrappers so each app's
`generate_handler!` stays an explicit allowlist in its own crate. The base
crate has no tauri dependency (fast `cargo test`); tauri-needing pieces sit
behind features `dialog` and `autostart`.

## Versioning

`package.json` is the kit's version (crate/Cargo.toml tracks it). Bump on any
change to `js/`, `testkit/`, or the manifest; the version lands in consumers'
`app/kit/KIT.md` at sync, which is how you tell who is behind.

## Testing

- `npm run check` — lint + `node tests/run.mjs` (the kit tests itself with its
  own vendored harness; that circularity is the point).
- `cargo test` and `cargo test --features dialog,autostart` in crate/.
- After changing the kit: re-sync every consumer and run THEIR `npm run check`
  before calling the change done. The consumers' suites are the migration
  regression net.

## Git

Commit as magmacrunch media <magmacrunchmedia@gmail.com>. No AI attribution
in commits, code comments, or docs.

## What the kit refuses

- Chrome (`ware/shell`) — the website repo owns it; see its README for the
  vendoring contract and the packaging decision.
- Speculative framework features (docking, command palette, autosave, plugin
  systems). The kit is extraction: a module gets in when a second app has
  hand-rolled it, not when one app might want it.
- App vocabulary (status pills, stat rows, describe() tables). One consumer is
  not shared; it moves here when a second consumer wants it.
