---
"ultracite": patch
---

Replace the glob dependency with fast-glob for the tsconfig.json scan during init. fast-glob was already in the dependency tree via find-workspaces, so this drops glob's transitive dependencies (minipass, path-scurry, etc.) from the install without changing behavior.
