---
"ultracite": patch
---

On the ESLint toolchain, `ultracite fix --hook` no longer deletes an import an agent has just added. A post-edit hook runs between the agent's edits, so the import is unused until the code that uses it lands, and `unused-imports/no-unused-imports` removed it first. The hook run now turns that rule off, as the Biome hook already skips `noUnusedImports` (#483). `no-unused-vars` still reports the import if it stays unused.
