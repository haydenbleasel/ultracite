---
"ultracite": patch
---

`init --editors zed` with Oxlint now points you to the [Oxc extension](https://zed.dev/extensions/oxc), as it already did to Biome's, since Zed needs it to run Oxlint and Oxfmt. Zed's settings also stop asking for a `source.organizeImports.oxc` code action on save, which the Oxc extension doesn't provide; Oxfmt sorts imports when it formats.
