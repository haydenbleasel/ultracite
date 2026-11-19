---
"ultracite": patch
---

The agent rules that `ultracite init` writes (`AGENTS.md`, `CLAUDE.md` and the editor rules files), and the code standards in the bundled skill, now say what the presets enforce about conditionals:

- "Prefer simple conditionals over nested ternary operators" is now "Use a single ternary for a choice between two values. For three or more outcomes, use early returns or a lookup; never nest ternaries".
- "Use early returns to reduce nesting" now adds "and put braces around every `if` body, including a one-line guard".
- The React and JSX section has a new line: "In JSX, work out a multi-way condition in a variable or helper above the `return`, not in a chain of ternaries".

Existing projects get the new wording by running `ultracite init` again.
