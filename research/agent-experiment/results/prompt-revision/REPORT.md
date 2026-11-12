# Prompt revision: does the reworded agent-fix prompt change what agents do?

Run on 2026-11-11 (the batch finished at 00:04 UTC on the 12th). 40 agent runs: five subjects from earlier topics, Claude Code and Codex, four runs each. A second round of 24 runs, after three lines of the prompt were reworded again, is at the end under "Round two". Every number here is in `results.json` and `tables.md`, which `scripts/topics/prompt-revision/compare.cjs` builds from the runs' `measure.json`.

## What was tested

The earlier experiments found four cases where `ultracite fix --claude/--codex` got the wrong result and the prompt was part of the reason. The prompt in `packages/cli/src/agent-fix/prompt.ts` was reworded on 2026-11-11. This check re-runs one subject for each case, plus a control, and compares the result with that subject's committed runs.

The prompt under test wasn't committed when the runs were made. Every run's `meta.json` records the repository head (`2bd7aaad`) and the SHA-256 of `prompt.ts` (`ca3284548cf1…`, the same in all 40). Each run's `prompt.txt` is the prompt the agent got. Its rules, in full:

```text
Rules:
- Edit only the file above. Do not create, delete, or modify any other file. If the proper fix needs changes outside this file (an import cycle, a barrel file), don't work around it here: leave the issue for review and say what the fix is.
- Make the minimal change that resolves each issue. For a style rule, keep runtime behavior the same. When a rule reports a bug (a lost rejection, a missing `await`, a missing dependency), fixing that behavior is the point. If a fix would change behavior and it isn't clear that's intended, leave the issue for review and say why.
- Fix the underlying problem. An edit that only hides the code from the rule (rewording it, re-spelling it, an equivalent construct) is not a fix, even if the linter goes quiet. If that's the only way to clear an issue, leave it for review.
- The JSON file has each rule's help text, which describes the usual fix. When that fix doesn't fit this code (a TODO that's still true, a long function that reads clearly top to bottom, key or declaration order the code depends on), leaving the issue for review is a valid result: the minimal change can be no change.
- Do not add suppression comments (// oxlint-disable, // eslint-disable, // biome-ignore) or change lint configuration.
- Do not reformat unrelated code.
- Don't run the linter or other commands to check your edit. The file is re-linted when you finish, and you get another attempt if anything is still reported.
- This run is non-interactive: nobody can answer a question or approve a step. Don't ask for input or wait for a reply. To leave an issue for review, explain why in your final message, and end the message with a line listing the numbers of the issues you left, like `Left for review: 2, 3`.
```

The rules file `ultracite init` writes was reworded the same day. It isn't tested here: none of the five base topics gave agents a rules file, so none was given in these runs either. Only the prompt and the loop around it changed.

## Method

Each subject runs through its own topic's harness, unchanged: the same subject file, lint, handoff, retry loop where the topic has one, measurement and behavior oracle. `scripts/topics/prompt-revision/<base>.cjs` wraps the base topic's module, and `RESEARCH_TOPIC=prompt-revision/<base>` keeps the runs under `results/prompt-revision/<base>/runs/`. Nothing of a base topic is copied.

| Subject | From | Linter and rule | Retry loop | The old result |
| --- | --- | --- | --- | --- |
| `fp1` | floating-promises | ESLint with types, `no-misused-promises` | no | 8 of 8 silenced the rule and kept the bug |
| `b-ox` | todo-comments | Oxlint core + react, `no-warning-comments` | yes | 8 of 8 removed the marker; Codex deleted the comment in 4 of 4 |
| `a` | length-limits | Oxlint core, `max-lines-per-function` on | yes | 8 of 8 split a function that reads top to bottom |
| `a` | react-effects | Oxlint react, `exhaustive-deps` | yes | 7 of 8 listed the dependencies, which resubscribes on every render |
| `dc2` | dead-code | ESLint core, `no-useless-assignment` | no | 8 of 8 deleted the leftover (the control) |

