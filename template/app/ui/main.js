// main.js — page wiring. Last in the load order; everything is attached.

(function () {
    'use strict';

    const App = window.__APP_NS__;

    // The footer version comes from the binary — never hardcoded in markup
    // (tests/version.test.mjs enforces that).
    const slot = document.getElementById('app-version');
    if (slot && App.fs) {
        App.fs.appVersion().then((v) => { slot.textContent = `v${v}`; }).catch(() => {});
    }

    console.log(`__APP_NAME__ ready (sample says: ${App.sample.greet('world')})`);
}());
