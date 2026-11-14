---
"ultracite": patch
---

`ultracite doctor` now fails a `biome.json` or `biome.jsonc` that has a syntax error. It read the file with a parser that recovers from errors, so a truncated config that still listed `ultracite/biome/core` passed with "Everything looks good!" while `ultracite check` failed with "Biome exited because the configuration resulted in errors".
