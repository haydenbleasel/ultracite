---
"ultracite": patch
---

The CLI now checks the package `engines.node` range (`^22.22.2 || >=24.15.0`) before loading the rest of the command surface. On an unsupported Node.js version it exits with a clear upgrade message instead of crashing inside a dependency with `TypeError: TEXT_ENCODINGS.union is not a function` (seen on Node.js 20 with execa 10).
