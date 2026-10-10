---
"ultracite": major
---

`ultracite init` has a `--yes` (`-y`) flag for running without prompts, and `--quiet` now only controls output.

- `--yes` takes the default for every question no flag answers, without asking. Init does this on its own when `CI` is `true` or `1`, or when there's no terminal to answer prompts in, so it never waits for input in a pipeline.
- `--quiet` leaves out the intro banner, spinners and progress messages, and no longer skips the prompts. A script that ran `init --quiet` to avoid them should pass `--yes --quiet`.
- Warnings now print in quiet runs too, such as the one for a `check` or `fix` script that init left as it was because it runs another tool.
