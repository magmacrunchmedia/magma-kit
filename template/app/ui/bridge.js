// bridge.js — the app's command catalog over the kit's Tauri substrate.
//
// kit/bridge-core.js decided whether a backend exists; when it did not,
// MagmaKit.tauri is undefined, __APP_NS__.fs stays undefined too, and that
// absence is the whole feature switch — the pages degrade instead of throwing.
//
// This file is the ONLY place a Rust command is named. Everything here is
// plumbing; anything the app knows about its own documents lives in core/.

(function () {
    'use strict';

    window.__APP_NS__ = window.__APP_NS__ || {};

    const T = window.MagmaKit && window.MagmaKit.tauri;
    if (!T) return;

    T.suppressContextMenu();

    window.__APP_NS__.fs = {
        // ── files ────────────────────────────────────────────
        readText: (path) => T.invoke('read_text', { path }),
        writeText: (path, contents) => T.invoke('write_text', { path, contents }),
        readBytes: (path) => T.invoke('read_bytes', { path }).then(a => new Uint8Array(a)),
        writeBytes: (path, bytes) => T.invoke('write_bytes', { path, contents: [...bytes] }),
        exists: (path) => T.invoke('exists', { path }),
        readDir: (path) => T.invoke('read_dir', { path }),
        writeInRoot: (root, rel, bytes) =>
            T.invoke('write_in_root', { root, rel, contents: [...bytes] }),
        writeTextInRoot: (root, rel, contents) =>
            T.invoke('write_text_in_root', { root, rel, contents }),

        // ── pickers ──────────────────────────────────────────
        confirm: (message, title) =>
            T.dialog('ask', { message, title: title || '__APP_NAME__' }),
        notify: (message, title) =>
            T.dialog('message', { message, title: title || '__APP_NAME__' }),

        // ── config / lifecycle ───────────────────────────────
        configDir: () => T.invoke('config_dir'),
        appVersion: () => T.invoke('app_version'),
        quit: () => T.invoke('quit'),
        setDirty: (dirty) => T.invoke('set_dirty', { dirty }),

        // ── the log file ─────────────────────────────────────
        // Fire-and-forget: a failure to log must never become a failure to run.
        logLine: (kind, message, detail) =>
            T.invoke('log_line', { kind, message, detail: detail === undefined ? null : String(detail) })
                .catch(() => {}),
        logPath: () => T.invoke('log_path'),
    };
}());
