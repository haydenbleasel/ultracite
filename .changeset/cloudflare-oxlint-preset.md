---
"ultracite": minor
---

Add [Cloudflare's Oxlint preset](https://github.com/cloudflare/oxlint-config) as an opt-in. Select `@cloudflare/oxlint-config` in the Oxlint JS plugins prompt or pass it to `init --js-plugins`, and the generated config extends it after `core` and before the framework presets.

The preset turns on Oxlint's type-aware mode itself, so choosing it sets up type-aware linting as `--type-aware` does: `init` installs `oxlint-tsgolint` and turns on `strictNullChecks`. `doctor` and `upgrade` track the preset's version.

Requires `@cloudflare/oxlint-config` >= 0.2.0, the first release that doesn't require `tsrs`.
