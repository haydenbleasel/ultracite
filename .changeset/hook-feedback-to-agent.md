---
"ultracite": patch
---

`ultracite fix --hook` now hands the problems it can't fix back to the agent. In Claude Code, CodeBuddy, Windsurf, and VS Code's Local agent (which runs the GitHub Copilot hook), the hook prints everything the linter and formatter report to stderr and exits with code 2 when problems remain, which those hosts show to the agent so it fixes them in its next step. Cursor and the Copilot CLI and cloud agent don't pass a hook's output to the agent, so their hooks keep the previous output and exit code.
