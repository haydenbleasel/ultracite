---
"ultracite": patch
---

The `vitest` presets for Oxlint and ESLint no longer run `vitest/prefer-importing-vitest-globals`. The rule treats a `test` or `expect` imported from anywhere but `vitest` as a global, and its fix adds `import { expect, test } from "vitest"` above the existing import. The presets cover every `*.test.*` and `*.spec.*` file, so in a project that uses Vitest for unit tests and Playwright for end-to-end tests, `ultracite fix` rewrote each Playwright spec into a file that declares `expect` and `test` twice and no longer parses. Files importing from `bun:test` and `node:test` were reported the same way. If a previous `fix` added the import, delete it.
