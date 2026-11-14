---
"ultracite": patch
---

The type declarations for `ultracite/oxfmt` and the `ultracite/oxlint/*` presets now describe what each preset sets, instead of the generic `OxfmtConfig` or `OxlintConfig`, where every field is optional. A config that spreads a preset's fields now type-checks, such as `sortTailwindcss: { ...ultracite.sortTailwindcss, stylesheet: "./app/globals.css" }` in `oxfmt.config.ts`, or `overrides: [...core.overrides, ...]` and `plugins: [...core.plugins, ...react.plugins]` in `oxlint.config.ts`. `selectJsPlugins()` from `ultracite/oxlint/js-plugins` now declares the `overrides`, `rules` and `settings` it returns as always set, as it already did `jsPlugins`.

Because the types are exact, two kinds of code that used to type-check now report errors: reading a field a preset doesn't set, such as `react.overrides`, and looking up a rule the preset doesn't list, such as `core.rules["eslint/no-console"]` (core lists it as `no-console`). The field is `undefined` at runtime, and the rule usually lives in another preset or under another name. The types are checked with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` on, so configs that use those options type-check as well.
