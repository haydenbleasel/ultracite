---
"ultracite": patch
---

Update oxlint to 1.86.0 and enable its new type-aware rule, [`typescript/no-generated-empty-object-type`](https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-generated-empty-object-type.html), in the core Oxlint preset. It reports type operations such as `Pick<Data, never>` that resolve to the empty object type `{}`, matching the `@typescript-eslint` rule of the same name that the ESLint preset already enables. Like the other type-aware rules, it only runs with `oxlint --type-aware` and `oxlint-tsgolint` installed. Older oxlint releases fail to parse a config that names the rule, so the `oxlint` peer range moves to `^1.86.0`.

Requires oxlint >= 1.86.0
