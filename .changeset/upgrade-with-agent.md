---
"ultracite": minor
---

`ultracite upgrade` now brings your configuration up to date, not just your packages, and replaces the manual upgrade guides.

- `--claude` and `--codex` hand the configuration changes a project still needs to that agent's CLI, after Ultracite and the toolchain are installed. The agent gets the upgrade guide for each major release the configuration predates: Biome 2's config format (v5), the per-framework presets (v6), and the `ultracite/biome/*` preset paths and `check` and `fix` commands (v7). It runs as it does for `fix --claude`, limited to editing files, and Ultracite checks the project again afterwards, exiting non-zero when a change is still missing.
- Which guides apply is decided from the project, not the version it came from, so a project that skipped a major release or had `ultracite` bumped by hand still gets them. Without an agent flag, `upgrade` lists them. They ship in the package under `skills/ultracite/references/upgrades/` and with the Ultracite skill.
- `--version <version>` installs a given release, such as `7` (the newest 7.x) or `7.13.0`, instead of the latest.
- Ultracite's own `-v` and `--version` now only work before a command, so `upgrade --version` is the upgrade's option. `ultracite --version` prints the version as before.
