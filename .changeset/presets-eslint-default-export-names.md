---
"ultracite": patch
---

The `eslint.config.mjs` that `ultracite init` writes no longer fails its own lint. Every ESLint preset exported a default named `config`, so `import core from "ultracite/eslint/core"` (and each framework import) tripped `import-x/no-rename-default` twice per preset. Each preset's default export is now named after the identifier the generated config imports it as (`core`, `react`, `tanstack`, …).
