/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import start from "@tanstack/eslint-plugin-start";

import { typeCheckedRules } from "../rules/start.mjs";

// The TanStack Start rules that read TypeScript type information. Added with
// ultracite/eslint/type-aware, after the tanstack preset. Only TypeScript
// files: JavaScript has no type information to read.
const tanstackTypeAware = [
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      "@tanstack/start": start,
    },
    rules: {
      ...typeCheckedRules,
    },
  },
];

export default tanstackTypeAware;
