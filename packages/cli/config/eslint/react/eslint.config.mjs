/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

// biome-ignore lint/performance/noNamespaceImport: Required for ESLint plugin compatibility
import * as query from "@tanstack/eslint-plugin-query";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

import jsxA11yRules from "./rules/jsx-a11y.mjs";
import queryRules from "./rules/query.mjs";
import reactHooksRules from "./rules/react-hooks.mjs";
import reactRules from "./rules/react.mjs";

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
      "@tanstack/eslint-plugin-query": query,
      "jsx-a11y": jsxA11y,
      react,
      "react-hooks": reactHooks,
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
