---
"ultracite": patch
---

`--hooks devin` works with Devin Local, Devin Desktop's only agent since 3.9.19. Earlier versions wrote a `post_write_code` hook to `.devin/hooks.json` for Cascade, which Devin Desktop removed, so the hook no longer ran. `init` now writes a `PostToolUse` hook to `.devin/hooks.v1.json`, in Claude Code's format, which Devin Local and [Devin CLI](https://docs.devin.ai/cli/extensibility/hooks/overview) read. Re-running `init` takes the old hook out of `.devin/hooks.json` and `.windsurf/hooks.json` and leaves your own hooks there, or removes a file left empty.

Devin reads exit code 2 from a hook as "block", so when `ultracite fix --hook` runs under Devin (it sets `DEVIN_PROJECT_DIR`), it exits with 0 and prints what it couldn't fix as the hook's `hookSpecificOutput.additionalContext`, which Devin adds to the agent's context.
