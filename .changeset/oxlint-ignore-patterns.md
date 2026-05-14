---
"ultracite": patch
---

Add `ignorePatterns` to the generated oxlint config at the root level so they are actually applied. Oxlint does not merge `ignorePatterns` through `extends` (see oxc-project/oxc#10223), so patterns set in the core preset were silently ignored. Now `ignorePatterns` is imported directly from `ultracite/oxlint/ignores` and spread into the top-level `defineConfig` call.
