---
"ultracite": patch
---

On Oxlint, `ultracite check` and `ultracite fix` no longer fail when given a file Oxlint doesn't lint whose path contains glob characters, such as `app/[slug]/styles.css` or `app/[slug]/data.json`. The path was taken for a glob and passed to Oxlint, which exited 1 with "No files found to lint". That broke lint-staged and editor hooks whenever the only changed file was a stylesheet, JSON or Markdown file inside a Next.js dynamic route folder. A path that exists on disk is now treated as a file, and Oxlint is skipped for it as it is for any other file it doesn't lint.
