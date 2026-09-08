---
"ultracite": patch
---

Disable `github/filenames-match-regex` for file-based route directories (`**/routes/**`) in the oxlint js-plugins preset, matching the existing `unicorn/filename-case` exemption in the TanStack preset. TanStack Router filenames such as `__root.tsx`, `$.tsx`, and `posts.$postId.tsx` no longer fail the GitHub filename rule. Resolves #799.
