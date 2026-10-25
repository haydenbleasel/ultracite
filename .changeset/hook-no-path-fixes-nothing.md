---
"ultracite": patch
---

`ultracite fix --hook` no longer fixes the whole project when it can't read an edited file's path from the agent's hook payload. A payload with no path, one in a shape the hook doesn't know, text that isn't JSON, or stdin that can't be read now fixes nothing. The whole-project run it used to fall back to could reformat files the agent never touched. Payloads that name the edited file are fixed as before.
