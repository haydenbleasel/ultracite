---
"ultracite": patch
---

`ultracite check` and `fix` on the ESLint toolchain no longer warn about each file you pass that no ESLint config covers, such as `README.md` or `package.json`. A pre-commit hook that passes every staged file hit "File ignored because no matching configuration was supplied" on most commits. Ultracite now passes `--no-warn-ignored` to ESLint when you name files, unless you pass `--warn-ignored` or `--no-warn-ignored` yourself.
