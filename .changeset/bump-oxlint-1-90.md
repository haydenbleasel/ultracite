---
"ultracite": patch
---

Update oxlint to 1.90.0 and enable its new type-aware rule, [`typescript/no-unsafe-enum-assignment`](https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-unsafe-enum-assignment.html), in the core Oxlint preset. It reports a value assigned, returned or passed where an enum is expected when it doesn't share that enum's type, such as `const fruit: Fruit = 1`, matching the `@typescript-eslint` rule of the same name that the ESLint type-aware preset already enables. Like the other type-aware rules, it only runs with `oxlint --type-aware` and `oxlint-tsgolint` installed, and oxlint 1.90 needs `oxlint-tsgolint` 7.0.2005 or later. Older oxlint releases fail to parse a config that names the rule, so the `oxlint` peer range moves to `^1.90.0`.

The release also makes a few rules report cases they used to miss: `array-callback-return` checks callbacks passed with extra arguments, `no-useless-concat` sees through parentheses, and `jest/no-conditional-expect` checks function expression callbacks. See the [1.90.0 release notes](https://github.com/oxc-project/oxc/releases/tag/oxlint_v1.90.0).

Requires oxlint >= 1.90.0
