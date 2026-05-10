/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import next from "@next/eslint-plugin-next";

import nextRules from "./rules/next.mjs";

const config = [
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    plugins: {
      "@next/next": next,
    },
    rules: {
      ...nextRules,
    },
  },
  {
    files: ["**/next-env.d.ts"],
    rules: {
      "import-x/no-unassigned-import": "off",
    },
  },
];

export default config;
