---
"ultracite": patch
---

Use magicast to update ESM lint-staged config files during `ultracite init`. The config is now edited as an AST instead of being imported and re-serialized, so comments and function-valued entries elsewhere in the config survive the update, and the user's config code is no longer executed. If the Ultracite glob pattern is already owned by a non-array value, or the config isn't a mergeable object literal (e.g. `defineConfig(...)`), init warns and leaves the file untouched instead of rewriting it. CommonJS configs keep the previous behavior.
