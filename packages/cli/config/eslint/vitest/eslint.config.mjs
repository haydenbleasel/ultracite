/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import vitest from "@vitest/eslint-plugin";

import vitestRules from "./rules/vitest.mjs";

const config = [
  {
    files: [
      "**/*.{test,spec}.{ts,tsx,js,jsx}",
      "**/__tests__/**/*.{ts,tsx,js,jsx}",
    ],
    plugins: {
      vitest,
    },
    rules: {
      ...vitestRules,
      // Mock callbacks often need empty functions
      "no-empty-function": "off",
      // Mock factories use Promise.resolve/reject (conflicts with require-await)
      "promise/prefer-await-to-then": "off",
    },
  },
];

export default config;
