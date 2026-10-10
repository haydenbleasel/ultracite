---
"ultracite": major
---

The ESLint rules that need type information are now opt-in, as they already are on Oxlint and Biome. The core preset no longer turns on the project service or the type-checked `@typescript-eslint` rules, such as `no-floating-promises`, `no-unsafe-return` and `strict-boolean-expressions`, so it lints TypeScript without a tsconfig and without building a TypeScript program, which is much faster. Where a type-checked rule replaced a core ESLint rule on TypeScript files (`no-implied-eval`, `no-throw-literal`, `prefer-destructuring`, `prefer-promise-reject-errors`, `require-await`), core now runs the ESLint rule, as Oxlint does without type information.

The type-checked rules live in a new `ultracite/eslint/type-aware` preset. Framework plugins with type-checked rules have an add-on after their preset: `ultracite/eslint/<framework>/type-aware` for `angular`, `jest`, `nestjs`, `qwik`, `tanstack` and `vitest`. `init --type-aware` adds the preset and the add-ons for the frameworks you pick, and re-running `init` without the flag keeps them. To keep type-aware linting, add them after `core` and after each framework:

```js
import core from "ultracite/eslint/core";
import typeAware from "ultracite/eslint/type-aware";
import vitest from "ultracite/eslint/vitest";
import vitestTypeAware from "ultracite/eslint/vitest/type-aware";

export default [...core, ...typeAware, ...vitest, ...vitestTypeAware];
```
