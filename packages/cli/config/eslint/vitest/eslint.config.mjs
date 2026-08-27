/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import vitest from "@vitest/eslint-plugin";

import vitestRules from "./rules/vitest.mjs";

const config = [
  {
    files: [
      "**/*.{test,spec,test-d,spec-d}.{ts,tsx,js,jsx}",
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
    settings: {
      vitest: {
        // Teach expect-expect / valid-expect about expectTypeOf and assertType
        // so type-test files (*.test-d.ts, *.spec-d.ts) are not flagged as
        // having no assertions.
        typecheck: true,
      },
    },
  },
];

export default config;
