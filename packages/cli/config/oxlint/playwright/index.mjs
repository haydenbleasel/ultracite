import { defineConfig } from "oxlint";

// Oxlint has no Playwright plugin; its rules are in ultracite/eslint/playwright
// and ultracite/biome/playwright. This preset keeps the framework selectable
// and lets Playwright's fixture pattern through core's no-empty-pattern.
export default defineConfig({
  overrides: [
    {
      // The files Playwright's default testMatch picks up. A hook that only
      // needs testInfo takes an empty fixtures pattern:
      // test.beforeEach(async ({}, testInfo) => ...).
      files: ["**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}"],
      rules: {
        "no-empty-pattern": [
          "error",
          { allowObjectPatternsAsParameters: true },
        ],
      },
    },
  ],
  rules: {},
});
