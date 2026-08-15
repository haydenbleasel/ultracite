---
"ultracite": patch
---

Update the vendored `anti-slop` Oxlint plugin to upstream commit `446268e`, picking up fixes to `no-object-parameters` and `no-unknown-returns` (respect lexical type binders in alias resolution) and `no-runtime-typeof` (allow `typeof` checks in type guards).
