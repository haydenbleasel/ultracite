---
"ultracite": patch
---

Replace the hand-rolled upward directory walks in `findNearestFile` and `detectLinter` with the empathic library's `find.any`, which checks candidate names in order within each directory before moving to the parent — the same per-directory precedence the previous implementation enforced manually.
