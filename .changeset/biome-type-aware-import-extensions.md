---
"ultracite": patch
---

The Biome `type-aware` preset no longer turns on `useImportExtensions`, which required a file extension on every relative import. The Oxlint and ESLint presets leave import extensions to the bundler and TypeScript (`import/extensions` is off), and Biome's `core` preset already had the rule off, so turning on type-aware linting no longer adds it.
