/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import query from "@tanstack/eslint-plugin-query";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11yRules from "./rules/jsx-a11y.mjs";
import queryRules from "./rules/query.mjs";
import reactRules from "./rules/react.mjs";
import reactHooksRules from "./rules/react-hooks.mjs";

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
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "@tanstack/query": query,
    },
    rules: {
      ...reactRules,
      ...reactHooksRules,
      ...jsxA11yRules,
      ...queryRules,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];

export default config;
