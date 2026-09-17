---
"ultracite": minor
---

Agent hooks now fix only the file the agent edited. The generated hook command passes a new `--hook` flag, and `ultracite fix --hook` reads the agent's payload from stdin: Claude Code and CodeBuddy (`tool_input.file_path`), Cursor (`file_path`) and Windsurf (`tool_info.file_path`). A file outside the project, one that no longer exists, or one the project's linters do not handle is skipped. A payload with no readable file path keeps the previous whole-project run. Re-running `ultracite init` rewrites a hook from an earlier init to the new command, including one generated before this change or for a different package manager or linter.
