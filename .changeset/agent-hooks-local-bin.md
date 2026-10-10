---
"ultracite": patch
---

Agent hooks now run the project's installed Ultracite directly, as `npx ultracite fix --hook` (or `pnpm exec`, `bunx` and so on), instead of the project's `fix` script. Init leaves a `fix` script alone when the project already has one that runs another tool, and the hook then ran that tool with `--hook` added. Re-running `ultracite init --hooks` rewrites hooks from earlier versions in place.
