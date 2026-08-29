import { test, eq, ok } from '../testkit/assert.mjs';
import { kitSandbox } from './load.mjs';

/* A menu bar is DOM behaviour, so this builds just enough of one: elements
   that carry a classList, a dataset and listeners, and nothing else. The
   point of testing it at all is that the module owns no behaviour of its own —
   so what there IS to get wrong is the dispatch, the state refresh, and the
   hover-to-switch, all of which are invisible until they are not. */

function el(tag, opts = {}) {
    const classes = new Set(opts.classes || []);
    const listeners = {};
    const node = {
        tagName: tag,
        dataset: opts.dataset || {},
        disabled: false,
        children: [],
        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            contains: (c) => classes.has(c),
            toggle: (c, on) => {
                const want = on === undefined ? !classes.has(c) : on;
                if (want) classes.add(c); else classes.delete(c);
                return want;
            },
        },
        addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
        fire: (type, e = {}) => (listeners[type] || []).forEach((fn) => fn(e)),
        querySelector: (sel) => node.children.find((c) => c.matches(sel)) || null,
        querySelectorAll: (sel) => node.all().filter((c) => c.matches(sel)),
        matches: (sel) => {
            if (sel.startsWith('.')) return classes.has(sel.slice(1));
            if (sel === '[data-action]') return 'action' in node.dataset;
            return false;
        },
        all: () => node.children.flatMap((c) => [c, ...c.all()]),
        closest: (sel) => (node.matches(sel) ? node : null),
        append: (c) => { node.children.push(c); return c; },
    };
    return node;
}

/** bar > [FILE > (title, drop > items...)], plus a document stand-in. */
function build(itemDefs) {
    const bar = el('nav');
    const menus = [];
    for (const def of itemDefs) {
        const menu = el('div', { classes: ['menu'] });
        menu.append(el('button', { classes: ['menu-title'] }));
        for (const it of def.items) {
            menu.append(el('button', { dataset: it }));
        }
        bar.append(menu);
        menus.push(menu);
    }
    return { bar, menus };
}

function sandboxFor(bar, byId = {}) {
    const doc = {
        getElementById: (id) => byId[id] || null,
        addEventListener: () => {},
    };
    return kitSandbox(['menu.js'], { document: doc });
}

