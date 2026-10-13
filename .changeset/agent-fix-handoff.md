---
"ultracite": patch
---

`ultracite fix --claude` and `--codex` hand agents better information and report results more accurately:

- Rule names reach the agent as they're written in the config, such as `no-unused-vars` and `typescript/no-explicit-any`, instead of Oxlint's `eslint(no-unused-vars)`.
- ESLint diagnostics now carry the rule's description and documentation URL, read with the `json-with-metadata` formatter. Biome diagnostics carry the rule's documentation URL and its description from `biome explain`, since Biome's JSON reporter includes no help text.
- The prompt tells the agent that the run is non-interactive, so it explains a decision it can't make in its final message instead of asking a question and waiting for an answer that can't come.
- Files are handed over in path order, so the same project gets its fix in the same file on every run. Before each file after the first, Ultracite lints it again: an earlier file's fix can clear its issues (breaking an import cycle fixes both files), and the agent was being handed diagnostics that no longer applied. A file with nothing left is skipped.
- A file the agent deleted, or one that no longer parses, now counts as unfixed. Before, its issues could disappear from the report and show as fixed.
