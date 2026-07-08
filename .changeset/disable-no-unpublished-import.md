---
"ultracite": patch
---

Disable the `n/no-unpublished-import` rule in the ESLint core config. This rule flags imports of packages that aren't listed as published dependencies, but it produces a lot of false positives in practice, so it's now turned off.
