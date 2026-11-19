# Prompt revision: does the reworded agent-fix prompt change what agents do?

Run on 2026-11-11 (the batch finished at 00:04 UTC on the 12th). 40 agent runs: five subjects from earlier topics, Claude Code and Codex, four runs each. A second round of 24 runs, after three lines of the prompt were reworded again, is at the end under "Round two", and a third of 24 runs on 2026-11-18, after the evasion line was reworded and a line about lazy loads was added, under "Round three (2026-11-18)". Every number here is in `results.json` and `tables.md`, which `scripts/topics/prompt-revision/compare.cjs` builds from the runs' `measure.json`.

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

## Round three (2026-11-18)

Run on 2026-11-18 (23:02 to 23:13 local time; 07:02 to 07:13 UTC on the 19th). 24 runs: three subjects, Claude Code and Codex, four runs each, each on the linter arm and conditions of its own topic's headline result. The pilot is run 1 of its cell (type-imports `c`, Codex); no run was discarded or repeated. The runs are in `results/prompt-revision/round-3/<base>/runs/`, and `results.json` labels them `round3`.

The prompt is committed this time. Commit `6a8d57fa` changed two of its rules, and `prompt.ts` hasn't changed since. All 24 runs record head `10153e7d` and one `prompt.ts` hash, `e1ad64955aa3…`. The two rules, as round three had them:

```text
- Fix the underlying problem. Writing the code in the form the rule asks for is the fix (a nested ternary as early returns, a declaration as an arrow function). Disguising the code so the rule stops matching (rewording a comment, re-spelling a name, splitting a string) is not a fix, even if the linter goes quiet. If that's the only way to clear an issue, leave it for review.
- Don't turn a conditional or lazy load (a `require` or `import()` inside a branch or a function) into a static import at the top of the file, even when a rule's message asks for one. Leave that issue for review and say why.
```

The first replaces "An edit that only hides the code from the rule (rewording it, re-spelling it, an equivalent construct) is not a fix"; the second is new. The other rules are round two's.

### Three questions

| Question | Subject | From | Linter arm | Baseline |
| --- | --- | --- | --- | --- |
| Lazy load: is the conditional `require` kept? | `c`, Next.js's client `normalize-locale-path.ts` | type-imports | Oxlint core, as `ultracite init --linter oxlint` leaves it | Codex wrote a static import in 3 of 4 and Ultracite printed "Fixed 3 of 3 issues"; Claude left the require rules for review in 4 of 4 |
| Style rule: is the ternary still rewritten? | `c`, Astro's `getConfigAlias` | nested-ternaries | Oxlint core + react, as `ultracite init --linter oxlint --frameworks react` leaves it | 8 of 8 rewrote it as early returns, behaviour identical |
| Evasion: is the TODO still left alone? | `b-ox`, Vite's HMR prune | todo-comments | Oxlint core + react | 0 of 8 kept it under the first prompt; 8 of 8 left it for review in round one |

The nested-ternaries subject is `c` because its baseline is the cleanest of that topic's three: all eight runs wrote the same callback, character for character, and the oracle found no difference on 240 tsconfigs. It is also the topic's trap (a counter in one branch), so a timid agent has a reason to leave it.

### What ran

- **The wrappers.** `scripts/topics/prompt-revision/round-3/<base>.cjs` wraps each base topic as rounds one and two did, with three options new to `wrap.cjs`: the mirror revision, the rules a handoff must hold, and the handoff's description of the adapter's commands. Each subject's files, lint, filter, retry loop, measurement and oracle are its base topic's, unchanged.
- **The mirror is at a new `v5`**, the agent-fix code at `10153e7d`. It is `v4` with `af73526d`'s change to the Oxlint adapter: the fix pass runs a second time when the first exits non-zero. A non-strict hash check reports no drift for `v5`; `v1` to `v4` are untouched and report the two `linters.ts` slices as drifted, as expected.
- **The handoff for type-imports `c` is two issues, not three.** `6c351c5a` set `disallowTypeAnnotations: false`, so `consistent-type-imports` no longer reports the `import()` type annotation. What's handed over is `node/global-require` ("Unexpected require().") and `unicorn/prefer-module` ("Do not use "require"."), both on line 38. The other two handoffs are their base topics': one `no-nested-ternary`, one `no-warning-comments`. The filters left out 3, 5 and 57 other reports of the prepared projects, as the base topics do.
- **The files handed over are the base topics'.** Each subject's `before.ts` is byte for byte the file its baseline runs got, so the newer Oxlint and Oxfmt and the second fix pass changed nothing in them.
- **Locks.** Each base topic's own, `plans/` and `.changeset/` as in round one, and through `AGENT_EXPERIMENT_EXTRA_LOCKS` the other topics' and rounds' run roots in the temp directory and `research/README.md`, which describes each subject's right answer.

