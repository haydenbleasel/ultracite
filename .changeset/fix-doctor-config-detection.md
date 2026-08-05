---
"ultracite": patch
---

Fix `ultracite doctor` reporting spurious failures: config checks now walk up parent directories (matching `check`/`fix` and the linters themselves) so monorepo packages inheriting a root config pass, `.oxlintrc.json` is accepted as a valid oxlint config (with a migration suggestion), and Prettier/Stylelint configs declared via `package.json` keys are recognized.
