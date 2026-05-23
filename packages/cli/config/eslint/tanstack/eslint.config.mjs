/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import query from "@tanstack/eslint-plugin-query";
import router from "@tanstack/eslint-plugin-router";
import start from "@tanstack/eslint-plugin-start";

import queryRules from "./rules/query.mjs";
import routerRules from "./rules/router.mjs";
import startRules from "./rules/start.mjs";

const config = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@tanstack/query": query,
      "@tanstack/router": router,
      "@tanstack/start": start,
    },
    rules: {
      ...queryRules,
      ...routerRules,
      ...startRules,
    },
  },
];

export default config;
