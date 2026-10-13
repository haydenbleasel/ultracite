---
"ultracite": patch
---

The `oxlint.config.ts` that `ultracite init` writes now sets `env: core.env`. Oxlint doesn't carry `env` through `extends`, so the browser globals the core preset declares never reached projects, and rules that depend on them stayed quiet: `no-implied-eval` didn't report `setTimeout("…")` or `setInterval("…")`, and `no-eval` didn't report `window.eval(…)`. Workspace configs written by `init` now repeat `env: root.env` alongside `ignorePatterns` and `settings`, and an `.oxlintrc.json` that `init` migrates keeps its `env` on top of core's. Re-run `ultracite init` to update an existing config, or add `env: core.env` to it yourself.
