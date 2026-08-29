import { test, eq, ok } from '../testkit/assert.mjs';
import { kit } from './load.mjs';

export default function () {
    const H = kit(['history.js']).history;

    // A tiny app whose whole state is one number.
    function editor(cap) {
        const app = { state: 0, restored: [] };
        app.h = H.create({
            cap,
            snapshot: () => app.state,
            restore: (s) => { app.restored.push(s); app.state = s; },
        });
        return app;
    }

    test('undo restores the pushed pre-mutation state', () => {
        const a = editor();
        a.h.push();            // snapshot 0
        a.state = 1;
        ok(a.h.undo(), 'undo had something');
        eq(a.state, 0);
    });

    test('redo brings back the state undo left', () => {
        const a = editor();
        a.h.push(); a.state = 1;
        a.h.undo();
        ok(a.h.redo(), 'redo had something');
        eq(a.state, 1);
    });

    test('pushing new work kills the redo branch', () => {
        const a = editor();
        a.h.push(); a.state = 1;
        a.h.undo();
        a.h.push(); a.state = 2;
        ok(!a.h.canRedo(), 'redo is gone');
        eq(a.h.redo(), false);
    });

    test('the cap drops the oldest state, not the newest', () => {
        const a = editor(3);
        for (let i = 1; i <= 5; i++) { a.h.push(); a.state = i; }
        // 5 pushes into a cap of 3: undo reaches back exactly 3 states.
        a.h.undo(); a.h.undo(); a.h.undo();
        eq(a.state, 2, 'three undos from 5');
        eq(a.h.undo(), false, 'the fourth is gone');
    });

    test('push(state) takes an explicit pre-state', () => {
        const a = editor();
        a.h.push(41);
        a.state = 99;
        a.h.undo();
        eq(a.state, 41);
    });

    test('a stroke snapshots once and commits once', () => {
        const a = editor();
        a.h.beginStroke();      // pre-state 0
        a.state = 1; a.state = 2; a.state = 3;
        a.h.commitStroke();
        a.h.undo();
        eq(a.state, 0, 'one undo unwinds the whole stroke');
    });

    test('commit without begin is a no-op, and commit is not repeatable', () => {
        const a = editor();
        a.h.commitStroke();
        ok(!a.h.canUndo(), 'nothing pushed');
        a.h.beginStroke(); a.state = 1; a.h.commitStroke();
        a.h.commitStroke();
        a.h.undo();
        ok(!a.h.canUndo(), 'the stroke was pushed exactly once');
    });

    test('cancelStroke forgets the pending snapshot', () => {
        const a = editor();
        a.h.beginStroke(); a.state = 1;
        a.h.cancelStroke();
        a.h.commitStroke();
        ok(!a.h.canUndo(), 'a cancelled stroke pushes nothing');
    });

    test('leaving() sees the state about to be restored', () => {
        // The sprite-forge case: an undo entry carrying extra baggage means
        // the state pushed to the other stack has to carry it too.
        const seen = [];
        const app = { state: 'plain' };
        const h = H.create({
            snapshot: () => app.state,
            restore: (s) => { app.state = s; },
            leaving: (target) => { seen.push(target); return app.state; },
        });
        h.push('heavy');
        app.state = 'plain2';
        h.undo();
        eq(seen, ['heavy'], 'leaving() was told what is coming back');
        eq(app.state, 'heavy');
    });

    test('revision counts push, undo and redo', () => {
        const a = editor();
        eq(a.h.revision(), 0);
        a.h.push(); a.state = 1;
        eq(a.h.revision(), 1);
        a.h.undo();
        eq(a.h.revision(), 2);
        a.h.redo();
        eq(a.h.revision(), 3);
        a.h.undo(); a.h.undo();   // second is empty — must not count
        eq(a.h.revision(), 4);
    });

    test('undo on an empty stack reports false and restores nothing', () => {
        const a = editor();
        eq(a.h.undo(), false);
        eq(a.restored, []);
    });

    test('clear empties both stacks and the pending stroke', () => {
        const a = editor();
        a.h.push(); a.state = 1; a.h.undo();
        a.h.beginStroke();
        a.h.clear();
        ok(!a.h.canUndo() && !a.h.canRedo(), 'both stacks empty');
        a.h.commitStroke();
        ok(!a.h.canUndo(), 'pending stroke was dropped too');
    });
}
