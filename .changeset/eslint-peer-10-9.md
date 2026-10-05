---
"ultracite": patch
---

Raise the `eslint` peer dependency to `^10.9.0`. The ESLint core preset configures `no-unmodified-loop-condition` with `checkConditionalExpressions`, an option ESLint 10.0 to 10.8 reject, so every preset except Vue failed with `Key "rules": Key "no-unmodified-loop-condition"` on those releases even though the old `^10.0.0` range allowed them (`eslint-plugin-unicorn` also needs ESLint 10.4 or later). `ultracite init` and `ultracite upgrade` now install a release that loads the presets, and `ultracite doctor` and your package manager flag older ones. `@eslint/js`, which is no longer versioned with ESLint, keeps its own `^10.0.1` range.

Requires eslint >= 10.9.0
