---
"ultracite": patch
---

Update `postcss-less`, the syntax the Stylelint preset reads `.less` files with, to 7.1.1. It parses more Less: `@{var}` interpolation in an at-rule's prelude and in property names, function calls, lookup expressions, and mixins with a digit or a backslash in their name. It is ESM-only and needs Node.js 22, which Ultracite already requires.

Stylelint itself stays on 17, and the `stylelint` peer range stays at `^17.0.0`. Stylelint 18 removed the API that `stylelint-order` 6 uses to apply fixes, and `stylelint-config-idiomatic-order`, which the preset extends, still depends on that version, so on Stylelint 18 `ultracite fix` would report the property order without sorting it.
