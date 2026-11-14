---
"ultracite": patch
---

With the `eslint-plugin-jsdoc` JS plugin enabled on Oxlint, `ultracite fix` no longer adds an empty `/** */` block above every undocumented export. The block was the fix for `jsdoc-js/require-jsdoc`, and `ultracite check` then reported each one as `jsdoc/no-blank-blocks`, along with a missing `@param` and `@returns`. The rule still reports a missing comment; writing it is left to you.
