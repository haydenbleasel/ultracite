---
"ultracite": patch
---

Rewrite the agent-fix progress renderer on top of log-update, cli-truncate, and string-width. log-update now owns the in-place block rewriting that was previously done with manual cursor-up/clear-line escape sequences, and line truncation is measured by display width instead of code units — so lint messages containing emoji or CJK text can no longer overflow the terminal row and corrupt the animated block.
