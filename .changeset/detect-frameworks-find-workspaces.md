---
"ultracite": patch
---

Replace the hand-rolled monorepo workspace scan in framework detection with the find-workspaces library. Workspace declarations from package.json (array and yarn-classic object form) and pnpm-workspace.yaml — including negated globs — are now resolved by the library instead of manual pattern collection and globbing, and lerna/bolt monorepos are picked up as well.
