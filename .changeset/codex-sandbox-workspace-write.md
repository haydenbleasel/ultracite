---
"ultracite": patch
---

Fix `ultracite fix --codex` failing on recent Codex CLI releases. The Codex adapter invoked `codex exec --full-auto`, a flag Codex has since removed, so every attempt failed at argument parsing. It now runs `codex exec --sandbox workspace-write`, the equivalent non-interactive, workspace-scoped mode, which is also accepted by older Codex versions. Resolves #794.
