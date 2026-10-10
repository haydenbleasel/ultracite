---
"ultracite": major
---

Ultracite now requires Node.js 22.18 or later, or Bun, and says so in its `engines` field. The CLI's dependencies have needed Node 22 since 7.10.0, so on Node 20 it stopped at startup with `TEXT_ENCODINGS.union is not a function`, and the `oxlint.config.ts` that `init` writes needs Node 22.18 to load on the Node 22 line. Node 20 reached end of life in April 2026.

Requires Node.js >= 22.18.0
