---
"ultracite": patch
---

Update `eslint-plugin-unicorn` to 80. It needs Node.js 22.13, which is below the Node.js version Ultracite already asks for. The ESLint preset turns on its three new rules, like every other Unicorn rule:

- [`unicorn/require-spread-parentheses`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/require-spread-parentheses.md) asks for `{...(enabled && overrides)}` instead of `{...enabled && overrides}`. Prettier and Oxfmt already print the parentheses, so formatted code doesn't change.
- [`unicorn/prefer-regexp-exec`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-regexp-exec.md) reports `text.match(/uni(corn)/)` on a string it can recognise without type information and fixes it to `/uni(corn)/.exec(text)`. A regex with the `g` flag is left alone.
- [`unicorn/prefer-options-parameter`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-options-parameter.md) reports optional positional parameters that could be properties of an options object, as in `run(input, verbose = false, options = {})`. The preset also sets its `checkWithoutOptionsObject` option, so two or more trailing optional parameters are reported when the function has no options object yet, as in `clamp(value, minimum = 0, maximum = 1)`. It has no fix, so expect new errors to work through by hand.

Unicorn 80 took `no-async-promise-finally` out of its recommended config. The preset turns on every Unicorn rule, so it stays on. `prefer-ternary`'s new `checkNestedTernaries` option stays off, because it asks for the nested ternary that `no-nested-ternary` reports.

Rules that were already on report more: `no-useless-coercion` reports a redundant `!!`, `no-unnecessary-default-arguments` checks generic functions, `prefer-json-import` reports JSON loaded through `createRequire()` and fixes it, `prefer-simplified-conditions` factors comparisons with any operator, and `no-async-iterator-callback` and `no-async-promise-finally` follow a callback held in a `let` or `var` that is never reassigned. Others report less: `no-useless-undefined` ignores `return undefined` in a getter, `prefer-module` ignores `.cts` files and `prefer-math-min-max` only reports comparisons of known numbers in TypeScript. See the [release notes](https://github.com/sindresorhus/eslint-plugin-unicorn/releases/tag/v80.0.0).
