---
"ultracite": patch
---

Zed's Oxlint settings no longer turn on type-aware linting by themselves. `init --editors zed` set `typeAware: true` for Oxlint's language server in every project, including ones without `oxlint-tsgolint` installed to run the type-aware rules. It now sets `typeAware: null`, so the language server follows `options.typeAware` in your Oxlint config, which `init --type-aware` sets. Re-running `init --editors zed` updates `.zed/settings.json`.
