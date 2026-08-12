---
"ultracite": patch
---

Replace the hand-rolled package `exports` map matching in the config-resolution doctor check with the resolve.exports library, which implements Node's full `PACKAGE_TARGET_RESOLVE` algorithm (wildcard patterns, key-order precedence, conditional exports, and array fallbacks). The manual `node_modules` walk is kept intentionally — it exists to avoid Bun's auto-install cache resolving specifiers the project's own `node_modules` can't.
