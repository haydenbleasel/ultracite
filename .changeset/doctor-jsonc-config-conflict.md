---
"ultracite": patch
---

`ultracite doctor` now gives the right advice when a `.oxlintrc.jsonc` or `.oxfmtrc.jsonc` sits next to the TypeScript config. It told you to delete one of the two files, where for a `.json` file it says to run `ultracite init`, which migrates the JSON config into the TypeScript one. `init` migrates `.jsonc` files the same way, so `doctor` now says so. When three config files are present, the message also reads "are all present" instead of "are both present".
