---
"ultracite": patch
---

Fix DEP0190 deprecation warning on Windows with Node.js 24 by replacing `spawnSync` (with `shell: true`) with `cross-spawn`, which handles `.cmd` binary resolution with proper argument escaping without requiring a shell.
