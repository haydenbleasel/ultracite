---
"ultracite": patch
---

`ultracite init` keeps `core` first and `anti-slop` last in the `extends` of an existing `oxlint.config.ts`, whatever order its imports are in. It used to rebuild `extends` in import order, so once `ultracite fix` had sorted the imports, re-running `init` put `antiSlop` (and presets such as `angular` and `astro`) ahead of `core`, which then turned back on the rules Anti-Slop turns off.
