---
"ultracite": minor
---

`ultracite init --agents` no longer stops on an agent ID it doesn't know. Every agent reads the rules from `AGENTS.md`, so an unknown, retired or misspelled ID gets that file, as `universal` does, with a warning that lists the valid IDs. The old IDs of renamed agents and editors (`amazon-q-cli`, `mux`, `kimi-cli`, `snowflake-cortex` and `windsurf`) map to the new ones with a note to switch. `--editors` and `--hooks` still stop on an ID they don't know.
