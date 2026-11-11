---
"ultracite": patch
---

`ultracite fix --claude` and `--codex` now recognise an issue that's still reported after the agent's edit when its message changed only by a number, or when the same rule reports several times with the same message.

- A limit rule such as `max-lines-per-function`, `max-statements`, `max-params` or `complexity` puts the count in its message ("too many lines (88)"). A function the agent cut from 88 lines to 55 was counted as one issue fixed and one new issue, and the retry told the agent its edit had "resolved the issues it was given". It's now the same issue, still reported.
- Rules such as `typescript/no-explicit-any` give every report the same message. When an edit added new reports above the original ones, the retry called the agent's new ones "still reported" and pointed at the untouched originals as "new since the previous edit". Reports are now matched by the line of code they're on first, and by their order in the file only when that line changed.
