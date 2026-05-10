/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import jest from "eslint-plugin-jest";
import globals from "globals";

import jestRules from "./rules/jest.mjs";

const config = [
  {
    files: [
      "**/*.{test,spec}.{ts,tsx,js,jsx}",
      "**/__tests__/**/*.{ts,tsx,js,jsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    plugins: {
      jest,
    },
    rules: {
      ...jestRules,
      // Mock callbacks often need empty functions
      "no-empty-function": "off",
      // Mock factories use Promise.resolve/reject (conflicts with require-await)
      "promise/prefer-await-to-then": "off",
    },
  },
];

export default config;
