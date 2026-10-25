/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies */

import playwrightPlugin from "eslint-plugin-playwright";

import playwrightRules from "./rules/playwright.mjs";

const playwright = [
  {
    // The files Playwright's default testMatch picks up.
    files: ["**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}"],
    plugins: {
      playwright: playwrightPlugin,
    },
    rules: {
      ...playwrightRules,
      // A hook that only needs testInfo takes an empty fixtures pattern:
      // test.beforeEach(async ({}, testInfo) => ...).
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
    },
  },
];

export default playwright;
