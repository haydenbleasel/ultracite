---
"ultracite": patch
---

Update `postcss-less`, the syntax the Stylelint preset reads `.less` files with, to 7.1.1. It parses more Less: `@{var}` interpolation in an at-rule's prelude and in property names, function calls, lookup expressions, and mixins with a digit or a backslash in their name. It is ESM-only and needs Node.js 22, which Ultracite already requires.
