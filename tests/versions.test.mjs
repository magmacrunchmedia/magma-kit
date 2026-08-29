import { test, eq, ok } from '../testkit/assert.mjs';
import { versionSuite } from '../testkit/versions.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mini-app');

export default function () {
    // The fixture's version story is consistent (Cargo.toml 1.2.3 everywhere,
    // private manifests, a version slot, no literal vX.Y.Z in index.html), so
    // the whole suite must pass against it in both modes. A factory bug shows
    // up here as a fixture "failure".
    versionSuite({ root: ROOT })(test, eq, ok);
    versionSuite({ root: ROOT, markup: 'must-match' })(test, eq, ok);

    // And must-match has to actually bite. stale.html carries v0.0.1 against a
    // Cargo.toml of 1.2.3 — exactly the hidden-footer rot the mode exists to
    // catch. Run against a private tally so the deliberate failure is not
    // counted as one.
    test('must-match rejects a stale version in the markup', () => {
        const seen = [];
        const localTest = (name, fn) => {
            try { fn(); seen.push([name, null]); }
            catch (e) { seen.push([name, e.message]); }
        };
        versionSuite({ root: ROOT, pages: ['stale.html'], markup: 'must-match' })(localTest, eq, ok);

        const row = seen.find(([name]) => name.includes('in the markup'));
        ok(row, 'the markup check ran');
        ok(row[1], 'a stale v0.0.1 against Cargo 1.2.3 must fail');
        ok(row[1].includes('v1.2.3'), `and must say what it wanted: ${row[1]}`);
    });
}
