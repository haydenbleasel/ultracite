---
"ultracite": patch
---

Fix the project-path write guard's error message and ordering.

The "Refusing to write through directory outside project" error interpolated
the `node:path` module instead of the offending file path, printing
`[object Object]`. It now reports the actual path.

`writeProjectFile` also created directories (`mkdir -p`) before running the
path-escape check, so directories could be created outside the project before
the guard threw. Validation now happens first; the parent-directory check
resolves the nearest existing ancestor so writes into not-yet-created nested
directories still work.
