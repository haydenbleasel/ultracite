---
"ultracite": patch
---

Type `jsPlugins` as a non-null array on the Oxlint presets that always ship plugins (`js-plugins`, `shadcn`, `anti-slop`, `next/js-plugins`, `tanstack/js-plugins`) and on `selectJsPlugins()`'s return value, so spreading several of them into a root `jsPlugins` array typechecks.
