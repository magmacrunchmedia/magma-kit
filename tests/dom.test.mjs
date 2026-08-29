import { test, eq, ok } from '../testkit/assert.mjs';
import { kit } from './load.mjs';

// The minimum of a DOM node that el/clear touch.
function fakeNode(tag) {
    return {
        tag, className: '', textContent: '',
        children: [],
        get firstChild() { return this.children[0] || null; },
        appendChild(c) { this.children.push(c); return c; },
        removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    };
}

export default function () {
    const D = kit(['dom.js'], {
        document: { createElement: (t) => fakeNode(t) },
    }).dom;

    test('el builds tag, class and text', () => {
        const n = D.el('span', 'pill', 'OK');
        eq(n.tag, 'span');
        eq(n.className, 'pill');
        eq(n.textContent, 'OK');
    });

    test('el leaves text alone for null and undefined, but keeps 0 and ""', () => {
        eq(D.el('div', 'c').textContent, '', 'undefined');
        eq(D.el('div', 'c', null).textContent, '', 'null');
        eq(D.el('div', 'c', 0).textContent, 0, 'zero is content');
        eq(D.el('div', 'c', '').textContent, '', 'empty string is content');
    });

    test('clear empties a node and returns it', () => {
        const parent = fakeNode('div');
        parent.appendChild(fakeNode('a'));
        parent.appendChild(fakeNode('b'));
        const back = D.clear(parent);
        eq(parent.children.length, 0);
        ok(back === parent, 'returns the node for chaining');
    });

    test('noData has the default line and takes an override', () => {
        eq(D.noData().textContent, '— no data —');
        eq(D.noData('nothing yet').textContent, 'nothing yet');
        eq(D.noData().className, 'no-data');
    });
}
