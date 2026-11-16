---
"ultracite": patch
---

`ultracite fix --claude` and `fix --codex` on Biome now ask `biome explain` about each rule once. A rule Biome couldn't describe was not remembered, so `biome explain` ran again for every diagnostic of that rule, which slowed down a run with many of them.
