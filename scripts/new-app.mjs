#!/usr/bin/env node
// new-app.mjs — stamp out a new app from template/.
//
//   node scripts/new-app.mjs ../my-app --name "MY//APP" --ns MyApp
//
// Deliberately thin: it copies, replaces four placeholders, syncs the kit, and
// prints the checklist. The checklist in the new README is the contract; this
// script is convenience. Everything it cannot do (vendoring chrome, fonts,
// icons, git init) is on that list rather than half-automated here.
//
// Placeholders:
//   __APP_NAME__       display name, e.g. "CARD//FORGE"
//   __APP_NS__         JS namespace, e.g. CardForge
//   __app_slug__       kebab id, e.g. card-forge (crate name, bundle id, log)
//   __app_snake__      snake id, e.g. card_forge (Rust lib name)
//   __APP_ENV_PREFIX__ shouty snake, e.g. CARD_FORGE (env overrides)

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, basename } from 'node:path';
import { sync } from './sync.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(KIT, 'template');

// Files copied byte-for-byte: a placeholder inside one would be data, not a
// name to stamp. (None today — listed so the rule has a home.)
const BINARY = /\.(png|ico|icns|woff2?|ttf)$/i;

function replacements(name, ns) {
    const slug = ns.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    return {
        __APP_NAME__: name,
        __APP_NS__: ns,
        __app_slug__: slug,
        __app_snake__: slug.replaceAll('-', '_'),
        __APP_ENV_PREFIX__: slug.replaceAll('-', '_').toUpperCase(),
    };
}

function stamp(text, subs) {
    let out = text;
    for (const [from, to] of Object.entries(subs)) out = out.replaceAll(from, to);
    return out;
}

function copyTree(from, to, subs) {
    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from)) {
        const src = join(from, entry);
        const dest = join(to, stamp(entry, subs));
        if (statSync(src).isDirectory()) { copyTree(src, dest, subs); continue; }
        if (BINARY.test(entry)) { writeFileSync(dest, readFileSync(src)); continue; }
        writeFileSync(dest, stamp(readFileSync(src, 'utf8'), subs));
    }
}

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i]] = argv[++i];
    else positional.push(argv[i]);
}
const target = positional[0];
const flag = (f) => flags[f] || null;

if (!target) {
    console.error('usage: new-app.mjs <dir> --name "MY//APP" --ns MyApp');
    process.exit(2);
}

const root = resolve(target);
const ns = flag('--ns') || basename(root).replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
const name = flag('--name') || basename(root).toUpperCase();

if (existsSync(root) && readdirSync(root).length) {
    console.error(`${root} exists and is not empty — refusing to stamp over it`);
    process.exit(1);
}

const subs = replacements(name, ns);
copyTree(TEMPLATE, root, subs);
const n = sync(root);

console.log(`stamped ${name} (${ns}) into ${root}`);
console.log(`synced ${n} kit files`);
console.log('\nNext — see the README there:');
console.log('  1. vendor app/shell/ from website/ware/shell (fork fonts.css for this depth)');
console.log('  2. copy app/fonts/ from a sibling app');
console.log('  3. add desktop/src-tauri/icons/');
console.log('  4. npm install (root and desktop/)');
console.log('  5. npm run check, then cd desktop && npm run dev');
console.log('  6. git init and a first commit');
