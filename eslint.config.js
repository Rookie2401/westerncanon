// Minimal flat ESLint config: JS recommended + typescript-eslint recommended,
// with React hooks/refresh rules for the app source. The Vite react-ts template
// now ships oxlint; this project standardises on ESLint + typescript-eslint per
// the project spec.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'node_modules',
      'scripts/import-summa/raw',
      'data/summa/*.json',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['scripts/**/*.ts', 'data/**/*.ts', '*.config.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.node },
    },
  },
);
