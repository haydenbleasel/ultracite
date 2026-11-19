---
"ultracite": patch
---

Update Oxlint to 1.94.0 and `oxlint-tsgolint` to 7.0.2007, and turn `unicorn/prefer-export-from` back on in the Oxlint core preset.

The rule was off because its fix, applied by `ultracite fix --unsafe`, dropped an export when one `export { a, b }` list re-exported names from two modules. Oxlint 1.94.0 no longer offers the fix in that case ([oxc-project/oxc#29318](https://github.com/oxc-project/oxc/issues/29318)), so the rule reports again and the ESLint and Oxlint presets agree.

Oxlint 1.94.0 also fixes three things we reported while measuring the presets: plain `--fix` no longer adds an empty dependency array to a `useMemo` or `useCallback` that has none, `func-style` reports a function that shares its name with a type, and `jsx-a11y/lang` no longer repeats `html-has-lang`'s report on a missing `lang`. The JSX accessibility rules that look at event handlers now match lowercase `onclick`, as Solid allows; Solid's `on:click` and Qwik's `onClick$` are still not seen.

Several fixes that plain `ultracite fix` used to apply are now suggestions, which run only with `--unsafe`, among them `no-useless-escape`, `no-useless-undefined`, `prefer-ts-expect-error` and `no-import-type-side-effects`.

Requires oxlint >= 1.94.0
