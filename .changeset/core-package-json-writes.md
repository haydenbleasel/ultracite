---
"ultracite": patch
---

`ultracite init` is gentler with `package.json`:

- It keeps the file's key order, indentation and line endings. Before, every write moved `devDependencies` to the top and pushed keys like `private`, `main` and `exports` to the end.
- It no longer overwrites a `check` or `fix` script the project already has (for example `"check": "tsc --noEmit"`). It prints a warning instead, and it only adds the scripts that are missing. Existing scripts that already run Ultracite with extra flags are left as they are.
- When switching linters, it only removes the previous linter's packages from `devDependencies`. Packages in `dependencies` and `peerDependencies` stay, such as `prettier` used at runtime or `eslint` as the peer of a published plugin.
- With `--skip-install`, the final message now says the dependencies were added to `package.json` instead of claiming they were installed.
