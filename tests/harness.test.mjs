import { test, eq, ok, throws } from '../testkit/assert.mjs';
import { createHarness } from '../testkit/harness.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mini-app', 'app');

export default function () {
    const h = createHarness({
        appRoot: APP,
        namespace: 'Mini',
        kitFiles: ['k.js'],
        coreFiles: ['alpha.js', 'beta.js'],
    });

    test('loadCore evaluates kit then core, in order, and returns the namespace', () => {
        const M = h.loadCore();
        ok(M, 'namespace attached');
        eq(M.alpha.value, 1);
        eq(M.beta.value, 2, 'beta saw alpha');
        eq(M.beta.kit, 'kit-was-here', 'core could lean on the kit');
    });

    test('a wrong load order throws at load, before any browser sees it', () => {
        const bad = createHarness({
            appRoot: APP,
            namespace: 'Mini',
            kitFiles: ['k.js'],
            coreFiles: ['beta.js', 'alpha.js'],
        });
        throws(() => bad.loadCore(), 'beta needs alpha');
    });

    test('a missing kit file is a loud failure, not a silent skip', () => {
        const bad = createHarness({
            appRoot: APP,
            namespace: 'Mini',
            coreFiles: ['alpha.js', 'beta.js'],
        });
        throws(() => bad.loadCore(), 'beta needs the kit');
    });

    test('loadUI evaluates a ui/ file into an existing sandbox', () => {
        const sandbox = h.coreSandbox();
        h.loadUI(sandbox, 'main.js');
        eq(sandbox.Mini.main.ready, true);
    });

    test('scriptOrder reads the <script src> tags in document order', () => {
        eq(h.scriptOrder('index.html'),
            ['../kit/k.js', '../core/alpha.js', '../core/beta.js', 'main.js']);
    });

    test('coreSandbox takes per-suite extras over the harness globals', () => {
        const sandbox = h.coreSandbox({ marker: 42 });
        eq(sandbox.marker, 42);
    });
}
