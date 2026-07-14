---
"ultracite": patch
---

Fail fast with an actionable message when Biome can't resolve `ultracite/biome/core`. Biome resolves that config out of the project's `node_modules`, so it errors with an opaque "module not found" whenever Ultracite isn't installed there — a state `npx ultracite check` / `bunx ultracite check` hide, because they run the CLI from a temp cache regardless. `check` and `fix` now detect it before invoking Biome and say what's actually wrong, and `doctor` verifies that Ultracite resolves rather than just appearing in `package.json` ([#750](https://github.com/haydenbleasel/ultracite/issues/750)).
