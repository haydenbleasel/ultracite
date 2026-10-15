---
"ultracite": minor
---

Add Bun as a provider. `ultracite init --linter bun` sets a project up to lint with [`bun lint`](https://bun.com/docs/lint) and format with [`bun fmt`](https://bun.com/docs/format), which reimplement Oxlint and Oxfmt and read their configs. The Bun provider uses Ultracite's Oxlint and Oxfmt presets, with `defineConfig` imported from the new `ultracite/bun` export in `oxlint.config.ts` and `oxfmt.config.ts`. Bun loads those configs without `oxlint` or `oxfmt` installed. `defineConfig` also drops the rules Bun doesn't implement (currently every `jsdoc/*` and `vue/*` rule) from the presets, so a run doesn't fail on them. It turns Tailwind class sorting off when `tailwindcss` isn't installed, because `bun fmt` reads the class order from that package and won't format a file whose classes it can't sort.

`ultracite check` and `ultracite fix` run `bun lint` and `bun fmt`, even when `package.json` has a `lint` or `fmt` script that Bun would otherwise run instead. `fix --claude` and `fix --codex` work as they do on Oxlint. Init installs nothing beyond Ultracite, except `oxlint` and `oxfmt` (and `oxlint-tsgolint` with `--type-aware`) when it sets up an editor, because Bun has no language server and editors use the oxc extension on the same configs. Type-aware rules get their types from `bun check`. Switching between `--linter oxlint` and `--linter bun` rewrites only the `defineConfig` import. `ultracite doctor` checks that Bun can lint. It also warns about `[lint]` and `[fmt]` settings in `bunfig.toml`, which Bun applies on top of these configs but editors don't read.

On Bun, `ultracite fix --staged` and `ultracite check --staged` pass `--staged` to both `bun lint` and `bun fmt`, so both work on just the staged files, and `fix` stages the files it changes again. `--changed` reaches both tools the same way. So the Husky hook `init --integrations husky` writes for a Bun project runs `ultracite fix --staged` in place of its staged-files script, and lint-staged isn't needed. Bun won't fix a file with both staged and unstaged changes, so the hook stops the commit until you stage the rest of that file or stash it.

Requires Bun >= 1.4.4
