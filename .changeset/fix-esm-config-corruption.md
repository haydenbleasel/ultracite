---
"ultracite": patch
---

Fix `ultracite init` corrupting existing Prettier/Stylelint/ESLint configs by writing an ESM module into JSON/YAML/TOML/CJS config files (e.g. `.prettierrc`, `eslint.config.cjs`). Updates now write the default `.mjs` config instead and remove the incompatible file so it can't shadow the new one.
