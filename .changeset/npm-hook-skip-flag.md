---
"ultracite": patch
---

Insert `--` before script arguments in npm hook commands.

The post-edit hook command generated for npm projects was
`npm run fix --skip=correctness/noUnusedImports`, where npm consumes the
`--skip` flag itself instead of forwarding it to the script — so agent hooks
ran a plain `ultracite fix`, including the unused-import removal the flag
exists to prevent mid-edit. The generated command is now
`npm run fix -- --skip=correctness/noUnusedImports`, matching the documented
form.
