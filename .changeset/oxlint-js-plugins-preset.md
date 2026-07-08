---
"ultracite": patch
---

Move every JS-plugin-based rule set out of the Oxlint core and framework presets and into a single opt-in `ultracite/oxlint/js-plugins` preset. This covers `eslint-plugin-github` and `eslint-plugin-sonarjs` (previously in core) as well as `oxlint-plugin-react-doctor` (previously bundled into the `react`, `next`, and `tanstack` presets). The core, `react`, `next`, and `tanstack` presets now run entirely on Oxlint's native Rust rules, so new setups no longer install those dependencies and no longer pay the slower JS-plugin lint pass. To keep the extra ESLint-parity and React Doctor rules, install `eslint-plugin-github`, `eslint-plugin-sonarjs`, and `oxlint-plugin-react-doctor` and extend `ultracite/oxlint/js-plugins` alongside `core` (and your framework preset).
