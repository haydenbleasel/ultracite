---
"ultracite": patch
---

The prompt `ultracite fix --claude` and `ultracite fix --codex` give the agent has two changes.

It now separates rewriting code from disguising it. Writing the code in the form a rule asks for is the fix: a nested ternary as early returns, a declaration as an arrow function. Disguising code so the rule stops matching, by rewording a comment, re-spelling a name or splitting a string, is not, and the agent leaves the issue for review when that is the only way to clear it. The earlier wording listed "an equivalent construct" among the things that aren't a fix, which read as ruling out the rewrite the rule wanted.

It also tells the agent not to turn a conditional or lazy load, a `require` or `import()` inside a branch or a function, into a static import at the top of the file, even when a rule's message asks for one. The agent leaves that issue for review and says why.
