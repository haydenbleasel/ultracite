---
"ultracite": patch
---

Raise the `oxlint` peer dependency to `^1.82.0`. The core Oxlint preset configures `no-unmodified-loop-condition` with `checkConditionalExpressions`, an option Oxlint 1.79 to 1.81 reject, so those releases failed with "Failed to parse oxlint configuration file" even though the old `^1.79.0` range allowed them. `ultracite doctor` and your package manager now flag the too-old version instead.

Requires oxlint >= 1.82.0
