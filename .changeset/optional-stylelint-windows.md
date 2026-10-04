---
"ultracite": patch
---

`ultracite check` and `ultracite fix` no longer fail on Windows when the optional Stylelint binary is missing. Both commands warn and skip CSS linting instead; a Stylelint run that actually executes and reports errors still fails.
