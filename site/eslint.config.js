import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

export default [
    { ignores: ['dist/**', 'dist-preview/**', 'node_modules/**'] },
    js.configs.recommended,
    {
        files: ['src/**/*.{js,jsx}'],
        plugins: { 'react-hooks': reactHooks, react },
        languageOptions: {
            globals: {
                ...globals.browser,
                // injected by vite.config.mjs `define`
                __LOCAL_FIRMWARE_BUILD__: 'readonly', __GIT_HASH__: 'readonly',
                __GIT_DIRTY__: 'readonly', __UI_BUILD__: 'readonly',
            },
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'react/jsx-uses-vars': 'error',   // JSX usage counts as a use for no-unused-vars
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_|^React$' }],
        },
    },
    { files: ['src/**/*.test.js', 'vite.config.mjs', 'eslint.config.js'], languageOptions: { globals: globals.node } },
];
