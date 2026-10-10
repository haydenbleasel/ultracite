---
"ultracite": major
---

`ultracite init` now asks before it changes files it doesn't own, and asks every question before it writes anything.

- When you pick a linter other than the one the project uses, an interactive run lists the other linters' config files and packages and asks before removing them. If you keep them, init warns when `ultracite check` would still find and run the old linter. `--yes` removes them without asking, as before.
- An ESLint setup keeps legacy `.eslintrc` files. ESLint 10 doesn't read them, so they can't conflict with the flat config, and `ultracite doctor` no longer flags them on an ESLint setup. Moving to Biome or Oxlint still removes them.
- Init only turns on `strictNullChecks` in your `tsconfig*.json` files when type-aware linting is on, since only the type-aware rules need it, and an interactive run lists the files and asks first. It used to change every tsconfig on every run.
- In a TypeScript project, an interactive run asks whether to turn on type-aware linting when `--type-aware` isn't passed. A project that already has it keeps it.
