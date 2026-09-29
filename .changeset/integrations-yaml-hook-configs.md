---
"ultracite": patch
---

`ultracite init` now edits `.pre-commit-config.yaml` and lefthook configs through the `yaml` Document API instead of splicing text, so the result is always valid YAML and comments are kept.

- **pre-commit:** a `repos:` list written flush with its key (`-   repo:`, the style `pre-commit sample-config` generates) or with four-space indentation no longer turns into invalid YAML that breaks every commit. The file's sequence style is kept.
- **lefthook:** a four-space indented `pre-commit:` block, a compact `jobs:` list, or a column-0 comment inside the block no longer produce invalid YAML or a duplicate `jobs:` key. A hook that uses `commands:` gets a `jobs:` list next to it.
- **lefthook:** init now finds an existing `.lefthook.yml`, `lefthook.yaml`, `.config/lefthook.yml` (and the other names lefthook reads) and edits it. Previously it created `lefthook.yml`, which lefthook picks first, so the user's own config silently stopped running. A JSON or TOML config is left alone with instructions.
- **lefthook:** the job's globs are now `*.js`, `*.ts`, and so on. With lefthook's default matcher, the previous `**/*.js` form skipped root-level files such as `package.json` or `index.ts`. Projects that set `glob_matcher: doublestar` get `**/*.js`.
- **lefthook:** re-running init with a different package manager updates the existing job instead of adding a second one.
- Both now run the project's installed Ultracite (`npx`, `yarn`, `pnpm exec`, `bunx`) instead of `yarn dlx` / `pnpm dlx`. Re-running init upgrades a hook or job written by an earlier version.
- `lefthook install` runs the project's installed lefthook, and the `prepare` script is chained onto an existing one (e.g. `svelte-kit sync || echo '' && lefthook install`) instead of replacing it.
