---
"ultracite": patch
---

Update oxlint to 1.81.0. The 1.80 and 1.81 releases add no rules and remove none, so the presets are unchanged and the peer range stays at ^1.79.0. Notable fixes carried in: `no-use-before-define` now runs on JS and JSX files, `object-shorthand` preserves `__proto__` semantics, `unicorn/prefer-math-min-max` no longer applies an unsafe autofix, and JS plugin diagnostics with invalid or reversed locations are clamped instead of crashing.
