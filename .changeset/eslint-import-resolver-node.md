---
"ultracite": patch
---

The ESLint core preset no longer configures a `node` resolver for `import-x`, which needed `eslint-import-resolver-node`, a package `init` never installed. The TypeScript resolver it keeps resolves JavaScript files too.
