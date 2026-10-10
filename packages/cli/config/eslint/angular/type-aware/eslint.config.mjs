/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import angularPlugin from "@angular-eslint/eslint-plugin";

import { typeCheckedRules } from "../rules/angular.mjs";

// The Angular rules that read TypeScript type information. Added with
// ultracite/eslint/type-aware, after the angular preset.
const angularTypeAware = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      "@angular-eslint": angularPlugin,
    },
    rules: {
      ...typeCheckedRules,
    },
  },
];

export default angularTypeAware;
