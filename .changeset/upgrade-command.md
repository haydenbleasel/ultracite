---
"ultracite": minor
---

Add `ultracite upgrade`, and make version drift between Ultracite and its linter visible instead of a crash. Bumping `ultracite` without bumping the linter fails on the next `check`/`fix` with Biome's `Found an unknown key` error (and the equivalent for ESLint and Oxlint), because each release enables rules from a specific linter version.

- `ultracite upgrade` installs the latest `ultracite`, prints a release-notes link for the versions you crossed, then hands off to the freshly installed CLI to reinstall your toolchain at the versions that release was verified with: Biome; ESLint, Prettier, Stylelint and the plugins the preset imports; or Oxlint and Oxfmt. Optional extras already in your `package.json` (framework plugins, Oxlint JS plugins, `oxlint-tsgolint`) are bumped as well. Config files are never rewritten, and the run ends with the same diagnostics as `doctor`.
- `ultracite doctor` now checks the installed Biome, ESLint, Prettier, Stylelint, Oxlint and Oxfmt versions against the range this release supports. Too old fails the check and points at `ultracite upgrade`; newer than the verified range only warns.
- The supported ranges are declared as optional peer dependencies so package managers warn when they drift: `@biomejs/biome ^2.5.0`, `eslint ^10.0.0`, `prettier ^3.0.0`, `stylelint ^17.0.0`, `oxlint ^1.79.0`, `oxfmt >=0.40.0`. `ultracite init` now installs Prettier and Stylelint from those ranges instead of `latest`.

Requires Biome >= 2.5.0, ESLint >= 10.0.0, Prettier >= 3.0.0, Stylelint >= 17.0.0, Oxlint >= 1.79.0 and Oxfmt >= 0.40.0.
