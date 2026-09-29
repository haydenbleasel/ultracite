---
"ultracite": patch
---

`ultracite init` no longer creates directories for agent rule files or agent hook configs (such as `.claude/` or `.cursor/`) before checking that the path stays inside the project. When one of those directories was a symlink to somewhere outside the project, init created the missing directories there before it refused to write the file.
