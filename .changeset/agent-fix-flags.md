---
"ultracite": minor
---

Add `--claude` and `--codex` flags to `ultracite fix`. After the normal autofix pass, remaining diagnostics are handed to the Claude Code or Codex CLI non-interactively, one agent run per affected file, with a live per-issue spinner that flips to ✓/✗ once the fix is verified by a re-lint. Works with all three linter modes (Oxlint, Biome, ESLint); exits non-zero if any issues remain, matching the plain `fix` contract.
