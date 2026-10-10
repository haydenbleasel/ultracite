/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import { plugin as nestjsTyped } from "@darraghor/eslint-plugin-nestjs-typed";

import { typeCheckedRules } from "../rules/nestjs.mjs";

// The NestJS rules that read TypeScript type information. Added with
// ultracite/eslint/type-aware, after the nestjs preset.
const nestjsTypeAware = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      "@darraghor/nestjs-typed": nestjsTyped,
    },
    rules: {
      ...typeCheckedRules,
    },
  },
];

export default nestjsTypeAware;
