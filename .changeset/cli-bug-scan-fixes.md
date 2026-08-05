---
"ultracite": patch
---

Fix a batch of CLI bugs found in a code audit:

- `ultracite check`/`fix` no longer misroutes space-separated flag values (e.g. `--max-warnings 10`) into the file list, and positional files listed before a `--` separator are kept as lint targets instead of silently widening formatter runs to the whole project.
- The CLI no longer becomes a silent no-op when a generic `TEST` environment variable is set — the internal guard now uses `ULTRACITE_TEST`.
- `ultracite doctor` now resolves config files by walking up parent directories (matching `check`/`fix` and the linters themselves), accepts `.oxlintrc.json`, and recognizes Prettier/Stylelint configs declared via `package.json` keys — fixing spurious failures in monorepo packages.
- `ultracite init` no longer corrupts existing configs: Prettier/Stylelint/ESLint updates write ESM only into files that can hold it (JSON/YAML/TOML/CJS configs are replaced with the default `.mjs` config), unparseable `tsconfig.json` and editor settings files are skipped with a warning instead of being overwritten, and lint-staged configs with function-valued entries are left untouched.
- `ultracite init` with the Husky integration no longer runs `husky init`, which overwrote an existing `.husky/pre-commit` hook with `npm test`.
- Re-running `ultracite init` on an oxlint setup preserves the previously selected JS plugins instead of silently enabling the full js-plugins preset, and no longer flips an explicit `"type": "commonjs"` in package.json.
- Switching linters no longer removes `storybook` from the project's dependencies.
- Lefthook/pre-commit YAML updates now handle configs where `jobs:` isn't the first key under `pre-commit:` (or `repos:` is an inline list) and warn instead of silently writing the file back unchanged.
- Biome config migration now maps the legacy bare `"extends": ["ultracite"]` form to `ultracite/biome/core`.
- Agent fix mode (`--claude`/`--codex`) no longer aborts with ENOBUFS on large diagnostic sets, user-supplied format flags can't break its JSON parsing, a stuck agent process is force-killed after a grace period, and the progress renderer no longer garbles output when file paths exceed the terminal width.
- Stylelint targets now include directories with a dot in their name and use forward slashes on Windows.
