---
"ultracite": patch
---

`ultracite fix --hook` no longer fixes the whole project after an `apply_patch` edit that only deletes files. Such a patch leaves no file to fix, so the hook now does nothing, where it used to fall back to a whole-project run that could reformat files the agent never touched.
