---
"ultracite": patch
---

Update oxlint to 1.89.0 and `oxlint-tsgolint` to 7.0.2005. The releases add no rules, so the Oxlint presets are unchanged and the `oxlint` peer range stays at `^1.86.0`. Several rules now report cases they used to miss, so upgrading can surface new errors in existing code: `prefer-const` checks destructuring assignments inside blocks, `sort-keys` compares computed identifier keys, `no-param-reassign` reports writes to rest parameters, and `unicorn/prefer-string-replace-all` follows regexes stored in variables. `react/no-unescaped-entities`, `react/jsx-no-target-blank` and `unicorn/no-useless-switch-case` now offer suggestions. See the [1.87.0](https://github.com/oxc-project/oxc/releases/tag/oxlint_v1.87.0), [1.88.0](https://github.com/oxc-project/oxc/releases/tag/oxlint_v1.88.0) and [1.89.0](https://github.com/oxc-project/oxc/releases/tag/oxlint_v1.89.0) release notes for the full list.
