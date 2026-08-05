---
"ultracite": patch
---

Fix several agent fix mode (`fix --claude`/`--codex`) issues: runs no longer abort with ENOBUFS when linter JSON output exceeds 1MB, user-supplied format/reporter flags can no longer override the JSON reporter and break parsing, a stuck agent process is force-killed 10 seconds after the timeout instead of hanging forever, and the progress renderer no longer garbles TTY output when file paths and rule names exceed the terminal width.
