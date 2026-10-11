---
"ultracite": patch
---

An editor extension install that takes longer than two minutes is now stopped and treated as failed, so a launcher that isn't the editor's own (such as `kiro` set to open Kiro CLI) can't hang `ultracite init`. Init then asks you to install the extension yourself, as it does for any failed install.
