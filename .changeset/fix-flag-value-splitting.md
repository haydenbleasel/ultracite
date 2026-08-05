---
"ultracite": patch
---

Fix `ultracite check`/`fix` misrouting space-separated flag values (e.g. `--max-warnings 10`) into the file list, which scrambled the underlying linter invocation and made formatters fail on bogus targets. Positional files listed before a `--` separator are also kept as lint targets instead of being reclassified as passthrough, which could silently widen formatter runs to the whole project.
