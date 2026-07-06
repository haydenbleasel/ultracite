---
"ultracite": patch
---

Disable `sonarjs/no-implicit-dependencies` and `github/no-implicit-buggy-globals` in the oxlint and ESLint presets. Both produce false positives through oxlint's JS plugin bridge: `no-implicit-dependencies` has no dependency-manifest resolution so it flags builtin (`bun:test`) and workspace imports as missing dependencies, and `no-implicit-buggy-globals` misreads module-scoped declarations such as Astro frontmatter as implicit globals.
