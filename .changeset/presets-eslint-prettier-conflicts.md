---
"ultracite": patch
---

The ESLint core preset no longer re-enables formatting rules that `eslint-config-prettier` turns off. The unicorn rule set was spread after `eslint-config-prettier`, which switched `unicorn/number-literal-case`, `unicorn/template-indent` and `unicorn/empty-brace-spaces` back on. `unicorn/number-literal-case` demands `0xABCD` while Prettier prints `0xabcd`, so `prettier/prettier` and the unicorn rule reported every hex literal and `eslint --fix` could not satisfy both. `eslint-config-prettier` now applies after every plugin, so `unicorn/number-literal-case` and `unicorn/template-indent` are off. `unicorn/empty-brace-spaces` stays on (Prettier prints empty braces as `{}` too), matching the Oxlint preset.
