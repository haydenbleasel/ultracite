---
"ultracite": minor
"@repo/data": patch
---

Migrate oxlint and oxfmt configurations from JSON to TypeScript using `defineConfig`. The CLI now generates `oxlint.config.ts` and `oxfmt.config.ts` instead of `.oxlintrc.json` and `.oxfmtrc.jsonc`, and all internal framework presets have been converted to TypeScript.
