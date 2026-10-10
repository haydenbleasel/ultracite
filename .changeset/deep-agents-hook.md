---
"ultracite": patch
---

Add a post-edit hook for Deep Agents. `init --hooks deepagents` writes `.deepagents/hooks.json` in Claude Code's format, with a `PostToolUse` hook that runs `ultracite fix --hook` after each `Write` or `Edit`. Deep Agents Code (`dcode`) runs a project's hooks once you trust the workspace (headless runs need `--trust-project-hooks`), and when the hook exits with code 2 it appends the problems `fix` couldn't settle to the tool result the model reads.
