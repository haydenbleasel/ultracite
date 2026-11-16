---
"ultracite": patch
---

`ultracite init`, `doctor` and `upgrade` now read an Oxlint JS plugin selection written with single quotes, such as `selectJsPlugins(['sonarjs', 'github'])`. Only double-quoted names were recognised, so in a project whose formatter uses single quotes the selection read as empty: running `init` again removed the JS plugins from `oxlint.config.ts`, and `doctor` and `upgrade` skipped their packages. A legacy config with single-quoted preset names in a string `extends` array is read the same way.
