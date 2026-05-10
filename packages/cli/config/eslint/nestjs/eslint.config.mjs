/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import { plugin as nestjsTyped } from "@darraghor/eslint-plugin-nestjs-typed";

import nestjsRules from "./rules/nestjs.mjs";

const config = [
  {
    files: ["**/*.ts"],
    plugins: {
      "@darraghor/nestjs-typed": nestjsTyped,
    },
    rules: {
      ...nestjsRules,
    },
  },
];

export default config;
