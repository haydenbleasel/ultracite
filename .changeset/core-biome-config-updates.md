---
"ultracite": patch
---

`ultracite init` no longer wipes an existing Biome config it can't read. Previously a `biome.json` or `biome.jsonc` with a syntax error, or a nested monorepo config with `"extends": "//"`, was treated as empty and replaced with just the Ultracite `extends`, losing every other setting. Now:

- A config with a syntax error is left unchanged, with a warning asking you to fix it and re-run `init`.
- A nested config that extends the root config (`"extends": "//"`) is left unchanged, since the Ultracite presets belong in the root config.
- A string `extends` is turned into a list that also includes the Ultracite presets.
- Updates edit the file in place, so comments and formatting in `biome.jsonc` are preserved.

`ultracite doctor` and the `check`/`fix` resolution check now follow a nested config that extends `"//"` to the root config, instead of warning that the nested config doesn't extend `ultracite/biome/core`.
