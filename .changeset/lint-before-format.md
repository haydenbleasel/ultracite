---
"ultracite": patch
---

`ultracite fix` now runs lint fixes before the formatter: oxlint before oxfmt, and ESLint then Stylelint before Prettier. A fixer can insert unformatted code, such as the braces `curly` adds, the imports `consistent-type-specifier-style` splits, or the font names Stylelint requotes, and running the formatter first left that code unformatted until the next run. Fixer-inserted code is now formatted in the same run. The `--claude` and `--codex` agent passes follow the same order.

`unicorn/no-nested-ternary` is now off in the oxlint and ESLint presets: its fixer adds parentheses that oxfmt and Prettier remove, so the two tools rewrote the file on every run. The core `no-nested-ternary` rule still reports nested ternaries.
