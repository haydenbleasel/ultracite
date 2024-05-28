/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescript from '@typescript-eslint/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import * as importPlugin from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import promise from 'eslint-plugin-promise';
import n from 'eslint-plugin-n';
import next from '@next/eslint-plugin-next';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier';
import cypress from 'eslint-plugin-cypress';
import storybook from 'eslint-plugin-storybook';
import unusedImports from 'eslint-plugin-unused-imports';
// import tailwindcss from 'eslint-plugin-tailwindcss';
import * as importTypescriptResolver from 'eslint-import-resolver-typescript';
import html from 'eslint-plugin-html';
import compat from 'eslint-plugin-compat';
import eslintPrettier from 'eslint-config-prettier';
import * as typescriptParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import github from 'eslint-plugin-github';

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
import cypressRules from './rules/cypress.mjs';
import storybookRules from './rules/storybook.mjs';
// import tailwindcssRules from './rules/tailwindcss.mjs';
import unusedImportsRules from './rules/unused-imports.mjs';
import sonarjsRules from './rules/sonarjs.mjs';
import compatRules from './rules/compat.mjs';
import unicornRules from './rules/unicorn.mjs';
import githubRules from './rules/github.mjs';

const config = [
  importPlugin.configs.typescript,
  {
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
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
      '**/*.html',
    ],
    plugins: {
      prettier,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      promise,
      n,
      '@next/next': next,
      'unused-imports': unusedImports,
      // tailwindcss,
      sonarjs,
      compat,
      unicorn,
      github,
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
      ...eslintPrettier.rules,
      ...unusedImportsRules,
      // ...tailwindcssRules,
      ...sonarjsRules,
      ...compatRules,
      ...unicornRules,
      ...githubRules,
    },

    settings: {
      react: {
        version: 'detect',
      },

      // https://github.com/import-js/eslint-plugin-import/issues/2556#issuecomment-1419518561
      'import/parsers': {
        espree: ['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'import/typescript': importTypescriptResolver,
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
  {
    files: ['**/*.cy.js', '**/*.cy.jsx'],
    languageOptions: {
      globals: {
        ...globals.cypress,
      },
    },
    plugins: {
      cypress,
    },
    rules: {
      ...cypressRules,
    },
  },
  {
    files: [
      '**/*.stories.js',
      '**/*.stories.jsx',
      '**/*.stories.ts',
      '**/*.stories.tsx',
    ],
    plugins: {
      storybook,
    },
    rules: {
      ...storybookRules,
    },
  },
  {
    files: ['**/*.html'],
    plugins: {
      html,
    },
    settings: {
      'html/javascript-tag-names': ['script', 'Script'],
    },
  },
];

export default config;
