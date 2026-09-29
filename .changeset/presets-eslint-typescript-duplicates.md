---
"ultracite": patch
---

The ESLint core preset no longer reports the same problem two or three times on TypeScript files, and no longer flags ambient type-only globals.

- `no-undef` and `sonarjs/no-reference-error` are off for `.ts`, `.tsx`, `.mts` and `.cts` files. TypeScript already reports unresolved identifiers, and both rules flagged valid ambient types such as `NodeJS.Timeout` (see the [typescript-eslint FAQ](https://typescript-eslint.io/troubleshooting/faqs/eslint#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors)).
- The base `class-methods-use-this`, `consistent-return`, `no-unused-private-class-members`, `prefer-destructuring` and `prefer-promise-reject-errors` rules are off for TypeScript files, because their `@typescript-eslint` extension rules are enabled there. The base rules duplicated every report and ignored the extensions' TypeScript-aware options.
- `unused-imports/no-unused-vars` is off. It is a copy of `no-unused-vars` / `@typescript-eslint/no-unused-vars`, which stay on as in the Oxlint preset, so every unused variable was reported twice. `unused-imports/no-unused-imports` stays on for its autofix.
- `@typescript-eslint/max-params` is off, matching `max-params` being off in the core presets. It was on with its default limit of 3 parameters for TypeScript files only.
