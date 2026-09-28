---
"ultracite": patch
---

Update oxfmt to 0.70.0 and re-target the markdown `:::` fence patch. Releases 0.68 through 0.70 change no options; they fix suppression-comment handling, comment placement around operators and `as`/`satisfies`, and several YAML and CSS edge cases. oxfmt 0.69 also ships a native markdown formatter, but `.md` files still go through the Prettier-based path, so the fence patch still applies.
