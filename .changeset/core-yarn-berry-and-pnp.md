---
"ultracite": patch
---

`ultracite init` and `ultracite upgrade` now work in Yarn 2+ monorepos. The root install used to pass Yarn 1's `-W` flag, which Yarn 2+ rejects with "Unsupported option name", whenever the Yarn version wasn't named in `package.json`'s `packageManager` field. That happened with `--pm yarn`, with lockfile-only detection, and always in the second half of `upgrade`, which re-ran the new CLI with a bare `--pm yarn`. Ultracite now tells Yarn 2+ apart from Yarn 1 by `.yarnrc.yml` or the lockfile format. `upgrade` only forwards `--pm` to the newly installed CLI when you passed it.

`ultracite doctor` (and the check at the end of `upgrade`) no longer fails in Yarn Plug'n'Play projects just because it can't find Ultracite or the tools in `node_modules`. It warns that it can't verify them there instead.