- **One arm per subject**, the Oxlint default arm where the base topic had more than one.
- **The mirror.** `scripts/ultracite-adapters.cjs` copies the parts of agent-fix the harness can't import. It now has two revisions. `v1`, the default, is the code every earlier topic ran. `v2` is the working tree's: diagnostics matched with numbers left out of the message and by source line, the 10-minute timeout, the summary line that counts issues left for review, the final message, and plugin help for Oxlint JS-plugin rules. These runs use `v2`. The prompt itself isn't mirrored: `run-one.mjs` imports it from `prompt.ts`.
- **Outcome.** The base topic's own verdict, from its oracle. "Right" follows the base topic's `subjects.json`.
- **Left for review.** For the three topics with the retry loop, what `parseLeftForReview` found, as the base topic records it. For the other two, the final message is read the same way in `revision.json`.
- **Ultracite's summary line.** For the retry-loop topics it's the mirror's `fileOutcome`. For the other two it's derived from the re-lint and marked "(derived)" in `tables.md`.
- **Locks.** On top of each base topic's locks, `plans/` and `.changeset/` were unreadable while an agent ran, since both describe the expected outcomes.

Versions: Claude Code 2.1.322, Codex CLI 0.167.0, Oxlint 1.90.0, Node 24.14.1. The base topics that record a model report `claude-opus-5-5` and `gpt-6-astra`, before and after. The 20 Claude runs cost $11.42 in all. The one pilot per subject is run 1 of its cell; no run was discarded or repeated.

## Results

Runs with the right result, of four:

| Subject | Agent | Before | After |
| --- | --- | --- | --- |
| `fp1`, a lost rejection | Claude Code | 0 | 4 |
| `fp1`, a lost rejection | Codex | 0 | 4 |
| `b-ox`, a TODO recording a live bug | Claude Code | 0 | 4 |
| `b-ox`, a TODO recording a live bug | Codex | 0 | 4 |
| `a`, a long function that reads fine | Claude Code | 0 | 0 |
| `a`, a long function that reads fine | Codex | 0 | 0 |
| `a`, a missing dependency that's a bug | Claude Code | 0 | 0 |
| `a`, a missing dependency that's a bug | Codex | 0 | 0 |
| `dc2`, the control | Claude Code | 4 | 4 |
| `dc2`, the control | Codex | 4 | 4 |

### The lost rejection: fixed in 8 of 8

Before, all 8 runs kept the bug: 7 added `void` and 1 added a `.catch` that only rethrows, and a failure in a queued call left the caller waiting forever. After, all 8 pass the rejection to the caller, and no run added `void`, a suppression or a rethrowing handler. The happy path is unchanged in all 8.

The oracle's verdict for all 8 is "rejects caller, slot still leaks". That's a second problem in the same function, which the linter doesn't report: a task that throws never frees its slot in the pool. All 4 Claude runs described it in their final message and left it, because lint hadn't reported it. No Codex message mentions it.

One Claude run (`fp1-claude-2`) fixed the bug with a `.catch(reject)` whose `reject` may be undefined, which `no-floating-promises` then reports. This topic runs one attempt, so the run ends there; Ultracite would retry with that as a new issue.

### The TODO on a live bug: left in place in 8 of 8

Before, no run kept the TODO: Codex deleted the comment in 4 of 4, and Claude dropped the marker and kept the text in 4 of 4. After, all 8 left the file unchanged and ended with `Left for review: 1`, each saying the TODO is still true and that doing it changes runtime behavior.

Ultracite's summary for all 8 is "Fixed 0 of 1 issue with Codex. 1 left for you to decide." (or Claude Code), with the agent's explanation, and the command exits 1. No run was retried.

### The long function that reads fine: no change

