import { test, eq, ok } from '../testkit/assert.mjs';
import { kit } from './load.mjs';

// A stub <dialog>: listeners, .open, showModal that throws when already open
// (as the real one does), and _fire to play the browser.
function fakeDialog() {
    const listeners = {};
    const dlg = {
        open: false,
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        _fire(type, e = {}) {
            for (const fn of listeners[type] || [])
                fn({ preventDefault() {}, ...e });
        },
        showModal() {
            if (dlg.open) throw new Error('InvalidStateError: dialog already open');
            dlg.open = true;
        },
        close() { dlg.open = false; },
        querySelector: () => null,
    };
    return dlg;
}

function fakeButton() {
    const listeners = [];
    return {
        addEventListener: (type, fn) => { if (type === 'click') listeners.push(fn); },
        click: () => listeners.forEach((fn) => fn({})),
    };
}

export default async function () {
    const M = kit(['modal.js']).modal;

    test('wire: open shows, backdrop click closes', () => {
        const dlg = fakeDialog();
        const m = M.wire(dlg);
        m.open();
        ok(dlg.open, 'shown');
        dlg._fire('click', { target: dlg });
        ok(!dlg.open, 'backdrop closed it');
    });

    test('wire: a click inside does not close', () => {
        const dlg = fakeDialog();
        M.wire(dlg).open();
        dlg._fire('click', { target: { some: 'child' } });
        ok(dlg.open, 'still open');
    });

    test('wire: the × and any passed closer close it', () => {
        const x = fakeButton(), other = fakeButton();
        const dlg = fakeDialog();
        dlg.querySelector = (sel) => (sel === '.modal-close' ? x : null);
        const m = M.wire(dlg, { closers: [other] });
        m.open(); x.click();
        ok(!dlg.open, 'the × closed it');
        m.open(); other.click();
        ok(!dlg.open, 'the actions button closed it');
    });

    test('wire: open on an already-open dialog does not throw', () => {
        const dlg = fakeDialog();
        const m = M.wire(dlg);
        m.open();
        m.open();   // the real showModal throws; the guard must prevent that
        ok(dlg.open, 'still open, no throw');
    });

    await test.async('asker: settle delivers the value and closes', async () => {
        const dlg = fakeDialog();
        const a = M.asker(dlg);
        let settleFn;
        const p = a.ask((settle) => { settleFn = settle; });
        ok(dlg.open, 'shown');
        settleFn('picked');
        eq(await p, 'picked');
        ok(!dlg.open, 'closed');
    });

    await test.async('asker: every dismissal answers null', async () => {
        for (const fire of [
            (dlg) => dlg._fire('click', { target: dlg }),
            (dlg) => dlg._fire('cancel'),
            (dlg) => dlg._fire('keydown', { key: 'Escape' }),
        ]) {
            const dlg = fakeDialog();
            const a = M.asker(dlg);
            const p = a.ask(() => {});
            fire(dlg);
            eq(await p, null);
            ok(!dlg.open, 'closed');
        }
    });

    await test.async('asker: settled exactly once, later ways out are inert', async () => {
        const dlg = fakeDialog();
        const a = M.asker(dlg);
        let settleFn;
        const p = a.ask((settle) => { settleFn = settle; });
        settleFn('first');
        dlg._fire('cancel');           // after settling — must not matter
        eq(await p, 'first');
    });

    await test.async('asker: a second ask while open answers null immediately', async () => {
        const dlg = fakeDialog();
        const a = M.asker(dlg);
        const first = a.ask(() => {});
        eq(await a.ask(() => {}), null, 'second caller refused');
        dlg._fire('cancel');
        eq(await first, null);
    });

    await test.async('asker: a closer button dismisses with null', async () => {
        const cancel = fakeButton();
        const dlg = fakeDialog();
        const a = M.asker(dlg, { closers: [cancel] });
        const p = a.ask(() => {});
        cancel.click();
        eq(await p, null);
    });
}
