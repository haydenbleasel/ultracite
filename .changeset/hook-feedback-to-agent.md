---
"ultracite": major
---

`ultracite fix --hook` now hands the problems it can't fix back to the agent. In Claude Code, CodeBuddy, Codex, Deep Agents, Grok Build and VS Code's Local agent (which runs the GitHub Copilot hook), the hook prints everything the linter and formatter report to stderr and exits with code 2 when problems remain, which those hosts show to the agent so it fixes them in its next step. Devin reads exit code 2 as "block", so under Devin the hook exits with 0 and passes the problems as `hookSpecificOutput.additionalContext` instead. Cursor and the Copilot CLI and cloud agent don't pass a hook's output to the agent, so their hooks keep the previous output and exit code.
