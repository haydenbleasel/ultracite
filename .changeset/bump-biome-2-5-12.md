---
"ultracite": patch
---

Update `@biomejs/biome` to 2.5.12. Releases 2.5.10 through 2.5.12 only add nursery rules, which the Biome presets exclude, so the presets are unchanged. The releases also carry linter and formatter fixes, including fewer `noUnusedVariables` false positives on merged interfaces, namespaces, and overload type parameters, an unsafe-by-default fix for `noThisInStatic`, and a large batch of Astro expression parsing fixes.
