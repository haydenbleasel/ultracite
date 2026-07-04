---
"ultracite": minor
---

Upgrade the ESLint plugin suite and enable the new rules that ship with it. Notable bumps: `eslint-plugin-unicorn` 64 → 70 (adds a large batch of new correctness and quality rules), `eslint-plugin-astro` 1 → 2 (adds `no-omitted-end-tags`, now requires ESLint 10), `eslint-plugin-sonarjs` 4.0 → 4.1 (adds test-assertion and ReDoS rules like `super-linear-regex`), `eslint-plugin-svelte` 3.19 → 3.20 (adds `no-at-const-tags`), plus `@typescript-eslint`, `eslint-plugin-import-x`, `eslint-plugin-n`, `@vitest/eslint-plugin`, and others. Two Unicorn rules that were renamed are re-mapped in the config (`prefer-dom-node-dataset` → `dom-node-dataset`, `prevent-abbreviations` → `name-replacements`). Two new Unicorn rules are disabled: `prefer-temporal` (since `Temporal` still lacks broad runtime support) and `no-asterisk-prefix-in-documentation-comments` (it fights the conventional JSDoc comment style).
