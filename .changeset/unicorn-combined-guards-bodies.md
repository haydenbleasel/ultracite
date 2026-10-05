---
"ultracite": patch
---

The ESLint core preset enables `unicorn/prefer-combined-guards`'s new [`checkMultiStatementBodies`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v77.0.0/docs/rules/prefer-combined-guards.md#checkmultistatementbodies) option, so consecutive guards whose bodies repeat the same statements before the same exit (for example, two `if` blocks that each log and `continue`) are reported and can be combined with `||`. In TypeScript, the rule only combines bodies when type information shows every reference has the same type in both.
