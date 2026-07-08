---
"ultracite": patch
---

Move the `eslint-plugin-github` and `eslint-plugin-sonarjs` rules out of the Oxlint core preset and into a new opt-in `ultracite/oxlint/js-plugins` preset. The core preset now runs entirely on Oxlint's native Rust rules, so new Oxlint setups no longer install those two dependencies and no longer pay the slower JS-plugin lint pass. To keep the extra ESLint-parity rules, install `eslint-plugin-github` and `eslint-plugin-sonarjs` and extend `ultracite/oxlint/js-plugins` alongside `core`.
