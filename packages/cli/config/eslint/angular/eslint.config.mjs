/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import angularPlugin from "@angular-eslint/eslint-plugin";

import angularRules from "./rules/angular.mjs";

const angular = [
  {
    files: ["**/*.ts"],
    plugins: {
      "@angular-eslint": angularPlugin,
    },
    rules: {
      ...angularRules,
    },
  },
];

export default angular;
