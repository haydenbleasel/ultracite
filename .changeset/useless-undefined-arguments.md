---
"ultracite": patch
---

Stop `unicorn/no-useless-undefined` in `ultracite/oxlint/core` from checking function call arguments. A required parameter typed `string | undefined` has to be passed `undefined` explicitly, but Oxlint flagged `consume(undefined)` and `ultracite fix` rewrote it to `consume()`, which TypeScript rejects with TS2554. The rule can't see parameter types, so it now runs with `checkArguments: false`. It still reports `let value = undefined`, `return undefined` and the rest of its checks. `ultracite/eslint/core` sets the same option. [eslint-plugin-unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-useless-undefined.md) already skipped arguments in TypeScript files, and now skips them in JavaScript too. Biome's `noUselessUndefined` never checked arguments.
