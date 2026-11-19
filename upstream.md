# Upstream issues

Issues and pull requests we've opened on the tools Ultracite depends on. It covers what we filed ourselves; rules that are off or missing until a release lands, whoever reported the cause, are in the "Rules waiting on a release" table in `AGENTS.md`.

Keeping it current:

- Add a row to "Open" in the same change that files an issue or pull request upstream.
- On every toolchain bump, check each open row (`gh issue view <n> -R <owner>/<repo> --json state,stateReason`). When one closes, do what its "When it lands" cell says, then move the row to "Closed" with the outcome.
- A fix that is merged but not released stays in "Open", with the pull request noted, until a release we can install has it.

Last checked against GitHub: 2026-11-18.

## Open

| Issue | Opened | What's wrong | When it lands |
| --- | --- | --- | --- |
| [oxc-project/oxc#29318](https://github.com/oxc-project/oxc/issues/29318) | 2026-11-12 | The `unicorn/prefer-export-from` fix dropped an export when two imports share one `export { }` list. Oxlint 1.94.0 stopped offering the fix in that case ([#29574](https://github.com/oxc-project/oxc/pull/29574)), so the rule is back on. The issue stays open for a fix that keeps the other names ([#29716](https://github.com/oxc-project/oxc/pull/29716)). | Nothing more to change. |
| [oxc-project/oxc#29322](https://github.com/oxc-project/oxc/issues/29322) | 2026-11-12 | The `eslint/sort-keys` fix moves a `//` comment in front of the closing brace, so the file no longer parses. | Nothing to change: `sort-keys` is off in core for other reasons. |
| [oxc-project/oxc#29323](https://github.com/oxc-project/oxc/issues/29323) | 2026-11-12 | The `jsx-a11y/interactive-supports-focus` suggestion adds `tabIndex={0}` to an element with no key handler. | Nothing recorded in the presets. |
| [oxc-project/oxc#29332](https://github.com/oxc-project/oxc/issues/29332) | 2026-11-12 | The jsx-a11y handler rules don't see Solid's `on:click` or Qwik's `onClick$`, so they are on and silent on those forms. Lowercase `onclick` is matched from Oxlint 1.94.0 ([#29570](https://github.com/oxc-project/oxc/pull/29570)). | A test in `oxlint-config.test.ts` fails. Follow the Qwik and Solid rows in `AGENTS.md`. |
| [jsx-eslint/eslint-plugin-jsx-a11y#1108](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1108) | 2026-11-12 | The ESLint side of the same gap: the handler rules don't see Qwik's `onClick$` or Solid's `on:click`. | The Qwik fixture in `eslint-smoke.ts` fails. Follow the same rows in `AGENTS.md`. |
| [biomejs/biome#13106](https://github.com/biomejs/biome/issues/13106) | 2026-11-12 | `--unsafe` never terminates: `useAriaActivedescendantWithTabindex` and `noNoninteractiveTabindex` undo each other's fix. Confirmed as a bug; a fix that detects fix loops is in review ([#13188](https://github.com/biomejs/biome/pull/13188)). | Nothing recorded in the presets. |
| [biomejs/biome#13108](https://github.com/biomejs/biome/issues/13108) | 2026-11-12 | `noUnusedExpressions` reports `x satisfies never;`, the usual exhaustiveness check. Confirmed as a bug; a fix is in review ([#13160](https://github.com/biomejs/biome/pull/13160)). | Nothing recorded in the presets. |
| [biomejs/biome#13109](https://github.com/biomejs/biome/issues/13109) | 2026-11-12 | The `useValidAriaProps` unsafe fix deletes a misspelled `aria-*` attribute instead of suggesting the right name. A maintainer called it working as intended and relabelled it a feature request. | Nothing recorded in the presets. |
| [biomejs/biome#13110](https://github.com/biomejs/biome/issues/13110) | 2026-11-12 | `useExhaustiveDependencies` asks for an Effect Event as a dependency when `useEffectEvent` isn't imported from `react`. | Nothing recorded in the presets. |
| [un-ts/eslint-plugin-import-x#641](https://github.com/un-ts/eslint-plugin-import-x/issues/641) | 2026-11-18 | The `import-x/no-duplicates` fix and `@typescript-eslint/consistent-type-imports`'s fix both apply in one pass, turning `import { A }` plus `import { b }` of one module into `import type { A, b }`, so a value becomes type-only. | Nothing recorded in the presets. |
| [oxc-project/oxc#29875](https://github.com/oxc-project/oxc/issues/29875) | 2026-11-18 | The `import/no-duplicates` fix merges a side-effect import into a named import of the same module, so Oxfmt's `sortImports` then moves it and the module no longer evaluates first. Asked for the fix to skip side-effect imports, or an option. | If an option is added, set it in `oxlint/core`. |
| [un-ts/eslint-plugin-import-x#642](https://github.com/un-ts/eslint-plugin-import-x/issues/642) | 2026-11-18 | The ESLint side of the same thing: `import-x/no-duplicates` merges a side-effect import and `import-x/order` then moves it. | If an option is added, set it in `eslint/core/rules/import.mjs`. |
| [oxc-project/oxc#29876](https://github.com/oxc-project/oxc/issues/29876) | 2026-11-18 | The `import/consistent-type-specifier-style` fix copies import attributes onto the new `import type`, which TypeScript rejects (TS2857, TS1463). | Nothing recorded in the presets. |
| [biomejs/biome#13304](https://github.com/biomejs/biome/issues/13304) | 2026-11-18 | `noTypeOnlyImportAttributes` reports `import { type A, b } from "x" with { … }` as a syntax error, though the import isn't type-only and TypeScript accepts it. | Nothing recorded in the presets. |
| [oxc-project/oxc#29877](https://github.com/oxc-project/oxc/issues/29877) | 2026-11-18 | The `unicorn/prefer-logical-operator-over-ternary` suggestion drops parentheses the alternate needs: `x ? x : y ? a : b` becomes `x \|\| y ? a : b`, and `f ? f : () => {}` becomes a syntax error. Reached by `ultracite fix --unsafe`. | Nothing recorded in the presets. |
| [oxc-project/oxc#29878](https://github.com/oxc-project/oxc/issues/29878) | 2026-11-18 | The `no-unneeded-ternary` dangerous fix turns `f() ? true : true` into `true`, dropping the call. (`a + b ? true : false` → `a + b` is already fixed by [#29702](https://github.com/oxc-project/oxc/pull/29702), not yet released.) | Nothing recorded in the presets. |
| [withastro/prettier-plugin-astro#504](https://github.com/withastro/prettier-plugin-astro/issues/504) | 2026-10-25 | Leading spaces in an element's text are removed, though the Astro compiler keeps them. This is the plugin Oxfmt and Prettier format `.astro` files with. | Nothing recorded in the presets. |

## Closed

| Issue | Opened | Closed | What it was | Outcome |
| --- | --- | --- | --- | --- |
| [interfere-inc/landmines#4](https://github.com/interfere-inc/landmines/issues/4) | 2026-11-17 | 2026-11-18 | `no-comments` rejected the `SAFETY:` comment anti-slop requires on type assertions. | Fixed in 0.1.1 with an `allow` option ([#18](https://github.com/interfere-inc/landmines/pull/18)). The `landmines` preset sets it. |
| [oxc-project/oxc#29320](https://github.com/oxc-project/oxc/issues/29320) | 2026-11-12 | 2026-11-15 | `jsx-a11y/lang` reported a missing `lang`, duplicating `html-has-lang`. | Fixed in [#29441](https://github.com/oxc-project/oxc/pull/29441), released in Oxlint 1.94.0. |
| [oxc-project/oxc#29319](https://github.com/oxc-project/oxc/issues/29319) | 2026-11-12 | 2026-11-13 | `react/exhaustive-deps` added `[]` to `useMemo` and `useCallback` under plain `--fix`. | Fixed in [#29430](https://github.com/oxc-project/oxc/pull/29430), released in Oxlint 1.94.0. |
| [oxc-project/oxc#29321](https://github.com/oxc-project/oxc/issues/29321) | 2026-11-12 | 2026-11-13 | `func-style` skipped a function declaration that shares its name with a type, interface or namespace. | Fixed in [#29378](https://github.com/oxc-project/oxc/pull/29378), released in Oxlint 1.94.0. |
| [biomejs/biome#13107](https://github.com/biomejs/biome/issues/13107) | 2026-11-12 | 2026-11-13 | The `noDistractingElements` unsafe fix removed only the opening `<marquee>` tag, leaving code that doesn't parse. | Fixed in [#13130](https://github.com/biomejs/biome/pull/13130), released in Biome 2.6.8. |
| [oven-sh/bun#45405](https://github.com/oven-sh/bun/issues/45405) | 2026-10-15 | 2026-10-16 | `bun lint` and `bun fmt` had no documented way to run when `package.json` has a `lint` or `fmt` script. | Fixed in [#45482](https://github.com/oven-sh/bun/pull/45482). Matters for the Bun provider, which is not released yet. |
| [oven-sh/bun#45406](https://github.com/oven-sh/bun/issues/45406) | 2026-10-15 | 2026-10-16 | `bun fmt` didn't format a file with classes to sort when `tailwindcss` wasn't installed. | Fixed in [#45482](https://github.com/oven-sh/bun/pull/45482). |
| [oven-sh/bun#45407](https://github.com/oven-sh/bun/issues/45407) | 2026-10-15 | 2026-10-16 | `bun lint` import resolution slowed down when a parent directory had many entries. | Fixed in [#45482](https://github.com/oven-sh/bun/pull/45482). |
| [oven-sh/bun#45409](https://github.com/oven-sh/bun/issues/45409) | 2026-10-15 | 2026-10-16 | `bun lint` lost the location of a JS plugin report at `loc: { line: 0, column: 0 }`. | Fixed in [#45482](https://github.com/oven-sh/bun/pull/45482). |
| [dmmulroy/anti-slop#45](https://github.com/dmmulroy/anti-slop/pull/45) (PR) | 2026-09-14 | 2026-10-14 | Keep consecutive single-line bindings grouped in `require-readable-spacing`. | Merged. |
| [unjs/nypm#260](https://github.com/unjs/nypm/pull/260) (PR) | 2026-08-27 | 2026-09-08 | Select the workspace root for aube and nub. | Merged. |
| [dmmulroy/anti-slop#10](https://github.com/dmmulroy/anti-slop/issues/10) | 2026-08-14 | 2026-08-14 | `no-runtime-typeof`: exempt `typeof` inside type predicates. | Closed as completed. |
| [oxc-project/oxc#24096](https://github.com/oxc-project/oxc/issues/24096) | 2026-07-03 | 2026-07-03 | Oxfmt collapsed `:::` directive fences onto one line with `proseWrap: "never"`. | Closed as completed. |
| [oxc-project/oxc#23034](https://github.com/oxc-project/oxc/issues/23034) | 2026-06-06 | 2026-06-07 | Docs pages were missing for recently added Oxlint rules. | Closed. |
| [oxc-project/oxc#21949](https://github.com/oxc-project/oxc/issues/21949) | 2026-04-29 | 2026-05-03 | `unicorn/number-literal-case` conflicts with Oxfmt's hex literal formatting. | Closed as not planned. |
| [unjs/nypm#225](https://github.com/unjs/nypm/pull/225) (PR) | 2026-01-08 | 2026-01-20 | Replace corepack. | Closed without merging. |
| [biomejs/biome#8010](https://github.com/biomejs/biome/pull/8010) (PR) | 2025-11-06 | 2026-02-14 | Add an allowlist option to `noNamespaceImport`. | Closed without merging. |
| [biomejs/website#3283](https://github.com/biomejs/website/pull/3283) (PR) | 2025-10-20 | 2025-10-20 | Update the command for filtering data when investigating slowness. | Merged. |