export default function () {
    test('an item dispatches the action it names, with the item', () => {
        const { bar, menus } = build([{ items: [{ action: 'file:save' }] }]);
        const seen = [];
        const M = sandboxFor(bar).MagmaKit;
        M.menu.create(bar, { actions: { 'file:save': (i) => seen.push(i) } });

        const item = menus[0].children[1];
        bar.fire('click', { target: item });
        eq(seen.length, 1, 'dispatched once');
        eq(seen[0], item, 'and handed the item it came from');
    });

    test('an unknown action is ignored rather than thrown', () => {
        const { bar, menus } = build([{ items: [{ action: 'nope' }] }]);
        const M = sandboxFor(bar).MagmaKit;
        M.menu.create(bar, { actions: {} });
        bar.fire('click', { target: menus[0].children[1] });
        ok(true, 'no throw');
    });

    test('a disabled item does not dispatch', () => {
        const { bar, menus } = build([{ items: [{ action: 'edit:undo' }] }]);
        let calls = 0;
        const M = sandboxFor(bar).MagmaKit;
        M.menu.create(bar, { actions: { 'edit:undo': () => calls++ } });

        const item = menus[0].children[1];
        item.disabled = true;
        bar.fire('click', { target: item });
        eq(calls, 0, 'inert');
    });

    test('clicking the title opens the menu, and again closes it', () => {
        const { bar, menus } = build([{ items: [{ action: 'a' }] }]);
        const M = sandboxFor(bar).MagmaKit;
        const menu = M.menu.create(bar, { actions: {} });

        const title = menus[0].children[0];
        title.fire('click', { stopPropagation() {} });
        ok(menus[0].classList.contains('open'), 'open');
        title.fire('click', { stopPropagation() {} });
        ok(!menus[0].classList.contains('open'), 'closed');
        eq(menu.isOpen(), null, 'and nothing is recorded as open');
    });

    /* The one behaviour every real menu bar has and no plain <details> gives
       you for free. */
    test('once one menu is open, hovering another switches to it', () => {
        const { bar, menus } = build([
            { items: [{ action: 'a' }] },
            { items: [{ action: 'b' }] },
        ]);
        const M = sandboxFor(bar).MagmaKit;
        M.menu.create(bar, { actions: {} });

        menus[0].children[0].fire('click', { stopPropagation() {} });
        menus[1].fire('mouseenter');
        ok(!menus[0].classList.contains('open'), 'the first closed');
        ok(menus[1].classList.contains('open'), 'and the second opened');
    });

    test('hovering while nothing is open does NOT open anything', () => {
        const { bar, menus } = build([{ items: [{ action: 'a' }] }]);
        const M = sandboxFor(bar).MagmaKit;
        M.menu.create(bar, { actions: {} });
        menus[0].fire('mouseenter');
        ok(!menus[0].classList.contains('open'), 'a menu bar is not a hover menu');
    });

    /* Closing before the action runs matters: an action that opens a dialog
       would otherwise leave the menu hanging over it. */
    test('the menu closes before the action runs', () => {
        const { bar, menus } = build([{ items: [{ action: 'x' }] }]);
        let openWhenCalled = true;
        const M = sandboxFor(bar).MagmaKit;
        M.menu.create(bar, {
            actions: { x: () => { openWhenCalled = menus[0].classList.contains('open'); } },
        });
        menus[0].children[0].fire('click', { stopPropagation() {} });
        bar.fire('click', { target: menus[0].children[1] });
        eq(openWhenCalled, false, 'already closed');
    });

    /* Read fresh on every open, because undo depth and selection change from
       under us and a menu that subscribed to them would be a second copy. */
    test('state is asked for each time a menu opens, not once', () => {
        const { bar, menus } = build([{ items: [{ action: 'edit:undo' }] }]);
        let canUndo = false;
        const M = sandboxFor(bar).MagmaKit;
        M.menu.create(bar, {
            actions: {},
            state: (action) => ({ disabled: action === 'edit:undo' && !canUndo }),
        });

        const title = menus[0].children[0];
        const item = menus[0].children[1];

        title.fire('click', { stopPropagation() {} });
        eq(item.disabled, true, 'disabled while the stack is empty');

        title.fire('click', { stopPropagation() {} });   // close
        canUndo = true;
        title.fire('click', { stopPropagation() {} });   // open again
        eq(item.disabled, false, 'and enabled once there is something to undo');
    });

    /* The rule that stops a menu becoming a second implementation of a toggle
       that can then drift from the button it mirrors. */
    test('a data-toggles item mirrors the control it names', () => {
        const { bar, menus } = build([{ items: [{ action: 'view:grid', toggles: 'grid-btn' }] }]);
        const button = el('button', { classes: ['active'] });
        const M = sandboxFor(bar, { 'grid-btn': button }).MagmaKit;
        M.menu.create(bar, { actions: { 'view:grid': (i) => i } });

        const title = menus[0].children[0];
        const item = menus[0].children[1];

        title.fire('click', { stopPropagation() {} });
        ok(item.classList.contains('checked'), 'checked while the control is active');

        title.fire('click', { stopPropagation() {} });
        button.classList.remove('active');
        title.fire('click', { stopPropagation() {} });
        ok(!item.classList.contains('checked'), 'and unchecked when it is not');
    });

    test('an explicit checked from state beats the data-toggles fallback', () => {
        const { bar, menus } = build([{ items: [{ action: 'v', toggles: 'b' }] }]);
        const button = el('button');   // NOT active
        const M = sandboxFor(bar, { b: button }).MagmaKit;
        M.menu.create(bar, { actions: {}, state: () => ({ checked: true }) });

        menus[0].children[0].fire('click', { stopPropagation() {} });
        ok(menus[0].children[1].classList.contains('checked'), 'state wins');
    });

    test('a bar that is not there yields null rather than throwing', () => {
        const { bar } = build([]);
        const M = sandboxFor(bar).MagmaKit;
        eq(M.menu.create(null, { actions: {} }), null, 'null');
    });
}
