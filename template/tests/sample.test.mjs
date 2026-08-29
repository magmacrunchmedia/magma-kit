import { test, eq } from './kit/assert.mjs';

export default function (M) {
    test('the sample module greets', () => {
        eq(M.sample.greet('world'), 'hello, world');
    });
}
