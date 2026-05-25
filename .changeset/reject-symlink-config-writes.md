---
"ultracite": patch
---

Reject symlinked generated config targets before writing project files. CLI config writers now route through a shared project-file write guard that checks for symlinks and project-root escapes before mutating files.
