---
"ultracite": minor
---

Add a post-edit hook for Codex. `init --hooks codex` writes `.codex/hooks.json` with a `PostToolUse` hook that runs `ultracite fix --hook` after each `apply_patch` edit, fixing just the files the patch adds, updates or moves. Codex loads the hook once you trust the project and review it in `/hooks`, and when the hook exits with code 2 it hands the problems `fix` couldn't settle to the model as the patch's result. See [Codex hooks](https://learn.chatgpt.com/docs/hooks).
