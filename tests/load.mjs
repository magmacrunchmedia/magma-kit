// Loads kit js/ files into a fake window for the kit's own suites — the same
// baseSandbox/runScript the vendored harness offers consumers, pointed at the
// unvendored originals.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { baseSandbox, runScript } from '../testkit/harness.mjs';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');

/** Evaluate the named js/ files in order; returns the sandbox (a fake window). */
export function kitSandbox(files, globals) {
    const sandbox = baseSandbox(globals);
    for (const f of files) runScript(sandbox, join(JS, f), `js/${f}`);
    return sandbox;
}

/** The common case: just MagmaKit. */
export function kit(files, globals) {
    return kitSandbox(files, globals).MagmaKit;
}
