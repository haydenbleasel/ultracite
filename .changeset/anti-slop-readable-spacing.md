---
"ultracite": patch
---

Update the vendored `anti-slop` Oxlint plugin to upstream commit `c44ef22` and enable its three new rules in the `ultracite/oxlint/anti-slop` preset. `require-readable-spacing` restores blank lines around structural boundaries — top-level declarations, multiline bindings, control flow, returns, and blocks — a pattern AI-generated code tends to pack together; its autofix only inserts whitespace and never removes existing blank lines, so `ultracite fix` restores the spacing without fighting the formatter. `no-array-filter-map` rejects adjacent eager `filter`/`map` passes over arrays, and `no-reduce-accumulator-copy` rejects reducers that copy their accumulator on every iteration. Expect a one-time whitespace-only diff from `ultracite fix` after upgrading if you extend the preset (#803).
