/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import jest from "eslint-plugin-jest";
import globals from "globals";

import jestRules from "./rules/jest.mjs";

const config = [
  {
    files: ["**/*.test.{js,ts,jsx,tsx}", "tests/**/*.{js,ts,jsx,tsx}"],
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
    },
  },
];

export default config;
