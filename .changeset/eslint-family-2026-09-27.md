---
"ultracite": patch
---

Update the ESLint family: `eslint` 10.11, `eslint-plugin-unicorn` 76, `@typescript-eslint/*` 8.70.1, `eslint-plugin-jsdoc` 64.5, `eslint-plugin-astro` 3.2, `eslint-plugin-n` 18.4, `eslint-plugin-vue` 10.11.1, `@tanstack/eslint-plugin-query` 5.104, `@next/eslint-plugin-next` 16.3.6, `@darraghor/eslint-plugin-nestjs-typed` 7.5.6, `eslint-plugin-qwik` 1.20.1, `eslint-plugin-html` 8.2.1 and `eslint-plugin-react-doctor` / `oxlint-plugin-react-doctor` 0.9.14.

The ESLint core preset picks up unicorn's ten new JavaScript rules automatically: `no-async-iterator-callback`, `no-unused-builtin-method-return` (which replaces the now-deprecated `no-unused-array-method-return`), `no-unused-iterator-helper`, `no-useless-set-construction`, `no-using-resource-escape`, `prefer-combined-guards`, `prefer-iterator-zip`, `prefer-json-import`, `prefer-temporal-conversion` and `prefer-uint8array-hex`. The CSS-only unicorn rules added in v75 stay off for JavaScript files. unicorn 76 makes `no-immediate-mutation` skip conditional mutations and `no-break-in-nested-loop` skip `continue` by default; the preset keeps those defaults because oxlint's `no-immediate-mutation` behaves the same way and checking `continue` would contradict `prefer-continue`.
