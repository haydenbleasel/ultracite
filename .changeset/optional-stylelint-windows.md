---
"ultracite": patch
---

On Windows, a linter or formatter that isn't installed is now reported as missing instead of as "exited with code 1". `ultracite check` and `ultracite fix` warn and skip CSS linting when the optional Stylelint is missing, as they already did on macOS and Linux, and `ultracite fix --agent` now skips a missing Stylelint on every platform instead of failing.
