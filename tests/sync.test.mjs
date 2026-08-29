import { test, eq, ok } from '../testkit/assert.mjs';
import { sync, check } from '../scripts/sync.mjs';
import { readFileSync, writeFileSync, rmSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(KIT, 'kit.manifest.json'), 'utf8')).files;

export default function () {
    const dir = mkdtempSync(join(tmpdir(), 'magma-kit-sync-'));
    try {
        test('sync copies every manifest file byte-identically', () => {
            const n = sync(dir);
            eq(n, Object.keys(manifest).length);
            for (const [src, dest] of Object.entries(manifest)) {
                ok(existsSync(join(dir, dest)), `${dest} exists`);
                eq(readFileSync(join(dir, dest), 'utf8'), readFileSync(join(KIT, src), 'utf8'),
                    `${dest} is a byte-copy of ${src}`);
            }
        });

        test('sync writes the generated KIT.md marker', () => {
            const md = readFileSync(join(dir, 'app', 'kit', 'KIT.md'), 'utf8');
            ok(md.includes('GENERATED'), 'says so');
            const version = JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8')).version;
            ok(md.includes(`Kit version: ${version}`), 'names the kit version');
            ok(md.includes('sha256:'), 'carries hashes');
        });

        test('a fresh sync passes check', () => {
            eq(check(dir), []);
        });

        test('an edited vendored file is reported as drift', () => {
            const victim = join(dir, manifest['js/keys.js']);
            const original = readFileSync(victim, 'utf8');
            writeFileSync(victim, original + '\n// local edit\n');
            const drifted = check(dir);
            eq(drifted.length, 1);
            ok(drifted[0].includes('keys.js'), 'names the file');
            writeFileSync(victim, original);
        });

        test('a deleted vendored file is reported as missing', () => {
            const victim = join(dir, manifest['js/dom.js']);
            rmSync(victim);
            const drifted = check(dir);
            eq(drifted.length, 1);
            ok(drifted[0].includes('missing'), 'says why');
            sync(dir);   // repair for any later assertions
        });

        test('check is line-ending-insensitive', () => {
            const victim = join(dir, manifest['js/prefs.js']);
            const original = readFileSync(victim, 'utf8');
            writeFileSync(victim, original.replaceAll('\n', '\r\n'));
            eq(check(dir), [], 'CRLF alone is not drift');
            writeFileSync(victim, original);
        });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
