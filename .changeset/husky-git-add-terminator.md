---
"ultracite": patch
---

Harden the generated standalone Husky hook by using `git add -- "$file"` when restaging formatted files. This prevents option-shaped filenames from being interpreted as Git options during the hook.
