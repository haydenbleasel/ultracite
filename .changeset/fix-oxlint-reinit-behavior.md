---
"ultracite": patch
---

Fix re-running `ultracite init` on an oxlint setup silently enabling the full js-plugins preset — the previously selected JS plugins are now preserved when no new selection is made. Init also no longer flips an explicit `"type": "commonjs"` in package.json to `"module"`; it warns instead.
