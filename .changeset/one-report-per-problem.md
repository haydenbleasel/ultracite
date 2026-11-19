---
"ultracite": patch
---

Three changes to what the Oxlint and ESLint presets report, each removing a report that had no good way to clear it.

`consistent-type-imports` no longer reports `import()` type annotations. `typeof import("./module")` is the only way to type a lazily or conditionally loaded module without loading it, and the report had no fix. An import that is only used as a type is still reported and still rewritten to `import type`.

On ESLint, `ultracite fix` now writes a leaked `&&` in JSX as `{!!count && <List />}` instead of `{count ? <List /> : null}`. `react/jsx-no-leaked-render` is set to prefer the coercion, because its ternary fix turned `{count && (a ? <b /> : <i />)}` into a nested ternary, which `no-nested-ternary` then reported with no fix.

Three rules that reported a problem another rule already reports are off, so each problem is reported once:

- `no-negated-condition` is off in the Oxlint and ESLint presets. `unicorn/no-negated-condition` reports the same conditions at the same position and has a fix.
- `sonarjs/no-nested-conditional` is off in the ESLint preset and the Oxlint JS plugins preset. `no-nested-ternary` reports the same nesting. The SonarJS rule also reported a ternary nested through a template literal or a call argument, as in ``a ? `x${b ? 1 : 2}` : "z"``, and nothing reports that now.
- `unicorn/no-useless-else` is off in the ESLint preset. `no-else-return` reports the same `else`, and the Unicorn rule's fix flattened an `else if` chain into separate guards, which the Oxlint preset keeps. Its reports on an `else` after `throw`, `break` or `continue` go with it, since `no-else-return` only looks at `return`.
