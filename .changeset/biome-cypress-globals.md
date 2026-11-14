---
"ultracite": patch
---

The Biome `cypress` preset now declares the globals Cypress injects: `cy`, `Cypress`, and the Mocha and Chai ones (`describe`, `it`, `beforeEach`, `expect`, and the rest). The preset was empty, so `noUndeclaredVariables` reported every one of them in each `*.cy.*` spec and each file under `cypress/`. The ESLint preset already declared them.
