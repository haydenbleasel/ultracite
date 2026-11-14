---
"ultracite": patch
---

`ultracite init --integrations husky lint-staged` no longer adds its own section to a `.husky/pre-commit` that already runs lint-staged. The section runs lint-staged too, so every commit ran it twice. The existing line is left to run the Ultracite task `init` adds to the lint-staged config.