All 8 runs split the function, as before. All 8 needed a retry for rules the new helpers tripped, as before, and one Claude run needed a third attempt. Behavior held in all 8. No run left the issue for review, and no final message discusses whether the function was better left alone.

### The dependency that's a real bug: no change

All 8 runs listed the missing dependencies, which the oracle scores as "partly fixed, resubscribes on every render". Before, 7 of 8 did that and one Claude run kept the bug behind a ref.

All 4 Claude messages now name the change, for example "React's own `useSyncExternalStore` resubscribes when `subscribe` changes", and judge it intended. None left it for review. The Codex messages are two or three sentences and don't mention it.

### The control: unchanged

All 8 runs deleted the leftover, behavior identical, the re-lint clear. No run left anything for review.

## What the wording did and didn't do

- **The bug line worked.** "When a rule reports a bug (a lost rejection, a missing `await`, a missing dependency), fixing that behavior is the point" took `fp1` from 0 of 8 to 8 of 8.
- **The same line may be why the effect subject didn't move.** It names "a missing dependency" as a bug to fix, and listing the dependencies is the fix it points at. The agents did what it says. The better fix here needs a judgment the prompt doesn't ask for: whether adding the dependency changes when the effect runs.
- **The help-text line worked for the TODO and not for the long function.** Both are named in it as examples. Every agent took the TODO example and no agent took the function one. A TODO that's still true can be checked against the code. Whether a long function "reads clearly" is an opinion, and the help text's "consider splitting" was the easier instruction to follow.
- **Nothing backfired on the control.** No ordinary fix was left for review in 8 runs. One subject is a thin check on this.
- **Claude now ends every message with a `Left for review:` line**, writing `Left for review: none` when it left nothing (16 of 16 such runs). `parseLeftForReview` ignores a line with no numbers, so this changes nothing in the tally, but the line shows in the message Ultracite now prints.

Possible rewordings, not tested:

- **Size limits.** Replace the example with an instruction: "Before splitting a function to meet a size limit, decide whether the split makes it easier to read. If it doesn't, leave the issue for review."
- **Hook dependencies.** Take "a missing dependency" out of the list of bugs, and add: "Before adding a hook dependency, check whether it changes when the effect runs. If it does and that isn't clearly intended, leave the issue for review."
- **The closing line.** Say the `Left for review:` line is only for when something was left.

## Limits

- **Four runs per cell.** A result of 4 of 4 or 0 of 4 is a direction, not a rate.
- **One subject per case.** `fp2`, the other floating-promises subject, and the other TODO, length and effect subjects weren't re-run. Subjects where leaving the issue is the wrong answer, other than the control, weren't run at all.
- **More than the prompt differs from the old runs.** The CLIs are newer (Claude Code 2.1.296–2.1.310 then, 2.1.322 now; Codex 0.155.1 then, 0.167.0 now), Oxlint went from 1.86.0 to 1.90.0, and the presets changed in between. The handoff for each subject is the same rule as before, and the control didn't move, but an effect of a newer CLI can't be told from an effect of the prompt.
- **The prompt changed in several places at once.** Which sentence did what is an inference from what the agents wrote, not a measurement.
- **Two subjects ran one attempt.** The floating-promises and dead-code topics predate the retry loop in the harness, so `fp1-claude-2`'s new diagnostic wasn't handed back.
- **Re-measuring pairs repeated diagnostics in file order.** `v2` of the mirror matches by source line during a run. A re-measurement from the committed JSON has no source lines, so it falls back to file order. No run here has two reports of one rule and message.
- **Session exposure.** The agents ran on the machine and account that wrote the prompt, the same day. Each run's `measure.json` records what its session log shows it could see (`cheating`), as in the base topics. The orchestrating session's own log couldn't be locked.

## Round two

Run on 2026-11-12 (00:05 to 00:43 UTC), after round one's three suggested rewordings were made. 24 runs: the two subjects that hadn't moved and the control, Claude Code and Codex, four runs each, on the same arms and through the same harness. No pilot was run and no run was discarded or repeated. The runs are in `results/prompt-revision/round-2/<base>/runs/`, and `results.json` labels them `round2`.

