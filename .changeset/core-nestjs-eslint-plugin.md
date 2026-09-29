---
"ultracite": patch
---

The ESLint `nestjs` preset imports `@darraghor/eslint-plugin-nestjs-typed`, but `ultracite init --linter eslint --frameworks nestjs` never installed it, so ESLint failed to load the config with "Cannot find package". `init` now installs the plugin with the preset, and `ultracite upgrade` installs the plugins of every framework preset your `eslint.config.*` imports, so existing NestJS projects pick it up on their next upgrade.
