---
"ultracite": patch
---

`ultracite init --integrations lint-staged` now adds its entry to a CommonJS lint-staged config (`lint-staged.config.js` in a package without `"type": "module"`, or a `.cjs` file) without rewriting the rest of it. It used to load the module and write back `module.exports = ` followed by the evaluated value as JSON, which deleted comments and variables and froze every expression at its value on the machine that ran `init`: a task built from `process.env.CI` kept the local branch, and one built from `__dirname` kept that machine's absolute path. A config that isn't an object literal is left unchanged, with a warning naming the entry to add.
