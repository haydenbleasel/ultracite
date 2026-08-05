---
"ultracite": patch
---

Fix Stylelint target generation dropping directories with a dot in their name (e.g. `app.web`) and producing non-matching globs from Windows-style backslash paths. Framework detection also handles negated workspace patterns (`!packages/legacy`) again.
