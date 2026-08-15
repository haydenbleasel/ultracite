---
"ultracite": patch
---

Generate oxlint configs that enable a subset of the JS plugins via a new `selectJsPlugins` export from `ultracite/oxlint/js-plugins`, instead of inlining the filtering logic into the generated file. The inlined block contained a `typeof` check that user-side lint presets flagged (`anti-slop/no-runtime-typeof`, #770); the generated config is now a one-line extend, is emitted already formatted (including the previously missing blank line after imports), and re-running `ultracite init` migrates existing configs with the old inlined block automatically.
