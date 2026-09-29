---
"ultracite": patch
---

Test-file overrides in every preset now match `.mts`, `.cts`, `.mjs` and `.cjs` test files as well as `.ts`, `.tsx`, `.js` and `.jsx`. The globs were `**/*.{test,spec,test-d,spec-d}.{ts,tsx,js,jsx}` and `**/__tests__/**/*.{ts,tsx,js,jsx}`, so a `sum.test.mts` file got none of the test-file relaxations and none of the Jest or Vitest rules. For example, `test.only` in a `.test.mts` file was not reported by `vitest/no-focused-tests` or `jest/no-focused-tests`. This covers the Oxlint `core`, `js-plugins`, `jest` and `vitest` presets, the Biome `core` preset, and the ESLint `core`, `jest` and `vitest` presets.
