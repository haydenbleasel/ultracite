---
"ultracite": patch
---

Refresh the misleading header comment in `config/eslint/core/rules/eslint-typescript.mjs`. The disables for the formatting rules (`brace-style`, `comma-dangle`, `indent`, etc.) used to defer to `@typescript-eslint`'s typed equivalents, but those rules were removed in v8. They're now disabled because Prettier/Oxfmt owns formatting. Updated the comment to reflect the actual rationale.
