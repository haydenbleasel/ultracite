---
"ultracite": patch
---

The Stylelint preset now handles Tailwind CSS v4, SCSS and Less, and skips build output.

- **Tailwind CSS v4:** `@theme`, `@utility`, `@variant`, `@custom-variant`, `@slot`, `@plugin` and `@config` are allowed by `at-rule-no-unknown`, alongside the Tailwind v3 at-rules and `@source` and `@reference`. `at-rule-prelude-no-invalid` no longer rejects every `@apply` (or the other Tailwind at-rules' preludes). `custom-property-pattern` accepts theme namespace resets (`--color-*: initial`) and sub-properties (`--text-xl--line-height`). `declaration-property-value-no-unknown` and `function-no-unknown` accept `--spacing()`, `--alpha()`, `--value()`, `--modifier()` and `theme()`. `media-query-no-invalid` accepts `theme()` breakpoints, and `nesting-selector-no-missing-scoping-root` allows `&` inside `@custom-variant`, `@variant` and `@utility`. See https://tailwindcss.com/docs/functions-and-directives.
- **`import-notation`** is now `"string"`. `stylelint-config-standard`'s `"url"` autofix rewrote `@import "tailwindcss"` to `@import url("tailwindcss")`.
- **SCSS and Less:** `.scss` files are parsed with `postcss-scss` and `.less` files with `postcss-less`. Previously every SCSS and Less file failed with `CssSyntaxError` (for example on `//` comments or mixin calls). The CSS-only rules that cannot understand preprocessor syntax (unknown at-rules such as `@use`, `@include` and `@mixin`, `$variable` and `@variable` values, Sass and Less built-in functions, `//` comments) are relaxed for those files. `ultracite init` now installs `postcss-scss` and `postcss-less` with the ESLint toolchain.
- **`.sass`:** the indented Sass syntax has no maintained PostCSS parser, so `ultracite check` and `ultracite fix` no longer pass `.sass` files to Stylelint, where every one failed to parse.
- **Ignores:** `ignoreFiles` now uses the shared ignore list (`dist`, `build`, `.next`, `coverage`, `storybook-static` and so on). Stylelint does not read `.gitignore`, so it previously linted generated CSS.
- **Prettier:** `prettier/prettier` is now enabled. The preset loaded `stylelint-prettier` but never turned its rule on.
- `ultracite check` and `ultracite fix` now escape glob characters in directory arguments before passing them to Stylelint. A directory such as `app/(marketing)` previously matched no files.
