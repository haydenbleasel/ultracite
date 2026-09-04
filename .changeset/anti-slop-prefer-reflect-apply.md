---
"ultracite": patch
---

Turn off `unicorn/prefer-reflect-apply` in the `ultracite/oxlint/anti-slop` preset. When extended after `ultracite/oxlint/core`, the core rule recommended rewriting `Function#apply()` to `Reflect.apply()`, which anti-slop's `no-reflect-apply` then rejected, leaving no way to satisfy both. Direct-call guidance for `.apply()` still comes from `eslint/prefer-spread` and `eslint/no-useless-call`.
