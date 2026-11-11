---
"ultracite": patch
---

Turn off `unicorn/consistent-arrow-return-style` in the ESLint core preset. It conflicts with `arrow-body-style`: a multi-line arrow function that only returns a value was reported by the Unicorn rule when written with a concise body and by `arrow-body-style` when written with a block, so no form passed, and `ultracite fix` switched between the two without settling. `arrow-body-style` stays on, as in the Oxlint preset.

`func-style` drops its `allowArrowFunctions: true` option in the Oxlint and ESLint core presets. The option does nothing with the `"expression"` style, so nothing is reported differently, and ESLint plans to reject the combination in its next major ([eslint/eslint#20689](https://github.com/eslint/eslint/issues/20689)).
