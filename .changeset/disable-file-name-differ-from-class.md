---
"ultracite": patch
---

Disable `sonarjs/file-name-differ-from-class` in the oxlint and ESLint presets. It fires on any file whose name differs from an exported class, which is noise for the many config and module files that export objects rather than classes.
