---
"ultracite": patch
---

Re-running `ultracite init` no longer silently discards changes to an ESLint, Prettier or Stylelint config that builds on Ultracite's:

- `eslint.config.*`: the framework presets it already spreads are kept alongside any newly selected ones, together with your own config objects, imports and a `defineConfig(...)` wrapper. Before, the file was regenerated from the selected frameworks only, dropping earlier presets and every custom rule.
- `prettier.config.*`: your options, imports and extra plugins are kept. Framework plugins are added, and `prettier-plugin-tailwindcss` stays last.
- Stylelint: a config that already uses `ultracite/stylelint`, including one in `package.json`, is left as it is.

A config that doesn't use Ultracite's presets is still replaced, but init now prints a warning naming the file (or the `package.json` key) it replaced. A config that doesn't parse is left unchanged with a warning. With the ESLint toolchain, a `"prettier"` or `"stylelint"` key in `package.json` is now handled by these updates (and reported when replaced) instead of being deleted silently during migration.
