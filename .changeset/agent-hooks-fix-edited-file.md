---
"ultracite": minor
---

Agent hooks now fix only the file the agent edited. The generated hook command passes a new `--hook` flag, and `ultracite fix --hook` reads the agent's payload from stdin: Claude Code and CodeBuddy (`tool_input.file_path`), Cursor (`file_path`) and Windsurf (`tool_info.file_path`). A file outside the project, or one that no longer exists, is skipped. A payload with no readable file path keeps the previous whole-project run. Re-running `ultracite init` does not add a second hook next to one generated before this change.
