---
"ultracite": major
---

`ultracite init` and `upgrade` now install `oxlint`, `oxfmt` and `oxlint-tsgolint` at the versions the presets were checked against, as they already did for Biome, instead of the latest release. `oxfmt` is still before 1.0, so a new release could change how files are formatted the next time you ran `upgrade`, and a new `oxlint` major could fall outside the supported range. The peer ranges are tightened to match, so `ultracite doctor` flags an `oxfmt` the presets weren't checked against.

Requires oxfmt >= 0.71.0 and < 1.0.0 Requires prettier >= 3.5.3 (the version `prettier-plugin-astro` needs)
