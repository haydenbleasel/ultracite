---
"ultracite": major
---

`ultracite init` and `upgrade` now install `oxlint`, `oxfmt` and `oxlint-tsgolint` within caret ranges of the versions the presets were checked against (`^1.86.0`, `^0.71.0` and `^7.0.2004`), instead of the latest release. Biome is still installed at the exact version. `oxfmt` is still before 1.0, so its caret range holds the minor version: a new `oxfmt` minor can no longer change how files are formatted the next time you run `upgrade`, and a new `oxlint` major can no longer fall outside the supported range. The `oxfmt` peer range is now `>=0.71.0 <1`, so `ultracite doctor` fails on an `oxfmt` older than 0.71.0 and warns on 1.0 or later.

Requires oxfmt >= 0.71.0 and < 1.0.0

Requires prettier >= 3.5.3 (the version `prettier-plugin-astro` needs)
