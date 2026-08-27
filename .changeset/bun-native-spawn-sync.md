---
"ultracite": patch
---

Fix `ultracite` crashing when run under Bun on Windows. execa's sync API dereferences an `output` array that Bun's `spawnSync` doesn't return there, so the spawn-sync adapter now uses the native child-process API when running under Bun. Under Node it still goes through execa, which resolves the `.cmd` shims in `node_modules/.bin` on Windows. The native path mirrors execa's `windowsHide` and 100 MB `maxBuffer` defaults so both behave the same.
