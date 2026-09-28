---
"ultracite": patch
---

Update oxlint to 1.85.0. Releases 1.83 through 1.85 add and remove no rules and change no options, so the presets are unchanged. Note that `jest/prefer-strict-equal`, `vitest/prefer-strict-equal`, `vitest/prefer-to-be-truthy` and `vitest/prefer-to-be-falsy` now offer suggestions instead of fixes, so `ultracite fix` reports them rather than rewriting them. `unicorn/consistent-function-scoping` also now catches functions that only capture variables from an outer ancestor scope.
