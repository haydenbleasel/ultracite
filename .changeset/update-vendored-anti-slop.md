---
"ultracite": patch
---

Update the vendored `anti-slop` Oxlint plugin to upstream commit `446268e`, picking up fixes to `no-object-parameters` and `no-unknown-returns` (respect lexical type binders in alias resolution) and a new `allowInTypeGuards` option on `no-runtime-typeof`. The `ultracite/oxlint/anti-slop` preset enables `allowInTypeGuards`, so `typeof` checks inside type predicate functions (`(x): x is T`) no longer need disable comments — predicates are the named-boundary pattern the rule pushes toward (dmmulroy/anti-slop#10).
