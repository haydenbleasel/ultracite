---
"ultracite": patch
---

Generate a single brace glob for Lefthook pre-commit jobs. Running `ultracite init` again converts previously generated glob lists and respects the configured matcher.

`init` doesn't edit what a YAML anchor or alias shares with other hooks or jobs, whether that's the whole Ultracite job, its command or its glob, since the edit would change them too. It updates the rest of the job and prints the values to give the pre-commit job instead.
