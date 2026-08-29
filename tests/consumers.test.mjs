// Are the apps that vendor this kit still holding the current copy?
//
// The consumers cannot answer this for themselves. Their own suites verify
// their vendored files against their own KIT.md (tests/kit/kit-integrity.mjs),
// which catches an edit made in place — but an old-but-consistent vendoring
// passes that, because KIT.md travels with the files. So "I changed a kit file
// and never synced it out" is invisible from over there, and has to be caught
// from here: at the moment the change is made, which is the moment the risk is
// created.
//
// A consumer path that does not exist is REPORTED AND SKIPPED, never failed.
// This repo has to stay checkable on a machine that has only some of the family
// checked out, or the first thing anyone does is delete the test.

import { test, eq, ok } from '../testkit/assert.mjs';
import { check } from '../scripts/sync.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');

export default function () {
    const { paths } = JSON.parse(readFileSync(join(KIT, 'consumers.json'), 'utf8'));

    test('the consumer registry is a non-empty list of paths', () => {
        ok(Array.isArray(paths) && paths.length > 0, 'consumers.json lists at least one');
    });

    const missing = [];

    for (const rel of paths) {
        const root = resolve(KIT, rel);

        if (!existsSync(root)) {
            missing.push(rel);
            continue;
        }

        test(`${rel} has the current kit`, () => {
            eq(check(root), [],
                `run \`node scripts/sync.mjs ${rel}\` — this consumer is behind or has been edited`);
        });
    }

    if (missing.length) {
        console.log(`  (not checked out, skipped: ${missing.join(', ')})`);
    }
}
