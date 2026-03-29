---
"ultracite": patch
---

Fix DEP0190 deprecation warnings in `check`, `fix`, and `doctor` by routing CLI subprocesses through a shared `cross-spawn` runner with `shell: false`, while preserving Windows command resolution and direct file-path argument passing.
