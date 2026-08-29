// eslint.config.mjs — flat config, same rule set as sprite-forge's (which is
// where the family's lint rules were consolidated when ESLint 9 dropped
// .eslintrc).
//
// Three kinds of file:
//
//   js/        classic scripts, no modules, attaching to window.MagmaKit.
//              Consumers are buildless (the website cache-busts by stamping
//              ?v=<hash> onto <script src> tags, which cannot see ESM
//              imports), so sourceType stays "script" and an `import` here is
//              an error rather than a style choice.
//   testkit/   ESM on Node, vendored into consumers' tests/kit/.
//   tests/     ESM on Node, the kit's own suite.
//   scripts/   ESM on Node, dev-time only.
//
// template/ is placeholder-stamped scaffolding and crate/ is Rust; neither is
// linted from here.

const browser = {
    window: 'writable', document: 'readonly', console: 'readonly',
    setTimeout: 'readonly', clearTimeout: 'readonly',
    setInterval: 'readonly', clearInterval: 'readonly',
    requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
    Image: 'readonly', ImageData: 'readonly', URL: 'readonly', Blob: 'readonly',
    FileReader: 'readonly', fetch: 'readonly', navigator: 'readonly',
    localStorage: 'readonly', location: 'readonly', alert: 'readonly',
    confirm: 'readonly', prompt: 'readonly',
    KeyboardEvent: 'readonly', MouseEvent: 'readonly', Event: 'readonly',
    MutationObserver: 'readonly', CustomEvent: 'readonly',
    MagmaKit: 'writable',
};

const node = {
    console: 'readonly', process: 'readonly', Buffer: 'readonly',
    __dirname: 'readonly', __filename: 'readonly',
    setTimeout: 'readonly', clearTimeout: 'readonly',
    setInterval: 'readonly', clearInterval: 'readonly',
    URL: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly',
};

// Carried over from sprite-forge verbatim.
const rules = {
    'no-unused-vars': ['warn', { args: 'none' }],
    'no-undef': 'error',
    'no-redeclare': 'warn',
    'no-duplicate-case': 'error',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-unreachable': 'error',
    'no-constant-condition': 'warn',
    'no-extra-semi': 'error',
    'no-dupe-keys': 'error',
    'no-shadow-restricted-names': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    eqeqeq: ['warn', 'smart'],
    'no-caller': 'error',
    'no-eval': 'warn',
    'no-implied-eval': 'warn',
    'no-new-wrappers': 'error',
    'no-throw-literal': 'warn',
    'no-self-compare': 'warn',
    'no-unused-expressions': 'warn',
    'no-useless-call': 'warn',
    'no-useless-concat': 'warn',
    'no-useless-escape': 'warn',
    'no-with': 'error',
    'no-loop-func': 'warn',
    'no-new-func': 'warn',
};

export default [
    {
        ignores: ['node_modules/**', 'crate/**', 'template/**', '.claude/**'],
    },
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: browser,
        },
        rules,
    },
    {
        files: ['testkit/**/*.mjs', 'tests/**/*.mjs', 'scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: node,
        },
        rules,
    },
];
