---
"ultracite": patch
---

Fix the generated `oxfmt.config.ts` template, which used `extends: [ultracite]` — a key oxfmt does not recognize, so the preset was silently dropped and built-in options like `sortImports` never took effect. The template now spreads the preset (`...ultracite`) so its options are actually applied. Fixes [#689](https://github.com/haydenbleasel/ultracite/issues/689).
