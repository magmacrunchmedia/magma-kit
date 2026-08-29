import { test, eq, ok } from '../testkit/assert.mjs';
import { versionSuite } from '../testkit/versions.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mini-app');

export default function () {
    // The fixture is consistent (Cargo.toml 1.2.3 everywhere, private
    // manifests, a version slot, no hardcoded vX.Y.Z), so the whole suite must
    // pass against it. A factory bug shows up here as a fixture "failure".
    versionSuite({ root: ROOT })(test, eq, ok);
}
