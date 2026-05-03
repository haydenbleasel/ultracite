---
"ultracite": patch
---

Fix `ultracite check` and `ultracite fix` short-circuiting after the formatter step. Previously, when the formatter (oxfmt or Prettier) exited non-zero, the linter (oxlint, ESLint, Stylelint) was never invoked, hiding lint errors until formatting was clean. The commands now run every step, accumulate failures, and exit with the first failing tool's status. Fixes [#690](https://github.com/haydenbleasel/ultracite/issues/690).
