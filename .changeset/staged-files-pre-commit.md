---
"ultracite": major
---

The pre-commit hooks that `ultracite init` sets up now fix only the files you staged, instead of running `ultracite fix` on the whole project.

- **Husky:** the hook passes the staged files to `ultracite fix` and re-stages them. A file you staged only part of is fixed but no longer re-staged, because `git add` would also have committed the changes you left unstaged. The hook lists those files so you can review the fixes and stage them yourself.
- **Lefthook:** the job runs `ultracite fix {staged_files}`, so Lefthook passes the staged files that match its globs, and `stage_fixed` re-stages only those.
- **pre-commit:** the hook no longer sets `pass_filenames: false`, so pre-commit passes the staged files to `ultracite fix`. It also sets `require_serial: true`, which keeps it to a single `ultracite fix` run.

Since the globs now decide which files get fixed, the Lefthook job and the pre-commit hook match every file type the linters and formatters handle: `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, `.cts`, `.json`, `.jsonc`, `.css`, `.scss`, `.less`, `.vue`, `.svelte`, `.astro`, `.html`, `.md`, `.mdx`, `.yaml`, `.yml`, `.graphql` and `.gql`. Before, they matched only `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.jsonc` and `.css`. The pre-commit hook uses a `files` pattern instead of `types_or`, because pre-commit has no file type tags for `.jsonc`, `.mts`, `.cts` or `.gql`.

Re-running `ultracite init` with the same integrations updates the hooks, globs and file types that earlier versions wrote, in place. Hooks, globs and types you wrote or edited yourself are left alone.
