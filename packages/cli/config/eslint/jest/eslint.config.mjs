/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import { createRequire } from "node:module";
import path from "node:path";

import jest from "eslint-plugin-jest";
import globals from "globals";

import jestRules from "./rules/jest.mjs";

// Used when Jest itself is not installed (bun:test, or a Jest-compatible
// runner). The newest major has the longest deprecation list.
const LATEST_JEST_MAJOR = 30;

// jest/no-deprecated-functions needs the Jest major version and throws
// "Unable to detect Jest version", crashing the whole ESLint run, when it
// cannot resolve `jest` from the plugin's own install location. Resolve it
// from the project instead and fall back to the latest major.
const detectJestMajor = () => {
  try {
    const projectRequire = createRequire(
      path.join(process.cwd(), "package.json")
    );
    const { version } = projectRequire("jest/package.json");
    const [major] = version.split(".");
    return Number(major);
  } catch {
    return LATEST_JEST_MAJOR;
  }
};

const config = [
  {
    // Vitest type-test files (*.test-d.ts, *.spec-d.ts) are intentionally
    // excluded — Jest has no typecheck mode, so its rules don't apply to them.
    files: [
      "**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
      "**/__tests__/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
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
    settings: {
      jest: {
        version: detectJestMajor(),
      },
    },
  },
];

export default config;
