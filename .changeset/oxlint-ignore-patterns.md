---
"ultracite": patch
---

Add `ignorePatterns` to the generated oxlint config at the root level so they are actually applied. Oxlint does not merge `ignorePatterns` through `extends` (see oxc-project/oxc#10223), so patterns set in the core preset were silently ignored. The generated config now sets `ignorePatterns: core.ignorePatterns` at the top level, reusing the patterns from the imported core preset.
