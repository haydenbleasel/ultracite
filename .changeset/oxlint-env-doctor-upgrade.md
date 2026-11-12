---
"ultracite": patch
---

`ultracite doctor` now warns when an `oxlint.config.ts` extends the core preset without setting `env`, and `ultracite upgrade` adds it. Oxlint doesn't inherit `env` through `extends` ([oxc-project/oxc#20087](https://github.com/oxc-project/oxc/issues/20087)), so a config `init` wrote before 8.0.1 lints without the browser and Node globals, and `no-implied-eval` misses `setTimeout("code")` and `no-eval` misses `window.eval`, with nothing to say so. `upgrade` makes the change through the same update `init` runs, so the rest of the config is kept as written. A project that still has an `.oxlintrc.json`, or a config `init` can't update, is left for `ultracite init`.