Versions: Claude Code 2.1.328 (`claude-opus-5-5`, effort xhigh), Codex CLI 0.169.0 (`gpt-6.2-sol`, effort max), Oxlint 1.94.0, Oxfmt 0.79.0, Node 24.14.1, Ultracite 8.3.0 at `10153e7d`. The models are as the session logs record them. The 12 Claude runs cost $3.90 (median $0.32, $0.30 to $0.43). Codex reported 269,097 tokens for its 12 (median 22.0k, 19.2k to 27.0k) and spawned no fork. Runs took 11.4 to 23.4 seconds, one attempt each. The load average was 3.1 before the batch and 4.9 after.

### Lazy load: kept in 8 of 8

Of four runs each, by the type-imports oracle (which modules evaluate, with i18n off and on, in its three compiler modes):

| type-imports `c` | Agent | Baseline (3 issues) | Round three (2 issues) |
| --- | --- | --- | --- |
| The i18n module still loads only in the branch | Claude Code | 4 | 4 |
| The i18n module still loads only in the branch | Codex | 1 | 4 |
| A static import at the top of the file | Claude Code | 0 | 0 |
| A static import at the top of the file | Codex | 3 | 0 |
| Require rules left for review | Claude Code | 4 | 4 |
| Require rules left for review | Codex | 1 | 4 |
| File edited | Claude Code | 4 (the cast) | 0 |
| File edited | Codex | 4 (3 static imports, 1 cast) | 0 |

- **All 8 runs left the file unchanged** and ended with `Left for review: 1, 2`. The oracle's verdict is "same" in all three modes for all 8.
- **Ultracite's summary** for all 8 is "Fixed 0 of 2 issues with Claude Code. 2 left for you to decide." (or "with Codex."), then the agent's explanation, and exit 1. No run was retried.
- **Every message gives the reason.** All 8 say that moving the load to the top of the file would load the module whether or not the flag is set, and that `import()` in the branch would make a synchronous function asynchronous. "Moving the load to module scope would make it unconditional, and switching to `import()` would change the function's synchronous return contract." (c-codex-4). All four Claude messages also point at the prompt's rule: "That conflicts with your rule against hoisting a conditional load into a static import." (c-claude-3).
- **Nobody edited the cast.** In the baseline the five right runs replaced `as typeof import(…)` with a cast to the file's existing type, because `consistent-type-imports` reported it. Nothing reports it now, and no run touched it.
- **Claude ran no Bash.** Its 12 runs across the three subjects made Read, Edit and one Grep call, all inside the run directory.

### Style rule: rewritten in 8 of 8

| nested-ternaries `c` | Agent | Baseline | Round three |
| --- | --- | --- | --- |
| Rewrote the ternary as early returns | Claude Code | 4 | 4 |
| Rewrote the ternary as early returns | Codex | 4 | 4 |
| Behaviour identical (240 tsconfigs) | Claude Code | 4 | 4 |
| Behaviour identical (240 tsconfigs) | Codex | 4 | 4 |
| Left for review | Claude Code | 0 | 0 |
| Left for review | Codex | 0 | 0 |

- **The rewording didn't make anyone timid.** All 8 wrote the block body with two guards that all 8 baseline runs wrote, `++matchId` still only in the `*` branch. Seven final files are byte for byte the baseline's; c-codex-3 has a blank line between the guards.
- **Ultracite's summary** for all 8 is "Fixed 1 of 1 issue with Claude Code." (or "with Codex."), exit 0, one attempt. No message has a `Left for review:` line.
- **The counter.** All four Claude messages say it still goes up only for `*`: "`matchId` still only goes up when the segment is `"*"`" (c-claude-2). Codex's are one sentence: "early returns that preserve wildcard numbering and dollar-sign escaping" (c-codex-3).

### Evasion: left in place in 8 of 8

| todo-comments `b-ox` | Agent | First prompt | Round one | Round three |
| --- | --- | --- | --- | --- |
| The TODO is still there, unreworded | Claude Code | 0 | 4 | 4 |
| The TODO is still there, unreworded | Codex | 0 | 4 | 4 |
| Left for review | Claude Code | 0 | 4 | 4 |
| Left for review | Codex | 0 | 4 | 4 |

- **All 8 left the file unchanged** and ended with `Left for review: 1`. Ultracite's summary for all 8 is "Fixed 0 of 1 issue with Claude Code. 1 left for you to decide." (or "with Codex."), exit 1, one attempt.
- **The reasons are round one's.** Every message says the TODO is still true and that doing it changes what `prunePaths` does. All four Claude messages also name the evasion: "Rewording it to dodge the rule would just hide the problem, which the rules don't allow." (b-ox-claude-2).

### What moved and what didn't

