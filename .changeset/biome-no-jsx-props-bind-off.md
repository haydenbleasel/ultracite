---
"ultracite": patch
---

The Biome core preset turns `performance/noJsxPropsBind` off, matching the Oxlint and ESLint React presets, which already turn off `react-perf/jsx-no-new-function-as-prop` and `react/jsx-no-bind` ([#888](https://github.com/haydenbleasel/ultracite/issues/888)). Inline arrow functions and `.bind()` in JSX props, such as `onClick={() => setOpen(true)}`, are no longer reported. Because the rule was on in core, it also reported Solid and Qwik projects' inline `onClick` and `onClick$` handlers, the usual style in both frameworks, though a Solid component runs once and never recreates them. To keep the rule, set `"performance": { "noJsxPropsBind": "error" }` under `linter.rules` in your `biome.jsonc`.
