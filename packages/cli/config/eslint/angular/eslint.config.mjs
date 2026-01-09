/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import angular from "@angular-eslint/eslint-plugin";

import angularRules from "./rules/angular.mjs";

const config = [
  {
    files: ["**/*.ts"],
    plugins: {
      "@angular-eslint": angular,
    },
    rules: {
      ...angularRules,
    },
  },
];

export default config;
