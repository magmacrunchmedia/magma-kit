#!/usr/bin/env node
// sync.mjs — push the kit's vendored files into a consumer repo.
//
//   node scripts/sync.mjs <consumer-root>          copy, and write KIT.md
//   node scripts/sync.mjs --check <consumer-root>  verify only; exit 1 on drift
//
// The one and only writer of app/kit/ and tests/kit/ in a consumer. Files are
// byte-copied — never rewritten, never templated — so a hash comparison is a
// complete drift check and any two consumers on the same kit version are
// byte-identical. App-specific data (bindings tables, history caps) belongs in
// the app's own files, passed into the kit as parameters; if a kit file needs
// editing, it gets edited HERE and re-synced everywhere.
//
// Precedent: ware/shell's byte-copy contract, sprite-forge's
// vendor-ops-themes.mjs.

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');

function manifest() {
    return JSON.parse(readFileSync(join(KIT, 'kit.manifest.json'), 'utf8')).files;
}

function kitVersion() {
    return JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8')).version;
}

function sha256(path) {
    // CRLF-insensitive: git and editors differ on line endings across the
    // repos, and a hash that flips on that would cry drift where there is none.
    const bytes = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
    return createHash('sha256').update(bytes).digest('hex');
}

function marker(files) {
    const rows = Object.entries(files)
        .map(([src, dest]) => `- \`${dest}\` sha256:${sha256(join(KIT, src))}`)
        .sort();
    return [
        '# Vendored from magma-kit — GENERATED, do not edit',
        '',
        `Kit version: ${kitVersion()}`,
        '',
        'These files are byte-copies from the magma-kit repo. To change one,',
        'edit it in magma-kit and run `npm run sync-kit` here. To verify nothing',
        'has drifted, run `npm run check:kit`.',
        '',
        ...rows,
        '',
    ].join('\n');
}

export function sync(consumerRoot) {
    const files = manifest();
    for (const [src, dest] of Object.entries(files)) {
        const to = join(consumerRoot, dest);
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(join(KIT, src), to);
    }
    writeFileSync(join(consumerRoot, 'app', 'kit', 'KIT.md'), marker(files));
    return Object.keys(files).length;
}

export function check(consumerRoot) {
    const files = manifest();
    const drifted = [];
    for (const [src, dest] of Object.entries(files)) {
        const to = join(consumerRoot, dest);
        if (!existsSync(to)) { drifted.push(`${dest} (missing — run sync)`); continue; }
        if (sha256(to) !== sha256(join(KIT, src))) drifted.push(`${dest} (differs from kit ${src})`);
    }
    return drifted;
}

// ── CLI ─────────────────────────────────────────────────

const argv = process.argv.slice(2);
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const checking = argv.includes('--check');
    const target = argv.find((a) => a !== '--check');
    if (!target) {
        console.error('usage: sync.mjs [--check] <consumer-root>');
        process.exit(2);
    }
    const root = resolve(target);
    if (checking) {
        const drifted = check(root);
        if (drifted.length) {
            console.error(`DRIFT in ${root}:\n` + drifted.map((d) => `  ${d}`).join('\n'));
            process.exit(1);
        }
        console.log(`${root}: in sync with kit ${kitVersion()}`);
    } else {
        const n = sync(root);
        console.log(`synced ${n} files into ${root} (kit ${kitVersion()})`);
    }
}
