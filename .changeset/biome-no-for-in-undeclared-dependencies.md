---
"ultracite": patch
---

The Biome `core` preset now turns on [`noForIn`](https://biomejs.dev/linter/rules/no-for-in/) and [`noUndeclaredDependencies`](https://biomejs.dev/linter/rules/no-undeclared-dependencies/) as errors.

`noForIn` reports every `for...in` loop, including guarded ones. Use `for...of` over `Object.keys()`, `Object.entries()` or an array instead. It had been off since it was a nursery rule, and stayed off when Biome 2.5 made it stable.

`noUndeclaredDependencies` reports imports of packages that aren't declared in the closest `package.json`, which catches code that only works because a transitive dependency happens to be installed. It moves out of the `type-aware` preset: it's a Biome project rule, but `core` keeps the scanner out of `node_modules`, so turning it on made no measurable difference to `ultracite check` times. In a monorepo, a workspace package that imports a dependency declared only in the root `package.json` is now reported; declare the dependency in that package's own `package.json`. The ESLint preset already enforces this through `import-x/no-extraneous-dependencies` and `n/no-extraneous-import`.
