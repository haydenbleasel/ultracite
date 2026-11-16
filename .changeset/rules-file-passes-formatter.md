---
"ultracite": patch
---

The rules `ultracite init` writes to `AGENTS.md`, `CLAUDE.md` and the other agent rules files now pass the formatter it sets up. The "Framework-Specific Guidance" section had no blank line between each bold label and the list under it, which Oxfmt and Prettier both reformat, so `ultracite check` failed on a freshly written rules file, and running `init` again undid what `ultracite fix` had changed. Run `ultracite init` again to pick up the corrected block.
