---
"ultracite": patch
---

Migrate stale linter and formatter configuration when switching toolchains during init. Running `ultracite init` now removes config files and dependencies for unselected Biome, ESLint/Prettier/Stylelint, or Oxlint/Oxfmt setups before writing the selected toolchain config.
