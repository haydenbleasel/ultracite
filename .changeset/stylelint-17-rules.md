---
"ultracite": patch
---

Enable three rules added in Stylelint 17 in the Stylelint preset: `selector-no-deprecated` and `selector-no-invalid` report selectors that CSS has dropped or that cannot parse, and `relative-selector-nesting-notation` is set to `explicit`, so nested relative selectors are written `& > b` rather than `> b`. The `property-layout-mappings`, `unit-layout-mappings` and `value-keyword-layout-mappings` rules are deliberately left off, since they reject every physical property, unit and keyword and can only autofix with a per-project `languageOptions.directionality` setting. The repo's own Stylelint lock is refreshed from 16.26.1 to 17.14.1, which the config packages already required; `ultracite init` already installs `stylelint@latest` so users are unaffected by the lock change.
