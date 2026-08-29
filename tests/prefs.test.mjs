import { test, eq } from '../testkit/assert.mjs';
import { kit } from './load.mjs';

function fakeStorage() {
    const store = new Map();
    return {
        store,
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
    };
}

export default function () {
    test('a missing key reads as null', () => {
        const P = kit(['prefs.js'], { localStorage: fakeStorage() }).prefs;
        eq(P.read('nope'), null);
    });

    test('write/read round-trips a value', () => {
        const P = kit(['prefs.js'], { localStorage: fakeStorage() }).prefs;
        P.write('k', { zoom: 8, gridOn: true });
        eq(P.read('k'), { zoom: 8, gridOn: true });
    });

    test('a corrupt value reads as null, not a throw', () => {
        const ls = fakeStorage();
        ls.store.set('k', '{oops');
        const P = kit(['prefs.js'], { localStorage: ls }).prefs;
        eq(P.read('k'), null);
    });

    test('a throwing setItem is swallowed (private mode)', () => {
        const ls = fakeStorage();
        ls.setItem = () => { throw new Error('QuotaExceededError'); };
        const P = kit(['prefs.js'], { localStorage: ls }).prefs;
        P.write('k', 1);   // must not throw
        eq(P.read('k'), null);
    });

    test('no localStorage at all still reads null and writes silently', () => {
        const P = kit(['prefs.js']).prefs;   // sandbox has no localStorage
        eq(P.read('k'), null);
        P.write('k', 1);   // must not throw
    });

    test('create(key) binds the pair to one key', () => {
        const ls = fakeStorage();
        const P = kit(['prefs.js'], { localStorage: ls }).prefs;
        const p = P.create('app.view');
        p.write({ zoom: 4 });
        eq(p.read(), { zoom: 4 });
        eq(P.read('app.view'), { zoom: 4 }, 'same key underneath');
    });

    test('patch merges over what is stored', () => {
        const P = kit(['prefs.js'], { localStorage: fakeStorage() }).prefs;
        const p = P.create('k');
        p.write({ a: 1, b: 2 });
        p.patch({ b: 3, c: 4 });
        eq(p.read(), { a: 1, b: 3, c: 4 });
    });

    test('patch onto nothing starts from empty', () => {
        const P = kit(['prefs.js'], { localStorage: fakeStorage() }).prefs;
        const p = P.create('k');
        p.patch({ a: 1 });
        eq(p.read(), { a: 1 });
    });
}
