---
"ultracite": patch
---

Fix `ultracite init` failing with `npm error No workspaces found!` in npm monorepos. When `isMonorepo()` was true, nypm was passed `workspace: true`, which translates to `--workspaces` for npm — that installs in every workspace package and errors when patterns match nothing. We now skip the workspace flag for npm (the default root install is what we want) while preserving the flag for pnpm (`--workspace-root`) and yarn classic (`-W`). Applies to ultracite, husky, lefthook, and lint-staged installs.
