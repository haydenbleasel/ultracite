/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import jestPlugin from "eslint-plugin-jest";

import { typeCheckedRules } from "../rules/jest.mjs";

// The Jest rules that read TypeScript type information. Added with
// ultracite/eslint/type-aware, after the jest preset. Only TypeScript tests:
// JavaScript has no type information to read.
const jestTypeAware = [
  {
    files: [
      "**/*.{test,spec}.{ts,tsx,mts,cts}",
      "**/__tests__/**/*.{ts,tsx,mts,cts}",
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      ...typeCheckedRules,
    },
  },
];

export default jestTypeAware;
