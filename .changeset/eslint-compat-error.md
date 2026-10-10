---
"ultracite": major
---

`compat/compat` is now an error in the ESLint core preset. It was the last warning-level rule in any preset, so `ultracite check` passed while it reported browser APIs your [browserslist](https://github.com/browserslist/browserslist) targets don't support. Set your targets in a `browserslist` key in `package.json` or a `.browserslistrc` file, or turn the rule off in your config if the project only runs on a server.

A project that sets no targets is now checked against [Baseline Widely available](https://web.dev/baseline) browsers (`baseline widely available`). eslint-plugin-compat used browserslist's `defaults` there, which include Opera Mini and Chrome 109, so `fetch`, `URL` and `Array#toSorted()` failed in almost every project. Ultracite only sets these targets when it finds no browserslist config from the directory ESLint runs in and no `BROWSERSLIST` environment variable, since the plugin would add them to your own targets rather than replace them. In a monorepo that sets targets only in its packages, add them at the root too, or set `settings.browsers` yourself.
