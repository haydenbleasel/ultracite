import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescript from '@typescript-eslint/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import promise from 'eslint-plugin-promise';
import n from 'eslint-plugin-n';
import next from '@next/eslint-plugin-next';

import eslintRules from './rules/eslint';
import reactRules from './rules/react';
import reactHooksRules from './rules/reactHooks';
import typescriptRules from './rules/typescript';
import jsxA11yRules from './rules/jsxA11y';
import importRules from './rules/import';
import jestRules from './rules/jest';
import promiseRules from './rules/promise';
import nRules from './rules/n';
import nextRules from './rules/next';
import prettierRules from './rules/prettier';

export default [
  {
    languageOptions: {
      sourceType: 'module',
      globals: {
        browser: true,
        node: true,
        'jest/globals': true,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    ignores: ['**/*.js'],
    plugins: {
      react,
      reactHooks,
      typescript,
      jsxA11y,
      importPlugin,
      jest,
      promise,
      n,
      next,
    },
    rules: {
      ...eslintRules,
      ...reactRules,
      ...reactHooksRules,
      ...typescriptRules,
      ...jsxA11yRules,
      ...importRules,
      ...jestRules,
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
];
