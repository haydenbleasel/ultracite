---
"ultracite": major
---

`ultracite upgrade` now brings your configuration up to date, not just your packages, and replaces the manual upgrade guides.

- `--claude` and `--codex` hand the configuration changes a project still needs to that agent's CLI, after Ultracite and the toolchain are installed. The agent gets the upgrade guide for each major release the configuration predates: Biome 2's config format (v5), the per-framework presets (v6), the `ultracite/biome/*` preset paths and `check` and `fix` commands (v7), and this release's changes (v8): removing `prettier/prettier` from ESLint and Stylelint configs, importing the new Cypress, Storybook and type-aware ESLint presets where the project needs them, turning on Oxlint's `typeAware` when `oxlint-tsgolint` is installed, formatting with Prettier in Zed, and adding `--yes` to `init --quiet`. It runs as it does for `fix --claude`, limited to editing files, and Ultracite checks the project again afterwards, exiting non-zero when a change is still missing.
- Which guides apply is decided from the project, not the version it came from, so a project that skipped a major release or had `ultracite` bumped by hand still gets them. Without an agent flag, `upgrade` lists them. They ship in the package under `skills/ultracite/references/upgrades/` and with the Ultracite skill.
- `--version <version>` installs a given release, such as `7` (the newest 7.x) or `7.12.4`, instead of the latest. `--claude` and `--codex` need 8 or later, so `upgrade` stops before installing anything when they're passed with an earlier release.
- When the package manager fails to install a package, `upgrade` and `init` print its output and how to retry instead of a stack trace, and for an npm peer dependency conflict (`ERESOLVE`) it suggests `legacy-peer-deps=true` in `.npmrc`.
- Ultracite's own `-v` and `--version` now only work before a command, so `upgrade --version` is the upgrade's option. `ultracite --version` prints the version as before.
