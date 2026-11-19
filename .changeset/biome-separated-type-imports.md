---
"ultracite": patch
---

The Biome core preset now sets `useImportType` to the `separatedType` style, so `ultracite fix` writes a mixed import as `import type { A } from "x"` plus `import { b } from "x"`. Biome's default wrote `import { type A, b }`, the inline form that `consistent-type-specifier-style` reports in the Oxlint and ESLint presets, so the three linters disagreed about the same line. Expect existing inline type specifiers to be reported and rewritten on the next `ultracite fix`.
