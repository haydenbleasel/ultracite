---
"ultracite": patch
---

Update oxlint to 1.76.0 and oxfmt to 0.61.0. New stable rules added to the presets: `oxc/bad-match-all-arg`, `id-denylist`, `node/exports-style` (core), `react/function-component-definition` with arrow-function components (react), and `vitest/padding-around-test-blocks` (vitest). `node/no-top-level-await` is off — top-level await is idiomatic in ESM, Astro frontmatter, and build scripts — and the ESLint preset's `n/no-top-level-await` is now off to match. No rules were removed or promoted out of nursery.
