---
"ultracite": patch
---

`ultracite check` and `ultracite fix` no longer fail on an ESLint setup when given a file with no extension, such as a `Dockerfile`, `Makefile`, `LICENSE`, `.gitignore` or `.env`. Ultracite took any target without an extension for a directory and handed Stylelint `<file>/**/*.{css,scss,less}`, which crashed with `ENOTDIR: not a directory, scandir`. That blocked commits through the Husky, Lefthook and pre-commit hooks whenever one of those files was staged, and made `fix --hook` report a failure to the agent that had edited one. Stylelint now skips them, as ESLint and Prettier already did.
