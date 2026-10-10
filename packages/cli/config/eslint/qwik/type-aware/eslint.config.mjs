/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import qwikPlugin from "eslint-plugin-qwik";

import { typeCheckedRules } from "../rules/qwik.mjs";

// The Qwik rules that read TypeScript type information. Added with
// ultracite/eslint/type-aware, after the qwik preset. Only .tsx files: a
// .jsx file has no type information to read.
const qwikTypeAware = [
  {
    files: ["**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      qwik: qwikPlugin,
    },
    rules: {
      ...typeCheckedRules,
    },
  },
];

export default qwikTypeAware;
