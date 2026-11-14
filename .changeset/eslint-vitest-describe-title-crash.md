---
"ultracite": patch
---

The ESLint `vitest` preset no longer aborts the run on a `describe()` whose title is the name of something the file imports, such as `describe("sum", …)` next to `import { sum } from "./sum"`. For that case `vitest/prefer-describe-function-title` asks the type checker what the import is, which threw "You have used a rule which requires type information" in a config without the type-aware presets, so nothing was linted. The rule now runs in `ultracite/eslint/vitest/type-aware`, with the plugin's other type-checked rules.
