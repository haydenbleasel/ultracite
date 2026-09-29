/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import solidPlugin from "eslint-plugin-solid";

import solidRules from "./rules/solid.mjs";

const solid = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      solid: solidPlugin,
    },
    rules: {
      ...solidRules,
    },
  },
];

export default solid;
