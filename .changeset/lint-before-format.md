---
"ultracite": patch
---

`ultracite fix` now runs the linter's fixes before the formatter (oxlint before oxfmt, ESLint before Prettier). A fixer can insert unformatted code, such as the braces `curly` adds or the imports `consistent-type-specifier-style` splits, and running the formatter first left that code unformatted until the next run. One `fix` is now idempotent.
