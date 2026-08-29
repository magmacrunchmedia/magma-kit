// The verifier the consumers run against themselves. It has to fail on a
// tampered file, or it is decoration — so this builds a throwaway consumer,
// syncs into it, and then breaks it three ways.

import { test, eq, ok } from '../testkit/assert.mjs';
import { verify, parseManifest, kitVersionOf } from '../testkit/kit-integrity.mjs';
import { sync } from '../scripts/sync.mjs';
import { readFileSync, writeFileSync, rmSync, mkdtempSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');

export default function () {
    const dir = mkdtempSync(join(tmpdir(), 'magma-kit-integrity-'));
    try {
        sync(dir);

        test('a freshly vendored app verifies clean', () => {
            const r = verify(dir);
            eq(r.problems, []);
            ok(r.checked > 0, `checked ${r.checked} files`);
            eq(r.version, JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8')).version);
        });

        test('an edited vendored file is caught, and named', () => {
            const victim = join(dir, 'app', 'kit', 'keys.js');
            const original = readFileSync(victim, 'utf8');
            appendFileSync(victim, '\n// a local edit\n');

            const r = verify(dir);
            eq(r.problems.length, 1);
            ok(r.problems[0].includes('app/kit/keys.js'), `names the file: ${r.problems[0]}`);
            ok(r.problems[0].includes('sync-kit'), 'and says what to do about it');

            writeFileSync(victim, original);
            eq(verify(dir).problems, [], 'and clean again once restored');
        });

        test('a deleted vendored file is caught', () => {
            const victim = join(dir, 'tests', 'kit', 'assert.mjs');
            const original = readFileSync(victim, 'utf8');
            rmSync(victim);

            const r = verify(dir);
            eq(r.problems.length, 1);
            ok(r.problems[0].includes('missing'), r.problems[0]);

            writeFileSync(victim, original);
        });

        test('CRLF alone is not an edit', () => {
            // The two apps sit in repos with different line-ending settings;
            // a checker that flipped on that would be turned off within a day.
            const victim = join(dir, 'app', 'kit', 'prefs.js');
            const original = readFileSync(victim, 'utf8');
            writeFileSync(victim, original.replaceAll('\n', '\r\n'));

            eq(verify(dir).problems, []);
            writeFileSync(victim, original);
        });

        test('a missing KIT.md says so rather than passing vacuously', () => {
            const marker = join(dir, 'app', 'kit', 'KIT.md');
            const original = readFileSync(marker, 'utf8');
            rmSync(marker);

            const r = verify(dir);
            eq(r.checked, 0);
            ok(r.problems[0].includes('KIT.md'), r.problems[0]);

            writeFileSync(marker, original);
        });

        test('the manifest parser reads rows and the version', () => {
            const md = readFileSync(join(dir, 'app', 'kit', 'KIT.md'), 'utf8');
            const rows = parseManifest(md);
            ok(rows.length >= 11, `${rows.length} rows`);
            ok(rows.every((r) => /^[0-9a-f]{64}$/.test(r.hash)), 'every row carries a sha256');
            ok(rows.some((r) => r.file === 'app/kit/boot.js'), 'boot.js is among them');
            ok(kitVersionOf(md), 'the version is readable');
        });

        test('the checker is itself on the list it checks', () => {
            // Not proof against someone editing both, but it means an accident
            // cannot quietly disable the guard.
            const rows = parseManifest(readFileSync(join(dir, 'app', 'kit', 'KIT.md'), 'utf8'));
            ok(rows.some((r) => r.file === 'tests/kit/kit-integrity.mjs'), 'self-verifying');
        });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
