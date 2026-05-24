---
"ultracite": patch
---

Recognize `.biome.json` and `.biome.jsonc` as valid Biome config files across the CLI. `detectLinter`, the `doctor` command, and the Biome config resolver now match the dot-prefixed names alongside `biome.json`/`biome.jsonc`, following Biome's [documented configuration file resolution order](https://biomejs.dev/guides/configure-biome/#configuration-file-resolution). Closes #700.
