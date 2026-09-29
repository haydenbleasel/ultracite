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
  {
    // Reads TypeScript type information, which only the core preset's
    // TypeScript block provides. On .jsx files it throws and aborts the
    // whole ESLint run.
    files: ["**/*.jsx"],
    rules: {
      "qwik/valid-lexical-scope": "off",
    },
  },
];

export default qwik;
