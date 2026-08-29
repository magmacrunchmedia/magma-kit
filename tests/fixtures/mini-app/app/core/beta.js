(function () {
    'use strict';
    // Reads its dependencies at IIFE time, exactly like the real apps — a
    // wrong load order throws here, which is what harness.test.mjs asserts.
    if (!window.Mini || !window.Mini.alpha) throw new Error('beta needs alpha loaded first');
    if (!window.MagmaKit || !window.MagmaKit.k) throw new Error('beta needs the kit loaded first');
    window.Mini.beta = { value: window.Mini.alpha.value + 1, kit: window.MagmaKit.k.mark };
}());
