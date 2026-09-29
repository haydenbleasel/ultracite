---
"ultracite": patch
---

`ultracite check` and `ultracite fix` handle their arguments and missing tools more reliably:

- `check` now treats explicit files the way `fix` does. Oxlint only gets files it can lint, Prettier runs with `--ignore-unknown`, and oxfmt with `--no-error-on-unmatched-pattern`. Before, `ultracite check README.md` or `ultracite check Dockerfile src/index.ts` failed even though nothing was wrong.
- Linter flags that take a value keep it, even when the value looks like a file: `--tsconfig tsconfig.json`, `-c .oxlintrc.json`, `--config-path biome.json`, `--only lint/suspicious/noDebugger`, `--since origin/main` and similar. Before, the value was treated as a lint target, so `ultracite fix --tsconfig tsconfig.json` skipped Oxlint entirely and only formatted `tsconfig.json`. Ultracite's own `--claude`, `--codex`, `--hook` and `--unsafe` never take a value, so the next argument is always a target.
- `ultracite fix --unsafe` with the ESLint toolchain no longer fails with ESLint's "Invalid option '--unsafe'". ESLint has no unsafe fixes, so the flag is dropped with a warning.
- A linter that isn't installed is reported with a plain message instead of a stack trace. The other tools still run first. Stylelint is optional in the ESLint toolchain, as `ultracite doctor` already said, so a project without it now skips CSS linting with a warning instead of failing. "No linter configuration found" is also printed without a stack trace.
- Linters installed in the project's `node_modules/.bin` are found even when Ultracite isn't run through a package manager script, `npx` or `bunx`, for example `./node_modules/.bin/ultracite check`.
