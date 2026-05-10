---
"ultracite": patch
---

Drop the redundant `react-hooks/exhaustive-deps: "error"` override in `config/eslint/react/rules/react-hooks.mjs`. The dynamic-enable pattern already sets every non-deprecated `react-hooks/*` rule to `"error"`, so the override was dead code. No behavior change.
