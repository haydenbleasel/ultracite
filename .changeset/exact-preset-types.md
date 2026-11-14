---
"ultracite": major
---

The type declarations for `ultracite/oxfmt` and the `ultracite/oxlint/*` presets now describe what each preset sets, instead of the generic `OxfmtConfig` or `OxlintConfig`, where every field is optional. A config that spreads a preset's fields now type-checks, such as `sortTailwindcss: { ...ultracite.sortTailwindcss, stylesheet: "./app/globals.css" }` in `oxfmt.config.ts`, or `overrides: [...core.overrides, ...]` and `plugins: [...core.plugins, ...react.plugins]` in `oxlint.config.ts`. `selectJsPlugins()` from `ultracite/oxlint/js-plugins` now declares the `overrides`, `rules` and `settings` it returns as always set, as it already did `jsPlugins`.

Because the types are exact, an `oxlint.config.ts` or `oxfmt.config.ts` that used to type-check can now report errors. Each field is typed as the value the preset sets, so these are the usual cases:

- Reading a field a preset doesn't set, such as `react.overrides`, or looking up a rule it doesn't list, such as `core.rules["eslint/no-console"]` (core lists it as `no-console`). The field is `undefined` at runtime, and the rule usually lives in another preset or under another name.
- Comparing a field with a value the preset doesn't give it, such as `core.rules.curly === "off"`, which TypeScript reports as a comparison that's never true, since `curly` is typed `"error"`.
- Changing a preset's values in place, on the preset or on a copy made by spreading it. `core.rules.curly = "off"` fails because `curly` is typed `"error"`, `core.env.node = true` because `env` is typed `{ browser: true }`, `core.plugins.push("react")` because `plugins` only takes the plugins core lists, and `core.overrides.push({ files, rules: { curly: "off" } })` because each override is typed as one core sets. On Oxfmt, after `const base = { ...ultracite }`, `base.semi = false` fails because `semi` is typed `true`, and `ultracite.sortTailwindcss.stylesheet = "./app/globals.css"` fails because the preset doesn't set `stylesheet`.

To change what a preset sets, write the new value in your own config object, spreading the preset's value where you want to keep the rest of it: `rules: { curly: "off" }` beside `extends: [core]`, `env: { ...core.env, node: true }`, `plugins: [...core.plugins, "react"]`, `overrides: [...core.overrides, { files: ["src/**"], rules: { curly: "off" } }]`, or `defineConfig({ ...ultracite, semi: false })` in `oxfmt.config.ts`. A config you build up in a variable can give it the wider type instead, such as `const base: OxfmtConfig = { ...ultracite }` with `OxfmtConfig` from `oxfmt`, or `OxlintConfig` from `oxlint`.

The types are checked with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` on, so configs that use those options type-check as well.
