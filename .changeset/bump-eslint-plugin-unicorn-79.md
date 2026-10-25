---
"ultracite": patch
---

Update `eslint-plugin-unicorn` to 79. The ESLint preset turns on its two new rules, [`no-unnecessary-default-arguments`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-unnecessary-default-arguments.md) and [`no-repeated-call-wrappers`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-repeated-call-wrappers.md), like every other Unicorn rule. Unicorn 79 stopped [`no-top-level-side-effects`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-top-level-side-effects.md) from reporting unknown calls during module evaluation by default; the preset sets its new `checkUnknownCalls` option, so it keeps reporting them as it did with Unicorn 77. `prefer-ternary` and `prefer-minimal-ternary` now also merge branches that differ only in the callee or a computed member, such as `(test ? a : b)(value)`.

Unicorn 78 also reports code that contains comments, which many rules used to skip, and `prefer-default-parameters` now checks fallback expressions, so existing code can get new reports. Unicorn 79 turns autofixes that could change behaviour in rare cases into suggestions, in rules such as `prefer-spread` and `prefer-math-min-max`.
