/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import vitest from "@vitest/eslint-plugin";

import vitestRules from "./rules/vitest.mjs";

const config = [
  {
    files: ["**/*.test.{js,ts,jsx,tsx}", "tests/**/*.{js,ts,jsx,tsx}"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitestRules,
    },
  },
];

export default config;