The prompt was again uncommitted. All 24 runs record head `2bd7aaad` and one `prompt.ts` hash, `ca44ee2d0b83…`; round one's 40 record `ca3284548cf1…`. Each run's own `prompt.txt` holds the full text it got, so both rounds stay recoverable. Nothing else differs from round one: the mirror is the same `v2` (the prompt isn't part of it), and the CLIs, Oxlint and presets are the same.

The lines that changed, as round two had them:

```text
- Make the minimal change that resolves each issue. For a style rule, keep runtime behavior the same. When a rule reports a bug (a lost rejection, a missing `await`), fixing that behavior is the point. If a fix would change behavior and it isn't clear that's intended, leave the issue for review and say why.
- The JSON file has each rule's help text, which describes the usual fix. When that fix doesn't fit this code (a TODO that's still true, key or declaration order the code depends on), leaving the issue for review is a valid result: the minimal change can be no change.
- Before adding a dependency to a hook, check whether it changes when the effect or memo runs. If it does and that isn't clearly intended, leave the issue for review.
- Before splitting a function to meet a size limit, decide whether the split makes the code easier to read. If it doesn't, leave the issue for review.
- This run is non-interactive: nobody can answer a question or approve a step. Don't ask for input or wait for a reply. To leave an issue for review, explain why in your final message, and end the message with a line listing the numbers of the issues you left, like `Left for review: 2, 3`. Leave that line out when you left nothing.
```

"A missing dependency" is gone from the first line's list of bugs, "a long function that reads clearly top to bottom" is gone from the second line's examples, the two "Before…" lines are new, and the last sentence is new.

### What the agents did

Of four runs each:

| Subject | Agent | Old prompt | Round one | Round two |
| --- | --- | --- | --- | --- |
| length-limits `a`: left for review | Claude Code | 0 | 0 | 0 |
| length-limits `a`: left for review | Codex | 0 | 0 | 0 |
| length-limits `a`: split the function | Claude Code | 4 | 4 | 4 |
| length-limits `a`: split the function | Codex | 4 | 4 | 4 |
| react-effects `a`: left for review | Claude Code | 0 | 0 | 4 |
| react-effects `a`: left for review | Codex | 0 | 0 | 4 |
| react-effects `a`: added the dependencies | Claude Code | 3 | 4 | 0 |
| react-effects `a`: added the dependencies | Codex | 4 | 4 | 0 |
| dead-code `dc2`: deleted the leftover, nothing left for review | Claude Code | 4 | 4 | 4 |
| dead-code `dc2`: deleted the leftover, nothing left for review | Codex | 4 | 4 | 4 |

The fourth Claude run on react-effects `a` under the old prompt kept the bug behind a ref.

- **The size-limit line still doesn't move anything.** All 8 runs split the function on the first attempt and all 8 needed one retry for the rules the helpers tripped, as in both earlier sets. Three of the 8 final messages mention readability, and each says the split helps: "I think the split helps readability, because the port order is its own step and now has a name." The agents made the judgment the line asks for and came down on the side of splitting.
- **The hook line moves everything.** All 8 runs left the file unchanged and listed both issues for review. Each says adding `subscribe` and `getSnapshot` would make the effect resubscribe when they change, and that nothing in the file shows that's wanted. Ultracite's summary for all 8 is "Fixed 0 of 2 issues with Claude Code. 2 left for you to decide." (or Codex), with the agent's explanation, and the command exits 1. No run was retried.
- **The control is unchanged.** All 8 deleted the leftover, behavior identical, the re-lint clear, nothing left for review.
- **`Left for review: none` is gone.** No round-two message ends with a `Left for review:` line that lists nothing (0 of 16 runs that left nothing; it was 16 of 16 Claude runs in round one). The 8 runs that did leave issues all wrote the line with their numbers.

### Is the hook line an overshoot?

On this subject it trades one imperfect result for another. The warning points at a real bug: the hook keeps the first `subscribe` and `getSnapshot` forever. In round one every run made the half-fix and Ultracite reported it as fixed. In round two no run changes the code, the bug stays, and the user is told why and what the choices are. No run made the full fix the base topic calls right (resubscribe when `subscribe` changes, without doing it on every render), in any of the three sets.

Whether the line makes agents leave dependencies they should add wasn't measured. Any added dependency changes when an effect runs, so the line's first test is always met, and everything rests on "isn't clearly intended". In all 8 runs here the agents read an effect with an empty array as deliberate. The control has no hooks, so it can't catch this. The corpus work for the React effects post found that adding the dependency was the best fix for 30% of flagged hooks; a subject of that kind is the missing check.

### Limits of round two

- Four runs per cell, one subject per case, as in round one.
- The two "Before…" lines were tested on the one subject each was written from. That they work, or don't, on the subject that prompted them says little about other code.
- The other react-effects subjects weren't run: `b`, where the obvious fix breaks the component, and `c`, a deliberate omission. Leaving for review is the right result on both, so they'd show whether the line helps there, not whether it overshoots.

### Further wording, not tested

- **Size limits.** A third rewording is unlikely to help. Two different phrasings left 16 of 16 runs splitting, and the agents that addressed readability judged the split an improvement. If the function should be left alone, the prompt would have to say when, for example "A function that runs top to bottom as a list of independent steps is not easier to read split into helpers; leave it for review." That's a rule about code style, which is a product decision more than a wording fix.
- **Hook dependencies.** To guard against leaving dependencies that should be added, the line could name the case it's for: "Before adding a dependency to a hook, check whether it makes the effect or memo run more often than it does now, such as a function or object the caller creates on every render. If it does and that isn't clearly intended, leave the issue for review. A dependency whose changes the effect is meant to follow should be added." This needs a run on a subject where adding is right before it replaces the tested line.

## Earlier topics still reproduce

Round one's runs re-measure the same after the prompt changed again: `RESEARCH_TOPIC=prompt-revision/todo-comments node scripts/measure.cjs b-ox-codex-1` rewrites its `measure.json` and `revision.json` byte for byte. A measurement reads the run's saved prompt and never rebuilds it.

The mirror's `v1` is the code as it was. `RESEARCH_TOPIC=length-limits node scripts/measure.cjs c-claude-2`, the run where a count in a message matters to `diff.ts`, rewrites its committed `measure.json` byte for byte.

Two other re-measurements did change, for a reason that isn't the mirror: `todo-comments` `b-ox-codex-1` and `floating-promises` `fp1-claude-1` now count different rules in the full-preset views, because the presets in the working tree changed on 2026-11-11 (`sonarjs/todo-tag` and `unicorn/name-replacements` off, a Biome class rule on). The committed files were left as they were. Anyone re-aggregating an earlier topic after those preset changes land will see the same drift.

A new run of an earlier topic now fails `checkSources`, since agent-fix no longer matches `v1`. That's the check working: such a run needs `ULTRACITE_MIRROR=v2`.

## Reproducing

From `research/agent-experiment/`:

```sh
results/prompt-revision/run-batch.sh floating-promises/fp1:claude:1 todo-comments/b-ox:codex:1   # ...<base>/<subject>:<agent>:<n>
results/prompt-revision/run-batch.sh round-2/react-effects/a:claude:1                          # round two: round-2/<base>/<subject>:<agent>:<n>
node scripts/topics/prompt-revision/compare.cjs   # results.json and tables.md, from the committed runs
```

Runs go one at a time, because the harness locks its own folders while an agent runs. The session logs, stdout and stderr are gitignored; `revision.json` keeps each run's final message, redacted.
