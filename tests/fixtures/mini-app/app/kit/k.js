// A stand-in kit file: proves the harness loads app/kit/ before app/core/.
(function () {
    'use strict';
    window.MagmaKit = window.MagmaKit || {};
    window.MagmaKit.k = { mark: 'kit-was-here' };
}());
