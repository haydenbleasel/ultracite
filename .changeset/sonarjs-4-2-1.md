---
"ultracite": patch
---

Update `eslint-plugin-sonarjs` to 4.2.1. The ESLint preset adopts its 16 new rules automatically (Vue, Cypress, Playwright, Testing Library, Vitest, Lodash, jQuery and Axios checks). The `ultracite/oxlint/js-plugins` preset now enables every sonarjs rule that does not need type information, adding 35 rules. These include the 15 new non-type-aware rules and nine test rules that older versions of oxlint's JS plugin bridge could not load. sonarjs 4.2.1 also raised the `no-nested-functions` default threshold from 4 to 5; both presets pin `threshold: 4` to keep the previous strictness.
