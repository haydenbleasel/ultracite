---
"ultracite": patch
---

Add new oxlint 1.63.0 rules:

- `eslint/logical-assignment-operators` → `"error"` — prefer `||=`, `&&=`, `??=` over their longhand equivalents; aligns with the modern-JS baseline.
- `eslint/require-unicode-regexp` → `"error"` — require the `u` (or `v`) flag on regex literals for correct Unicode handling.
- `eslint/no-restricted-properties` → `"off"` — purely a project-specific allowlist; no useful default to enforce.
- `unicorn/no-negated-condition` → `"error"` — newly split from the eslint version; the unicorn variant additionally covers ternary expressions and complements the existing `eslint/no-negated-condition`.
- `jsx-a11y/interactive-supports-focus` → `"error"` — interactive elements (click handlers, `role="button"`, etc.) must be keyboard-focusable; matches the rest of the a11y baseline.
- `vue/return-in-computed-property` → `"error"` — computed properties must return a value; missing `return` silently breaks reactivity.
- `vue/no-deprecated-model-definition` → `"error"` — flags Vue 2 `model: { ... }` usage; Vue 3 is the supported target.
- `vitest/prefer-mock-return-shorthand` → `"error"`, `vitest/no-unneeded-async-expect-function` → `"error"`, `vitest/prefer-to-have-been-called-times` → `"error"`, `vitest/prefer-snapshot-hint` → `"error"` — newly split out from the jest plugin; mirrors the existing jest config which has all four enabled.
- `vitest/require-hook` → `"off"` — newly split out from jest; disabled to mirror jest config (bun:test `mock.module()` must be called at top level).
