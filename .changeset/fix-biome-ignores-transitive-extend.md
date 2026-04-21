---
"ultracite": patch
---

Fix `dist/`, `.next/`, `**/*.gen.*`, and other strong-negation (`!!`) ignore globs being dropped when a consumer's `biome.jsonc` extends `ultracite/biome/core` and also defines its own `files.includes`. The globs moved into `config/shared/ignores.jsonc` in 7.5.9 were transitively extended through `biome/core`, and Biome's extend merge doesn't carry `files.includes` through a two-level chain when the middle config lacks its own entry. The patterns are now inlined directly in `biome/core`'s `files.includes` (still generated from `config/shared/ignores.mjs`), matching the pre-7.5.9 behavior.
