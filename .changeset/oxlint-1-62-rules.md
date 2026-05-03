---
"ultracite": patch
---

Add new oxlint 1.61.0 and 1.62.0 rules:

- `eslint/func-name-matching` → `"error"` — function names should match the variable they're assigned to; matches the project's strict baseline.
- `eslint/no-underscore-dangle` → `"off"` — common patterns like `_id` (Mongo) and `_internal` make this rule too noisy in practice.
- `typescript/explicit-member-accessibility` → `"off"` — forcing `public`/`private` on every class member is verbose and not idiomatic in modern TS.
- `jest/prefer-expect-assertions` → `"off"` and `vitest/prefer-expect-assertions` → `"off"` — requiring `expect.assertions(n)` in every test is too strict for general use; not all tests need explicit assertion counts.
- `vitest/max-expects` → `"error"` and `vitest/max-nested-describe` → `"error"` — newly split out from the jest plugin; mirrors the existing jest config which has both enabled.
- `vitest/no-conditional-in-test` → `"off"` — newly split out from jest; disabled to mirror jest config (mock factories use conditionals for path-based routing).
- `vitest/no-hooks` → `"off"` — newly split out from jest; disabled to mirror jest config (bun:test uses `beforeEach` for `mock.restore()`).
- `react/forbid-component-props` → `"off"` — parity with the ESLint config, which already disables this rule.
