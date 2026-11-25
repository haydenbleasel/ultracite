---
"ultracite": patch
---

Update Oxlint to 1.95.0 and `oxlint-tsgolint` to 7.0.2008, and enable Oxlint's new type-aware rule, [`typescript/no-unsafe-class-instance-assignment`](https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-unsafe-class-instance-assignment.html), in the core Oxlint preset.

The rule reports a value used where an instance of a class is expected when it wasn't created by that class's constructor, such as `const user: User = { name: "a" }`. It matches the `@typescript-eslint` rule of the same name that the ESLint type-aware preset already enables. Like the other type-aware rules, it only runs with `oxlint --type-aware` and `oxlint-tsgolint` installed, and Oxlint 1.95.0 needs `oxlint-tsgolint` 7.0.2008 or later.

Oxlint 1.95.0 also repairs two fixes we reported, both applied by `ultracite fix --unsafe`. `unicorn/prefer-logical-operator-over-ternary` keeps the parentheses a nested ternary or an arrow function needs, where it used to write `x || y ? a : b` ([oxc-project/oxc#29877](https://github.com/oxc-project/oxc/issues/29877)). `no-unneeded-ternary` leaves `f() ? true : true` alone instead of deleting the call ([oxc-project/oxc#29878](https://github.com/oxc-project/oxc/issues/29878)), and turns `a + b ? true : false` into `!!(a + b)`, not `a + b`.

The rewrites for `no-unsafe-negation`, `jest/prefer-to-contain` and `vitest/prefer-to-contain` are now suggestions, so plain `ultracite fix` reports them and `--unsafe` applies them.

Requires oxlint >= 1.95.0
