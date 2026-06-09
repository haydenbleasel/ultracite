---
"ultracite": patch
---

Enable the `eslint/no-await-in-loop` rule as an error in the core Oxlint
preset.

Awaiting inside a loop forces each iteration to run sequentially, which can
lead to serious performance issues when the asynchronous operations could
otherwise run concurrently. Promoting this rule to an error encourages
collecting promises and resolving them together (e.g. with `Promise.all`)
instead of blocking on each one in turn.
