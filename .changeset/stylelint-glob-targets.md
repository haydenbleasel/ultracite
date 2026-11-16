---
"ultracite": patch
---

On the ESLint provider, `ultracite check` and `ultracite fix` now run Stylelint when the target is a quoted glob that isn't limited to stylesheets, such as `"src/**"` or `"**/*.{css,ts}"`. A glob with no extension was treated as a directory name and its wildcards escaped, and a glob ending in a non-style extension was dropped, so Stylelint matched nothing and the stylesheets went unlinted without a message. Those globs are now expanded and their `.css`, `.scss` and `.less` files passed to Stylelint. Directories, single files and globs that already name a style extension behave as before.
