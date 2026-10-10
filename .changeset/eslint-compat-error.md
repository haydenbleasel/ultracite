---
"ultracite": major
---

`compat/compat` is now an error in the ESLint core preset. It was the last warning-level rule in any preset, so `ultracite check` passed while it reported browser APIs your [browserslist](https://github.com/browserslist/browserslist) targets don't support. Set your targets in a `browserslist` key in `package.json` or a `.browserslistrc` file, or turn the rule off in your config if the project only runs on a server.