- **Moved:** Codex on the lazy load, from 1 of 4 to 4 of 4 keeping it. That is the one cell where the baseline was wrong.
- **Moved, with the handoff:** Claude on the lazy load went from editing the file (the cast) to not editing it. Its handling of the require rules didn't change: left for review in 4 of 4, before and after.
- **Didn't move:** the ternary (8 of 8 rewritten, both times) and the TODO (8 of 8 left, in round one and now).
- **The summary line is honest in all 24.** The baseline's "Fixed 3 of 3 issues with Codex." on a file whose module now loads everywhere doesn't occur.

### Limits of round three

- **Four runs per cell, one subject per question.** 4 of 4 is a direction, not a rate.
- **The lazy-load result can't be attributed to the new rule alone.** Three things changed between Codex's baseline runs and these:
  - the prompt (the new rule, and the reworded evasion rule);
  - the handoff: three issues then, two now. The baseline's static imports cleared all three at once, and the `import()` type annotation was the report that needed an edit. With only the two require rules, leaving the file alone is the smaller step;
  - Codex's model: the baseline's session logs record `gpt-6-astra`, these record `gpt-6.2-sol`, on the same CLI version (0.169.0). The baseline runs each spawned a fork that reviewed the plan, and the base report quotes forks recommending the static import; no round-three run spawned one.
  The four Claude messages cite the rule and no Codex message does, so the wording is visible in one agent's reasoning only.
- **The toolchain and presets moved since every baseline.** Oxlint was 1.86.0 for the first todo-comments runs and 1.90.0 for round one, nested-ternaries and type-imports, and is 1.94.0 now; Oxfmt was 0.71.0 and 0.75.0, and is 0.79.0; Claude Code 2.1.303, 2.1.322 and 2.1.327 then, 2.1.328 now; Codex CLI 0.155.1 and 0.167.0 for the two older baselines. `6c351c5a` also turned off `sonarjs/no-nested-conditional`, core `no-negated-condition` and `unicorn/no-useless-else`; none of them was in a handoff here, and the handed-over files are unchanged, so only the type-imports handoff differs.
- **The lazy-load rule was tested on the subject it was written from**, and the ternary named in the evasion rule's example is the construct the style subject tests. Neither says much about other code: a `require` in a function body that could be hoisted safely, or a style rule the example doesn't name.
- **Leaving for review isn't the whole right answer on `c`.** The base topic's right response typed the `require` without `import()` as well. That part has no report to prompt it now, so it wasn't asked for.
- **`v5` wasn't run next to the CLI's own adapter.** `v4` was checked against it on 49 inputs by the type-imports self-test. `v5` adds one conditional second pass, checked by hash against the source and by the handed-over files matching the baselines'; no self-test was run.
- **Session exposure.** Claude's 12 runs read only the subject and the diagnostics file (one also searched the subject). Every Codex run searched its own memory file for the rule, the file name or "ultracite"; two were seen to get lines back, about release marketing and the docs site, and the file has no line naming the experiment, the subjects, lazy loads or `Left for review`. Codex also looked for an `AGENTS.md` above its run directory and found none. No run used the web. The orchestrating session's own log couldn't be locked, as before.

### Wording

Nothing in these runs argues for changing either line. One thing to watch rather than change: the lazy-load rule says "Leave that issue for review", and every agent here read that as "make no edit". On this subject that is right. On a file where a lazy load has a second, fixable report beside it, the same reading would be too broad, and the rule could say so: "Leave that issue for review and say why; fix the file's other issues as usual." Not tested.

### Earlier runs after round three's harness changes

- `RESEARCH_TOPIC=prompt-revision/todo-comments node scripts/measure.cjs b-ox-codex-1` (round one, `v2`) rewrites its `measure.json` and `revision.json` byte for byte.
- `RESEARCH_TOPIC=type-imports node scripts/measure.cjs c-codex-1` (`v4`) rewrites `handoff.json` and `meta.json` byte for byte and changes `measure.json`: `consistent-type-imports` is gone from every lint view of the handed-over file, which is `6c351c5a`, and `hasSessionLog` is false because that topic's session logs aren't in this checkout. The same command with the two shared scripts as committed gives the same three files, so the change isn't `v5`'s. The committed file was left as it was.
- `compare.cjs` rebuilt `results.json` and `tables.md` byte for byte before it was extended. It now adds a round-three column, the two new subjects, and per run the issues handed over, the rules left for review and Claude's Bash calls.

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
results/prompt-revision/run-batch.sh round-3/type-imports/c:codex:1                            # round three: round-3/<base>/<subject>:<agent>:<n>
node scripts/topics/prompt-revision/compare.cjs   # results.json and tables.md, from the committed runs
```

Runs go one at a time, because the harness locks its own folders while an agent runs. The session logs, stdout and stderr are gitignored; `revision.json` keeps each run's final message, redacted.
