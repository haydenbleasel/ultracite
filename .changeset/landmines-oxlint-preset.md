---
"ultracite": minor
---

Add an opt-in `ultracite/oxlint/landmines` preset for [`@interfere/landmines`](https://github.com/interfere-inc/landmines), Oxlint rules for the shortcuts a coding agent takes to get a green check. All ten rules run at `error`: `no-test-doubles`, `strict-msw`, `no-fixed-sleep`, `no-unsignaled-poll` and `no-flake-masking` for tests, plus `no-comments`, `colocated-tests`, `test-file-names`, `package-exports` and `no-explicit-return-types`. Enable it with `ultracite init --linter oxlint --js-plugins @interfere/landmines`, or extend it alongside `ultracite/oxlint/core` after installing `@interfere/landmines`. `doctor` and `upgrade` check and reinstall the package for configs that load it.

The preset is Oxlint-only. Its `no-comments` rule rejects the `SAFETY:` comment that `anti-slop/require-safety-comment-for-type-assertion` requires ([interfere-inc/landmines#4](https://github.com/interfere-inc/landmines/issues/4)), so turn one of the two off when extending both presets.
