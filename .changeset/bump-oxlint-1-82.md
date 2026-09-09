---
"ultracite": patch
---

Update oxlint to 1.82.0. The release adds and removes no rules, so the presets are unchanged apart from one new option: `no-unmodified-loop-condition` now runs with `checkConditionalExpressions: true` in the oxlint and ESLint core presets, so each branch of a ternary in a loop condition must be modified inside the loop rather than only the expression as a whole.
