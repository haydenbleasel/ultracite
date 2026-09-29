---
"ultracite": patch
---

The Biome `jest` preset now declares Jest's globals (`describe`, `it`, `test`, `expect`, `jest`, `beforeEach` and the rest of `globals.jest`) for test files. Jest injects them without imports, so `noUndeclaredVariables` from the core preset reported every one of them in idiomatic Jest tests. The ESLint `jest` preset already declared them.

The route-file exemptions in the Biome `remix` and `tanstack` presets (`useFilenamingConvention` off in `routes/`) now cover `.js` and `.jsx` route files as well as `.ts` and `.tsx`.
