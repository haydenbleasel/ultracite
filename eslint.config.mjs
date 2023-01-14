import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import * as typescript from '@typescript-eslint/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import * as importPlugin from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import promise from 'eslint-plugin-promise';
import n from 'eslint-plugin-n';
import next from '@next/eslint-plugin-next';
import globals from 'globals';

import prettier from 'eslint-config-prettier';
import * as typescriptParser from '@typescript-eslint/parser';

import eslintRules from './rules/eslint.mjs';
import reactRules from './rules/react.mjs';
import reactHooksRules from './rules/reactHooks.mjs';
import typescriptRules from './rules/typescript.mjs';
import jsxA11yRules from './rules/jsx-a11y.mjs';
import importRules from './rules/import.mjs';
import jestRules from './rules/jest.mjs';
import promiseRules from './rules/promise.mjs';
import nRules from './rules/n.mjs';
import nextRules from './rules/next.mjs';
import prettierRules from './rules/prettier.mjs';
import eslintTypescriptRules from './rules/eslint-typescript.mjs';

const config = [
  react.configs['jsx-runtime'],
  prettier,
  importPlugin.configs.typescript,
  {
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    files: [
      '**/*.js',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx',
      '**/*.json',
      '**/*.mjs',
      '**/*.cjs',
    ],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      promise,
      n,
      '@next/next': next,
    },
    rules: {
      ...eslintRules,
      ...reactRules,
      ...reactHooksRules,
      ...jsxA11yRules,
      ...importRules,
      ...promiseRules,
      ...nRules,
      ...nextRules,
      ...prettierRules,
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'import/unambiguous': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...eslintTypescriptRules,
      ...typescriptRules,
    },
  },
  {
    files: ['**/*.test.js', '**/*.test.jsx', 'tests/**/*.js', 'tests/**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    plugins: {
      jest,
    },
    rules: {
      ...jestRules,
    },
  },
];

export default config;
