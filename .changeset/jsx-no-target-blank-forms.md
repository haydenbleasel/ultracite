---
"ultracite": patch
---

`react/jsx-no-target-blank` now checks forms as well as links (`forms: true`) in the Oxlint and ESLint React presets, as Biome's `noBlankTarget` already does. The rules file `init` writes for agents now says to add `rel="noopener noreferrer"` to `target="_blank"` links instead of `rel="noopener"`, which Oxlint and ESLint report because it still sends the referrer. It also says to avoid import cycles again, which the Oxlint and ESLint core presets report.
