---
"ultracite": patch
---

Install into the workspace root correctly for Nub and Aube monorepos: nypm emits no root selector for them, so `nub add` ran without `-w` and was refused. Ultracite now hands nypm pnpm's flag set for these pnpm-compatible CLIs, producing `nub add --workspace-root --save-dev ultracite`
