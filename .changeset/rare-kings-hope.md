---
"ultracite": patch
---

Add Vitest type-test files (`**/*.{test-d,spec-d}.{ts,tsx,js,jsx}`) to the test-file globs so the shared test relaxations and the Vitest rule overrides apply to them, and enable the Vitest plugin's `typecheck` setting in the ESLint preset so `expectTypeOf`/`assertType` count as assertions.
