---
"ultracite": patch
---

Add performance benchmarks for `ultracite check` / `ultracite fix` across all three providers (oxlint, biome, eslint). A new CI job builds the PR and its base branch on the same runner, benchmarks them interleaved, and fails on a statistically significant regression (median ratio > 1.25x with Mann-Whitney U p < 0.05) so config changes can't silently slow the linters down again.
