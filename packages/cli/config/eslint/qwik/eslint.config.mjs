/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import qwikPlugin from "eslint-plugin-qwik";

import qwikRules from "./rules/qwik.mjs";

const qwik = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      qwik: qwikPlugin,
    },
    rules: {
      ...qwikRules,
    },
  },
];

export default qwik;
