---
"ultracite": patch
---

`ultracite init` installs your linter's extension in Trae, CodeBuddy, IBM Bob and Antigravity IDE, with each editor's own command-line launcher: `trae`, `buddy`, `bobide` and `antigravity-ide`. It used to ask you to install it from the Extensions view. An extension install that takes longer than two minutes is now stopped and treated as failed, so a launcher that isn't the editor's own (such as `kiro` set to open Kiro CLI) can't hang `init`.
