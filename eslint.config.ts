import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import * as typescript from '@typescript-eslint/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import promise from 'eslint-plugin-promise';
import n from 'eslint-plugin-n';
import next from '@next/eslint-plugin-next';

import prettier from 'eslint-config-prettier';

import eslintRules from './rules/eslint';
import reactRules from './rules/react';
import reactHooksRules from './rules/reactHooks';
import typescriptRules from './rules/typescript';
import jsxA11yRules from './rules/jsx-a11y';
import importRules from './rules/import';
import jestRules from './rules/jest';
import promiseRules from './rules/promise';
import nRules from './rules/n';
import nextRules from './rules/next';
import prettierRules from './rules/prettier';

export default [
  react.configs['jsx-runtime'],
  prettier,
  importPlugin.configs.typescript,
  {
    languageOptions: {
      sourceType: 'module',
      globals: {
        browser: true,
        node: true,
        'jest/globals': true,
      },
      parser: typescript.configs.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    ignores: ['**/*.js'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@typescript-eslint': typescript,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      jest,
      promise,
      n,
      '@next/next': next,
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
