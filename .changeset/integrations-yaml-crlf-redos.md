---
"ultracite": patch
---

`ultracite init` no longer hangs on a `.pre-commit-config.yaml` or lefthook config with CRLF line endings and many consecutive comment lines. The check that keeps the file's sequence indentation could backtrack exponentially on that input.
