---
"ultracite": patch
---

The Husky pre-commit hook written by `ultracite init --integrations husky` is more robust.

- The hook now runs the project's installed tools (`npx`, `yarn`, `pnpm exec`, `bunx`) instead of `yarn dlx` / `pnpm dlx`. `yarn dlx` does not exist in Yarn 1, so every commit failed with "Ultracite found issues that could not be auto-fixed", and `pnpm dlx` downloaded the latest release instead of the version the project pins. Husky itself is also initialised with the installed binary.
- Installing Husky now chains `husky` onto an existing `prepare` script (for example SvelteKit's `svelte-kit sync || echo ''`) instead of replacing it. Choosing Husky and lefthook together no longer leaves only one of them in `prepare`.
- When nothing is staged, the hook no longer exits early, so commands you keep after the Ultracite section still run.
- Re-running init replaces the Ultracite section of a hook saved with CRLF line endings instead of appending a second one. It also no longer drops the last line of a hook that only mentions "# ultracite" in a comment. Commands after a lint-staged section written by an older version are kept.
