---
"ultracite": patch
---

Clearer wording in the CLI:

- `ultracite init --help` now lists the valid values for `--pm`, `--linter`, `--frameworks`, `--hooks` and `--integrations`, and explains what `--type-aware` does for Biome and for Oxlint.
- The agent rules file says "Oxlint + Oxfmt will catch most mechanical issues automatically" instead of "Oxlint + Oxfmt's linter will catch…".
- `init` and `upgrade` say "Using pnpm (detected from the project)" instead of "Detected lockfile", since the package manager can also come from `packageManager`.
- `ultracite doctor` spells "unrecognized" consistently, formats commands as code, and describes warnings as "Some checks have warnings" instead of "optional improvements".
