---
"ultracite": patch
---

`ultracite init --hooks` no longer rewrites an agent settings file that has a syntax error. The file was read with a parser that recovers from errors and then written back whole, so a `.claude/settings.json` with unresolved merge conflict markers, for example, came out with the markers gone and one side's `deny` rules silently chosen. Such a file is now left unchanged with a warning to fix it and re-run `init`, as editor settings files already were.
