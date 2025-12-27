/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import solid from "eslint-plugin-solid";
import solidRules from "./rules/solid.mjs";

const config = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      solid,
    },
    rules: {
      ...solidRules,
    },
  },
];

export default config;
