---
"ultracite": patch
---

Align ESLint presets with the oxlint configs (the maintained source of truth). Mostly tightens ESLint where oxlint was stricter; a few documented behavioural exceptions oxlint carries (rule conflicts, bun:test compat) are mirrored back.

**core** — `eslint.mjs` now enforces `complexity`, `no-unused-private-class-members`, `sort-keys`, `sort-vars`, and full `prefer-destructuring` (object + array). `typescript.mjs` now enforces `no-confusing-void-expression`, `no-misused-promises`, `prefer-readonly`, `strict-boolean-expressions`, and sets `return-await: ["error", "always"]`. `import.mjs` now sets `consistent-type-specifier-style: ["error", "prefer-top-level"]`.

**next** — added `next-env.d.ts` override that disables `import-x/no-unassigned-import` on the generated file.

**remix** — added `routeTree.gen.ts` override that disables `unicorn/filename-case` and `unicorn/no-abusive-eslint-disable` on the generated file.

**react** — disabled `react/jsx-boolean-value`, `react/no-unknown-property`, and `react/only-export-components` to match oxlint.

**jest** — broadened test globs to `**/*.{test,spec}.{ts,tsx,js,jsx}` + `**/__tests__/**/*.{ts,tsx,js,jsx}` (previously missed `*.spec.*` and `__tests__/`). Disabled `no-empty-function` and `promise/prefer-await-to-then` in test scope. Disabled `jest/require-hook`, `jest/no-conditional-in-test`, `jest/no-hooks`, `jest/prefer-expect-assertions` to mirror oxlint's bun:test/mocking accommodations.

**vitest** — same test-glob broadening; same `no-empty-function` / `promise/prefer-await-to-then` test-scope disables. Removed the `prefer-importing-vitest-globals` and `prefer-to-have-been-called-times` disables (oxlint enforces these). Added `prefer-lowercase-title: off` and `valid-title: off` to resolve the documented conflict with `prefer-describe-function-title` (#665).
