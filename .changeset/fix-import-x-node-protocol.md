---
"ultracite": patch
---

Remove the nonexistent `import-x/enforce-node-protocol-usage` rule from the ESLint core config, which caused ESLint 9 to throw `Could not find "enforce-node-protocol-usage" in plugin "import-x"`. Node protocol enforcement is already covered by `unicorn/prefer-node-protocol`.
