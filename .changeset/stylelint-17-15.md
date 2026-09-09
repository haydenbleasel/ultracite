---
"ultracite": patch
---

Refresh the stylelint lock to 17.15.0 and enable its new `selector-no-unmatchable` rule, which flags selectors that can never match (for example `label:checked`, `::before:first-child` or `:is(::before)`).
