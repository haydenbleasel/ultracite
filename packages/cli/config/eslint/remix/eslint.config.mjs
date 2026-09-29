/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import remixPlugin from "eslint-plugin-remix";

import remixRules from "./rules/remix.mjs";

const remix = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      remix: remixPlugin,
    },
    rules: {
      ...remixRules,
    },
  },
];

export default remix;
