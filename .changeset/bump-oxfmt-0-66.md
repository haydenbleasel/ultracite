---
"ultracite": patch
---

Update oxfmt to 0.66.0. The 0.65 and 0.66 releases are formatter fixes only, mainly around comment placement between a statement head and its body, suppressed statements (decorators, typecast parens, semicolons), custom side-effect groups in `sortImports`, CommonMark list interruption in JSDoc, and trailing whitespace in YAML block scalars. The `:::` container-directive fence patch is re-targeted to the new markdown bundle; the patched code itself is unchanged.
