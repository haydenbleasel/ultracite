---
"ultracite": patch
---

Run `lefthook install` during `ultracite init` through the same spawn adapter as every other tool invocation instead of `execSync`, so it no longer goes through a shell and gets the same Windows command resolution as `husky`, the linters, and editor extension installs.
