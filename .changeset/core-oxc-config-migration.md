---
"ultracite": patch
---

`ultracite init` now migrates an existing `.oxlintrc.json`, `.oxfmtrc.json` or `.oxfmtrc.jsonc` when it sets up Oxlint. Oxlint and oxfmt refuse to load any config when a JSON config sits next to `oxlint.config.ts` or `oxfmt.config.ts`, and init used to write the TS configs beside the JSON ones, so `ultracite check` and `ultracite fix` stopped working. Init now moves the JSON config's settings into the TS config and deletes the JSON file:

- `rules`, `overrides`, `env`, `plugins` and other options become properties of the generated config.
- `ignorePatterns`, `settings` and `jsPlugins` are added to the ones Ultracite generates instead of replacing them.
- Ultracite `extends` entries become presets. Other `extends` paths can't be referenced from a TS config, so init names them in a warning.

A JSON config that doesn't parse is left in place, and neither file is written.

Re-running `ultracite init` also keeps what you added to `oxlint.config.ts` and `oxfmt.config.ts`: custom `rules`, `overrides`, `ignorePatterns`, `settings` and other properties, extra `extends` entries, your own imports and statements, and comments are carried over while the Ultracite parts are regenerated. Before, both files were regenerated from scratch. A config that doesn't parse is now left unchanged with a warning instead of being overwritten.

`ultracite doctor` now fails when a JSON config and a TS config for Oxlint or oxfmt sit side by side, and suggests running `init` to migrate a lone `.oxfmtrc.json`.
