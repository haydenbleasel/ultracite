---
"ultracite": patch
---

Reject unsupported package-manager names during `ultracite init`. Explicit `--pm` values and detected `packageManager` metadata are now runtime-validated against the supported package managers before dependency installation, preventing malicious project metadata from selecting an arbitrary executable.
