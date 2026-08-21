---
"ultracite": patch
---

Ignore `.alchemy` across all linters and formatters. Alchemy (alchemy.run) writes local state and generated bindings to a `.alchemy` directory. It is now part of the shared ignore patterns synced into Biome's `files.includes` and imported by oxlint, oxfmt, and ESLint, and the Stylelint preset ignores it via `ignoreFiles`. Prettier needs no change: it already respects `.gitignore`/`.prettierignore`.
