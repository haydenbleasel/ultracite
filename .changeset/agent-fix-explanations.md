---
"ultracite": patch
---

`ultracite fix --claude` and `--codex` now show what the agent said, and give it better instructions for the cases where the obvious edit is the wrong one.

- The end of the agent's final message is printed under each file. It used to be shown only when the agent left an issue for you, so a note such as "this looks like a real bug, I left it alone" never reached you.
- When the agent leaves issues for you, the summary says so: "Fixed 3 of 5 issues with Claude Code. 2 left for you to decide." The command still exits non-zero for them, as `ultracite check` would.
- The prompt no longer tells the agent to preserve runtime behavior for every rule. Style rules keep that instruction, but when a rule reports a bug, such as a promise nobody awaits, fixing the behavior is the point. If a fix would change behavior that may be intended, the agent leaves the issue for you and says why.
- The prompt names edits that only hide code from a rule (rewording a comment, re-spelling an identifier, an equivalent construct) as not a fix, and says that leaving an issue is a valid result when the rule's help text doesn't fit the code or the proper fix is in another file. It also tells the agent not to run the linter itself, since the file is re-linted after every attempt.
- Each attempt gets 10 minutes instead of 5. The slowest correct fixes in our research runs took between five and six.
- With Oxlint's `js-plugins` preset, rules from `eslint-plugin-sonarjs`, `eslint-plugin-github` and `oxlint-plugin-react-doctor` now reach the agent with the rule's description and documentation URL, read from the plugin installed in your project. Oxlint reports neither for JS-plugin rules.
