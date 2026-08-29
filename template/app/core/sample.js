// core/sample.js — a placeholder pure module, to be replaced by the first real
// one. It exists so the test wiring has something to load and the shape of a
// core module is on the page: an IIFE, no DOM, no fetch, no Tauri — anything
// needing those belongs in ui/.

(function () {
    'use strict';

    const App = (window.__APP_NS__ = window.__APP_NS__ || {});

    function greet(name) {
        return `hello, ${name}`;
    }

    App.sample = { greet };
}());
