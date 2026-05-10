/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import remix from "eslint-plugin-remix";

import remixRules from "./rules/remix.mjs";

const config = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      remix,
    },
    rules: {
      ...remixRules,
    },
  },
  {
    files: ["**/routeTree.gen.ts"],
    rules: {
      "unicorn/filename-case": "off",
      "unicorn/no-abusive-eslint-disable": "off",
    },
  },
];

export default config;
