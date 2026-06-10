---
"ultracite": patch
---

Scope the Stylelint step of `ultracite check` and `ultracite fix` (ESLint mode)
to style files.

Stylelint was previously given the same targets as ESLint and Prettier (or `.`
when no files were passed), so it tried to parse `.ts`/`.json` files as CSS and
failed with `CssSyntaxError`. Style files now pass through unchanged, directory
targets become `**/*.{css,scss,sass,less}` globs, other files are dropped, and
the step is skipped entirely when no style targets remain.
`--allow-empty-input` is passed so projects without CSS still succeed.
