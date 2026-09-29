---
"ultracite": patch
---

Fixes for `ultracite fix --claude` and `ultracite fix --codex`:

- On a terminal, the ✓/✗ result for every issue is now kept once a file is done. Previously a file with more issues than the terminal had rows kept only the last screenful of results.
- In CI logs and other piped output, lint messages are no longer cut off at 80 columns.
- The prompt is now sent to the agent CLI on stdin (`claude -p`, `codex exec -`) instead of as a command-line argument. On Windows, an npm-installed CLI runs through a `.cmd` shim, which can cut an argument off at its first newline, so the agent received only the prompt's first line and never saw the file or its issues.
- `--codex` now passes `--skip-git-repo-check`, so it also works in a project that isn't a git repository. Previously `codex exec` refused to run there and every file failed.
