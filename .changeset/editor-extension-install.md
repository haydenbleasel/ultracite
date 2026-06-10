---
"ultracite": patch
---

Fix automatic editor extension installation during `ultracite init`.

The whole command line (e.g. `code --install-extension`) was passed to
`spawnSync` as the executable name, which always failed with `ENOENT` and
silently fell back to the "install manually" message. The command is now split
into the binary and its arguments, so the linter extension actually installs
for VS Code-based editors.
