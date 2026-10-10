/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import vitestPlugin from "@vitest/eslint-plugin";

import { typeCheckedRules } from "../rules/vitest.mjs";

// The Vitest rules that read TypeScript type information. Added with
// ultracite/eslint/type-aware, after the vitest preset. Only TypeScript
// tests: JavaScript has no type information to read.
const vitestTypeAware = [
  {
    files: [
      "**/*.{test,spec,test-d,spec-d}.{ts,tsx,mts,cts}",
      "**/__tests__/**/*.{ts,tsx,mts,cts}",
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...typeCheckedRules,
    },
  },
];

export default vitestTypeAware;
