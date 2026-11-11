---
"ultracite": patch
---

`ultracite doctor` now checks the versions of the lint plugins your config loads, not only the linter and formatter. Each rule plugin of the Ultracite presets your `eslint.config.*` imports, and each Oxlint JS plugin your `oxlint.config.ts` loads, has to satisfy the range this release installs it at. A plugin that's older than that range, or that your config loads but isn't installed, fails the check and points at `ultracite upgrade`, and one that's newer warns. Plugins your config doesn't load are left alone, even when another package (such as the `react-doctor` CLI) installed them.

This catches a crash that `doctor` used to miss. The ESLint React preset and `ultracite/oxlint/js-plugins` turn on `react-doctor/forwarded-set-state-in-effect`, which React Doctor added in 0.9.21, so a project that bumped only `ultracite` and kept an older React Doctor plugin saw ESLint stop with `Could not find "forwarded-set-state-in-effect" in plugin "react-doctor"` and Oxlint with `Rule 'forwarded-set-state-in-effect' not found in plugin 'react-doctor'`, while `doctor` passed. For `eslint-plugin-react-doctor`, `doctor` also checks the `oxlint-plugin-react-doctor` it takes its rules from, which only differs when an override or resolution pins it.

`ultracite upgrade` now also reinstalls the Oxlint JS plugins your config loads when `package.json` doesn't list them, so it can fix every plugin `doctor` flags.
