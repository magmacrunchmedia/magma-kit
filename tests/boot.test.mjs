import { test, eq, ok } from '../testkit/assert.mjs';
import { kitSandbox } from './load.mjs';

// boot.js is all side effects: it subscribes to window events and invokes
// log_line. So the suite plays both sides — a recording addEventListener and a
// recording invoke.
function bootWorld(opts = {}) {
    const calls = [];
    const listeners = {};
    const globals = {
        addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
        document: { documentElement: { dataset: { app: opts.app || 'TestApp' } } },
    };
    if (!opts.noInternals) {
        globals.__TAURI_INTERNALS__ = {
            invoke: (cmd, args) => { calls.push({ cmd, ...args }); },
        };
    }
    const sandbox = kitSandbox(['boot.js'], globals);
    const fire = (type, e) => (listeners[type] || []).forEach((fn) => fn(e));
    return { sandbox, calls, fire };
}

export default function () {
    test('page loading is reported at load time', () => {
        const w = bootWorld();
        const boot = w.calls.find((c) => c.message === 'page loading');
        ok(boot, 'sent');
        eq(boot.cmd, 'log_line');
        eq(boot.kind, 'boot');
        eq(boot.detail, '/test');
    });

    test('a script error reaches the log with file, position and stack', () => {
        const w = bootWorld();
        w.fire('error', {
            message: 'boom', filename: 'ui/editor.js', lineno: 12, colno: 3,
            error: { stack: 'THE STACK' },
        });
        const err = w.calls.find((c) => c.kind === 'ERROR');
        ok(err, 'sent');
        eq(err.message, 'boom');
        ok(err.detail.includes('ui/editor.js:12:3'), 'names the site');
        ok(err.detail.includes('THE STACK'), 'carries the stack');
    });

    test('an unhandled rejection reaches the log', () => {
        const w = bootWorld();
        w.fire('unhandledrejection', { reason: { stack: 'REJECT STACK' } });
        const err = w.calls.find((c) => c.kind === 'ERROR');
        ok(err, 'sent');
        eq(err.message, 'unhandled promise rejection');
        eq(err.detail, 'REJECT STACK');
    });

    test('the modules-attached report counts the namespace named on <html>', () => {
        const w = bootWorld({ app: 'MyApp' });
        w.sandbox.MyApp = { alpha: {}, beta: {} };
        w.fire('DOMContentLoaded');
        const rep = w.calls.find((c) => c.message === 'modules attached');
        ok(rep, 'sent');
        eq(rep.detail, 'alpha,beta');
    });

    test('no data-app, no namespace: the report says (none) rather than throwing', () => {
        const w = bootWorld({ app: '' });
        w.fire('DOMContentLoaded');
        const rep = w.calls.find((c) => c.message === 'modules attached');
        eq(rep.detail, '(none)');
    });

    test('without internals nothing is sent and nothing throws', () => {
        const w = bootWorld({ noInternals: true });
        w.fire('error', { message: 'boom' });
        w.fire('DOMContentLoaded');
        eq(w.calls, []);
    });

    test('a throwing invoke is swallowed — a logger that throws is worse than none', () => {
        const w = bootWorld();
        w.sandbox.__TAURI_INTERNALS__.invoke = () => { throw new Error('ipc down'); };
        w.fire('error', { message: 'boom' });   // must not throw
    });
}
