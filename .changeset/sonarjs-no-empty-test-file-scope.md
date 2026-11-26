---
"ultracite": patch
---

`sonarjs/no-empty-test-file` no longer reports every source file with `eslint-plugin-sonarjs` 4.2.3 or later ([#885](https://github.com/haydenbleasel/ultracite/issues/885)). That release removed the rule's own check for test files and leaves picking them to SonarQube, which the standalone plugin doesn't have. The ESLint preset and the Oxlint JS plugins preset now turn the rule off everywhere and back on for files named `*.test.*`, `*.spec.*` and `*.cy.*`, the files the plugin checked before. Helpers and fixtures under `__tests__` and type-test files (`*.test-d.ts`) are still not reported.
