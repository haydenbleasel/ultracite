---
"ultracite": patch
---

Add optional peer ranges of `>=0.9.21 <1` for `eslint-plugin-react-doctor` and `oxlint-plugin-react-doctor`. The ESLint React preset and `ultracite/oxlint/js-plugins` turn on `react-doctor/forwarded-set-state-in-effect`, which older plugin releases don't have, so ESLint stopped with `Could not find "forwarded-set-state-in-effect" in plugin "react-doctor"` and Oxlint with `Rule 'forwarded-set-state-in-effect' not found in plugin 'react-doctor'` when only `ultracite` was upgraded. Your package manager now flags an older plugin, and `ultracite doctor` fails on one and points at `ultracite upgrade`, which reinstalls it at 0.9.21.

Requires eslint-plugin-react-doctor >= 0.9.21 and oxlint-plugin-react-doctor >= 0.9.21, when installed
