/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import qwik from "eslint-plugin-qwik";
import qwikRules from "./rules/qwik.mjs";

const config = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      qwik,
    },
    rules: {
      ...qwikRules,
    },
  },
];

export default config;
