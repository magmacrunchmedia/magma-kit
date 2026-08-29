import { test, eq, ok } from '../testkit/assert.mjs';
import { kit } from './load.mjs';

const BINDINGS = [
    { key: 'F5', action: 'refresh' },
    { key: 'r', ctrl: true, action: 'refresh' },
    { key: 'z', ctrl: true, action: 'undo' },
    { key: 'z', ctrl: true, shift: true, action: 'redo' },
    { key: 'p', action: 'tool:pen' },
    { key: 'Escape', action: 'dismiss' },
];

const ev = (key, o = {}) => ({
    key,
    ctrlKey: !!o.ctrl, metaKey: !!o.meta, shiftKey: !!o.shift, altKey: !!o.alt,
    target: o.target || null,
});

const typing = { tagName: 'INPUT', type: 'text' };

export default function () {
    const K = kit(['keys.js']).keys;
    const keys = K.create(BINDINGS);

    test('a bare letter resolves to its action', () => {
        eq(keys.resolve(ev('p')), 'tool:pen');
    });

    test('single-letter bindings match case-insensitively', () => {
        // CapsLock produces 'P' with no shift; the binding still applies.
        eq(keys.resolve(ev('P')), 'tool:pen');
    });

    test('ctrl and meta both mean the modifier', () => {
        eq(keys.resolve(ev('r', { ctrl: true })), 'refresh');
        eq(keys.resolve(ev('r', { meta: true })), 'refresh');
    });

    test('an unmodified key does not fire a ctrl binding, or vice versa', () => {
        eq(keys.resolve(ev('r')), null);
        eq(keys.resolve(ev('p', { ctrl: true })), null);
    });

    test('shift distinguishes undo from redo', () => {
        eq(keys.resolve(ev('z', { ctrl: true })), 'undo');
        eq(keys.resolve(ev('z', { ctrl: true, shift: true })), 'redo');
    });

    test('alt combinations belong to the OS', () => {
        eq(keys.resolve(ev('p', { alt: true })), null);
        eq(keys.resolve(ev('F5', { alt: true })), null);
    });

    test('a bare letter while typing is a character, not a command', () => {
        eq(keys.resolve(ev('p', { target: typing })), null);
    });

    test('ctrl bindings still fire while typing', () => {
        eq(keys.resolve(ev('z', { ctrl: true, target: typing })), 'undo');
    });

    test('function keys fire wherever the caret is', () => {
        eq(keys.resolve(ev('F5', { target: typing })), 'refresh');
    });

    test('Escape in a field stays with the field', () => {
        eq(keys.resolve(ev('Escape', { target: typing })), null);
        eq(keys.resolve(ev('Escape')), 'dismiss');
    });

    test('the available list filters, and filtered bindings are not swallowed elsewhere', () => {
        eq(keys.resolve(ev('F5'), ['refresh']), 'refresh');
        eq(keys.resolve(ev('F5'), ['dismiss']), null);
    });

    test('isTyping: text-ish elements yes, checkboxes and radios no', () => {
        ok(K.isTyping({ tagName: 'INPUT', type: 'text' }), 'text input');
        ok(K.isTyping({ tagName: 'TEXTAREA' }), 'textarea');
        ok(K.isTyping({ tagName: 'SELECT' }), 'select');
        ok(!K.isTyping({ tagName: 'INPUT', type: 'checkbox' }), 'checkbox');
        ok(!K.isTyping({ tagName: 'INPUT', type: 'radio' }), 'radio');
        ok(!K.isTyping({ tagName: 'DIV' }), 'plain div');
        ok(K.isTyping({ tagName: 'DIV', isContentEditable: true }), 'contenteditable');
        ok(!K.isTyping(null), 'no target');
    });

    test('a null event resolves to null', () => {
        eq(keys.resolve(null), null);
    });
}
