---
"ultracite": patch
---

Validate package-manager names before generating agent and editor hook commands. Hook configuration now only uses supported package-manager prefixes, preventing unsafe values from being persisted into later-executed hook commands.
