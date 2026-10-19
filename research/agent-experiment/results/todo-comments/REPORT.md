# TODO comments: agent experiment report

The agent experiment for the TODO-comments post, run on 2026-10-19 (UTC) with Claude Code 2.1.303 (claude-opus-5-5, effort xhigh) and Codex CLI 0.155.1 (gpt-6-astra, reasoning effort xhigh). The generated tables are in `tables.md`; every number below is in `results.json`, and the hand classification is in `classifications.json`.

Questions:

1. Given Ultracite's handoff for a TODO comment, what do the agents do with a marker whose task is done (subject A), one that records a known bug (B), and one waiting on an upstream bug (C)?
2. Does the js-plugins handoff, which adds sonarjs's "Complete the task associated to this "TODO" comment.", change the response?
3. What do Ultracite's retry loop and its `Left for review:` line do with each?
4. Does the information the TODO carried survive the edit?
5. What do the agents say about runtime behaviour, what the TODO means, and whether to keep it?

## TL;DR

- **No run did the task, changed behaviour, suppressed a rule, touched another file or changed config.** The oracle found every final file's behaviour the same as the subject's in all 48 runs.
- **47 of 48 runs removed the marker. One left it for review.** Ultracite printed "Fixed N of N issues" for all 47.

  | Subject | The right response | Claude Code (8 runs) | Codex (8 runs) |
  | --- | --- | --- | --- |
  | A, obsolete | drop the marker | deleted 5, kept a description 3 | deleted 8 |
  | B, a known bug | leave it for review | rewrote it as a description 5, `Note:` 2, **left for review 1** | deleted 8 |
  | C, on hold | leave it for review | reworded 8, WebKit link kept in 8 | reworded 8, WebKit link kept in 8 |

  - **A was right in all 16.** Every run said the restart is already implemented.
  - **B's known bug lost its only record in 8 of 16 runs**, all Codex. Codex said "Removed the flagged TODO comment from `hmr.ts`, resolving both issues without changing runtime behavior" and never mentioned the missing dispose callbacks.
  - **Claude kept the gap in 7 B runs, as a description of current behaviour:** "Only their prune callbacks run here; their dispose callbacks are not triggered." That's true, but it no longer reads as a bug to fix, and no tool will find it again. One Claude run said so itself: "The task itself is still not done, and the comment no longer reads as a TODO."
  - **C kept the bug link in all 16 runs. 9 kept the condition** ("until … gets resolved", "while … is unresolved"). The other 7 turned it into a permanent explanation: "Omit extension restrictions so iOS users can open `.excalidraw` files. See https://bugs.webkit.org/show_bug.cgi?id=34442."
- **The `Left for review:` line was used once in 48 runs** (`b-js-claude-3`, both issues). That run gave the only "Fixed 0 of 2 issues" and the only exit code 1, and its explanation is the only one Ultracite would print.
  - It read the prompt's restyling rule as ruling out a rewording: "Rewording it to avoid the word "TODO" is the kind of restyling your rules exclude, and deleting it would lose that record."
  - 10 runs cited the help text, "Remove or rephrase this comment", as their reason (hand classification).
- **The retry loop never ran.** Deleting or rewording the comment clears both rules on the first attempt. Every run took one attempt.
- **The js-plugins wording didn't change what agents did.** No run tried to "complete the task". Outcomes per subject were the same with and without it.
  - In C, all four Claude runs with it explained why the task can't be done in this code; none without it did.
  - The condition to wait for survived in 2 of 8 js-plugins C runs and 7 of 8 without (small n; a hypothesis).
- **Claude knew the later upstream fix.** 5 of 8 Claude runs on B said Vite later made `prunePaths` async and awaited the dispose callbacks, which is what vitejs/vite#15782 did. Nothing in the run dir says so; it's the model's training data (§6).
- **No exposure through files.** No tool call read a locked path, the corpus, a clone, an installed Vite, another run, the scratchpad, the bibliography or the literature agent's notes. Every lock was restored after every batch.
- **Ultracite issues** (§9): the help text and the "Fixed" tally reward removing the marker; a TODO left for review fails `ultracite fix` and is handed back on the next run; explanations are discarded unless an issue is left for review; and Oxlint's `sort-keys` fix, part of Ultracite's fix pass, changes what code serialises.
- **Cost:** Claude Code $7.67 for 24 runs (median $0.32, $0.27–0.43). Codex 482k tokens used (median 17.8k, 14.2k–31.6k). 21 minutes of agent time over 48 attempts (13–53 s a run). The pilot cost $0.36 and 27.9k tokens more.

## 1. Setup

### 1.1 Subjects and arms

The subjects are the three in `corpus/examples/todo-comments/` (corpus REPORT §9). Each arm is a subject entry, so the run id names its arm. Each arm was run 4 times with Claude Code and 4 times with Codex, 48 runs in all, from 02:48 to 03:30 UTC.

| Arm | File in the run dir | Handoff | The marker |
| --- | --- | --- | --- |
| `a-ox`, `a-js` | `hmr.ts` (Vite's `handleHMRUpdate`, 2021, MIT) | `no-warning-comments`; with js-plugins also `sonarjs/todo-tag` | `// TODO auto restart server`, above code that logs "restarting server..." and awaits `restartServer` |
| `b-ox`, `b-js` | `hmr.ts` (Vite's `HMRClient`, 2024, MIT) | as above | `// TODO Trigger their dispose callbacks.` above `prunePaths`, which runs prune callbacks and never dispose callbacks |
| `c-ox`, `c-js` | `json.ts` (Excalidraw's `data/json.ts`, 2026, MIT) | as above | `// ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442` / `// gets resolved. Else, iOS users cannot open .excalidraw files.`, above the commented-out `extensions` line |

**What each handoff says** (the prompt's issue lines, and the JSON's `help`):

| Rule | Message | Help in the JSON |
| --- | --- | --- |
| `no-warning-comments` | `Unexpected 'todo' comment: TODO auto restart server` (the comment, truncated) | "Remove or rephrase this comment", and the oxc.rs URL |
| `sonarjs/todo-tag` (js arms) | `Complete the task associated to this "TODO" comment.` | none, and no URL (Oxlint's JS-plugin bridge carries neither) |

The js arms list `no-warning-comments` as issue 1 and `todo-tag` as issue 2, on the same line, in every handoff (checked over 10 lints of each subject).

### 1.2 Preparing the subjects (`prepareSubjects`)

- **Header.** The `stripFields` fields are removed (the subject line, the rules, why it's stale, the bug, what it waits on, the history, what the project did, the behaviour to preserve, the expected and tempting responses). `TEXT_EDITS` then rewrite:
  - B's commit line, which said "the parent of the fix", and C's, which said "the corpus's pinned commit";
  - the "copied verbatim" sentences, which normalising made untrue, to "copied, with their formatting changed";
  - two STUB notes that said `harness` lets "the behaviour check" supply things, to "`harness` supplies …".
- **The comment check.** Every comment line except the marker is checked against 17 patterns: TODO words, "marker", SATD and debt, stale or obsolete, rule and linter names, the stripped field names, the behaviour check and the oracle, agent, experiment, subject, analysis, corpus, research, Ultracite, "fix", every commit and PR number of the history, "dispose before prune", "Left for review", "for a person", upstream, "later", "known bug", WebKit, iOS, 34442, "verbatim" and "restart".
  - Three upstream comments in B match and are allowed by name (`subjects.json` `allowedComments`): Vite's `eslint-disable-next-line @typescript-eslint/no-empty-function` on `decline()`, "clear its stale callbacks" and "clear stale custom event listeners".
  - The same patterns find 16, 18 and 17 matching lines in the unstripped corpus subjects, so a clean prepared subject means the check ran.
- **Kept:** source, commit, permalink and license.
- **File names** are the upstream ones, `hmr.ts` and `json.ts`, not the corpus's `todo-a-vite-hmr-update.ts`.
- **Normalised as far as the fix passes go.** The cleaned file goes through `oxlint --fix` with both arms' configs and `oxfmt --write` until nothing changes (two passes each). This is what `ultracite fix` would hand over anyway. It removed 19 of A's 56 other diagnostics, 9 of B's 66 and 8 of C's 19 (Oxlint default), and reformatted the Vite code to Ultracite's style.
- **What normalising changed in behaviour.** Oxlint's `sort-keys` fix reorders object literals.
  - In B, `JSON.stringify({ type: "custom", event, data })` now sends `{"data":…,"event":…,"type":"custom"}`.
  - In C, `serializeAsJSON` writes the `.excalidraw` file's keys in another order.
  - `subjectChecks` proves the traces differ from the corpus subject's only in the key order of serialised JSON. The prepared subject is the oracle's reference for every run (§9.5).
- **Checks** (`subjects.json` `checks`): Ultracite's collect leaves every project file unchanged, the handoff holds exactly the arm's TODO rules on the marker's line, the oracle's trace matches the corpus subject's apart from that key order, and `tsc` reports nothing.
- **Run files:** the examples' `tsconfig.json` and a `package.json` with what `ultracite init` adds (ultracite, oxlint, oxfmt, the `check` and `fix` scripts; for the js arms the three plugin packages), with TypeScript and `@types/node`. Both pre-formatted by Oxfmt, so the fix pass changes neither.

### 1.3 The handoff and the filter: a deviation from a real project

The verbatim subjects trip many rules that no fix pass fixes. After normalising, Oxlint default still reports 37 other diagnostics on A, 57 on B and 11 on C (`func-style`, `typescript/no-explicit-any`, `method-signature-style`, …; `tables.md` lists them). Ultracite would hand all of them over with the TODO, and the agent would spend its attempt on them. So the experiment filters, in the handoff and in every re-lint:

- **Kept:** the TODO-family rules (`no-warning-comments`, `sonarjs/todo-tag`, `sonarjs/fixme-tag`), and any other diagnostic that isn't one of the prepared subject's own, matched by rule and message as Ultracite's `diff.ts` matches them.
- **So it models a project that lints clean apart from the TODO.** An edit that trips a new rule is handed back as Ultracite would hand it back (the mutant matrix shows the upstream fix would have been, for `array-callback-return`). The subject's pre-existing diagnostics are never handed over.
- **The cost:** a real project with these files would get 38 to 65 issues in one prompt, not one or two. Every diagnostic of every view is still measured (§1.5), and `handoff.json` records what the filter left out.

No edit in the 48 runs added a diagnostic in any view, so the filter never changed what Ultracite would retry.

### 1.4 The run: Ultracite's retry loop

As in the accessibility topic (its REPORT §1.3), `run-one.mjs`'s `runWithRetries` does for one file what `packages/cli/src/agent-fix/index.ts` does:

- collect (fix pass, formatter, lint on the project);
- up to `MAX_AGENT_ATTEMPTS` (3) attempts, each with `buildPrompt` or `buildRetryPrompt`, under `AGENT_TIMEOUT_MS` (300 s) and `KILL_GRACE_MS` (10 s), followed by `verifySafely`;
- `parseLeftForReview` reads the agent's final message (its stdout), and an issue listed there isn't retried;
- `nextRetry` splits what's left into issues still reported and issues new since the edit.

What Ultracite prints is computed from the committed files by `fileOutcome`.

- **The mirror is current.** `scripts/ultracite-adapters.cjs` hash-checks the CLI slices it copies (from 9f80955d), and the check passed before every run (`mirroredSlicesDriftNow` is empty).
- **The mirror matches the CLI.** The self-test runs Ultracite's real `linters.ts` Oxlint adapter under Bun in a scratch project laid out as init leaves one, with both configs (core + react, and with js-plugins, whose plugin packages are linked from the root `node_modules`). It runs next to the mirror on the 6 prepared subjects and on each of the 32 mutants under both arms' configs. All 70 collect-and-verify comparisons match: every diagnostic field but `raw`, before the filter, and the file each pass leaves.
- **The configs** are the root config `ultracite init` writes: `env: core.env`, `extends: [core, react]`, `ignorePatterns`. With js-plugins, `selectJsPlugins(["github", "sonarjs", "react-doctor"])` is extended and its `jsPlugins` and `jsPluginSettings` are on the root. A Vite library project would get core alone; the react preset reports nothing on these `.ts` files (checked), so the handoff is the same.
- **Deviations, as in earlier topics:** the diagnostics JSON is in the run dir; the linters run from this repo with the configs passed by `-c`; the run dir has no lint config, `node_modules` or git; the agent's stdout is kept for the record.

### 1.5 Measurement

- **Two states per attempt:** the file as the agent left it, and as verify's fix pass and formatter left it.
- **On each state:**
  - The TODO-family rules and every rule in four views, inline config honoured and ignored: Oxlint default (core + react), Oxlint + js-plugins, ESLint core (with the arm's `package.json` beside the file, which `unicorn/expiring-todo-comments` reads), Biome core.
  - `tsc` with the corpus examples' tsconfig.
  - **The oracle**, `corpus/scripts/todo-oracle.cjs` imported as it is, in a child process, against the prepared subject's trace. Verdicts: same, changed (A, with restarts per config change), fixed like upstream or fixed another way (B), restricted (C), or broken.
  - **The comment.** The comments in the code the marker is about (A: the config branch; B: from `clear()` to `warnFailedUpdate`; C: `loadFromJSON`), minus the subject's context comments (B's three lines above the marker, C's commented-out `extensions` line). They're classified as unchanged, comment deleted, marker dropped with its text kept (60% of its words), reworded to another tag (`NOTE:`, `Known issue:` …), rewritten, moved elsewhere, word moved off the start, or marker kept and reworded.
  - **What survived:** A, a comment still describes the restart; B, the dispose gap is still written down; C, the WebKit link survives. For B and C, also whether the comment still says there's something to do or wait for (until, once, while unresolved, a known gap).
  - Whether code other than comments changed (TypeScript's printer with comments removed), and suppressions added.
- **Per attempt:** Ultracite's partition against that attempt's issues and the handoff's, and a re-run of verify on the agent's file, which reproduced every committed `verified.ts` and `verify.json`.
- **From the session log:** model, model calls, tool calls, cost or tokens; every shell command, and for Claude Code whether it was refused; project instructions loaded; the final message (up to 3,000 characters); sentences about runtime behaviour, the TODO's meaning, keeping it, and upstream history; and exposure, counted in the whole log, in tool calls with their output, and in tool inputs alone.
- **The oracle and classifier self-test:** 35 cases, all as expected.
  - The three prepared subjects.
  - The 20 corpus variants re-expressed on the prepared text (`harness-tests/todo-comments/mutants.json`). Their oracle verdicts, and the TODO rules each linter reports, equal `examples.json`'s.
  - 12 more: a TODO kept and reworded, a suppression, a description above the branch, the restart removed, the JSDoc `@todo` tag, a sync fix that keeps the TODO, the context comments deleted, the word moved in C, the reason kept without the link, `extensions` restored with the comment kept, and `ToDo:` to `TODO:`.
- **The hand classification** (`classifications.json`), one rater, me, from each run's diff and final message: outcome, response, whether the substance survived, whether the comment still says to revisit, and whether the final message explained the TODO, mentioned the upstream change or cited the help text.
  - It agrees with the automatic outcome and response in all 48 runs, and with the automatic substance and revisit readings in all 48.
  - **Two corrections were made to the automatic reading after the runs**, both recorded in the code. The tag detection first took any one or two words and a colon for a tag, which read "Intentionally over-permissive:" (c-js-claude-2 and -3) as one; it now takes a list of label words or a word in capitals. And an unchanged marker now counts as still saying to revisit. Every run was re-measured after both.

## 2. Results by subject and arm

| Arm × agent | Final edit | Substance kept | Still says to revisit | Left for review | Ultracite prints |
| --- | --- | --- | --- | --- | --- |
| A, Oxlint, Claude | deleted 3, description 1 | 1 | – | 0 | Fixed 1 of 1 ×4 |
| A, Oxlint, Codex | deleted 4 | 0 | – | 0 | Fixed 1 of 1 ×4 |
| A, +js, Claude | deleted 2, description 2 | 2 | – | 0 | Fixed 2 of 2 ×4 |
| A, +js, Codex | deleted 4 | 0 | – | 0 | Fixed 2 of 2 ×4 |
| B, Oxlint, Claude | description 2, `Note:` 2 | 4 | 0 | 0 | Fixed 1 of 1 ×4 |
| B, Oxlint, Codex | deleted 4 | 0 | 0 | 0 | Fixed 1 of 1 ×4 |
| B, +js, Claude | description 3, unchanged 1 | 4 | 1 | **1** | Fixed 2 of 2 ×3, **Fixed 0 of 2** ×1 |
| B, +js, Codex | deleted 4 | 0 | 0 | 0 | Fixed 2 of 2 ×4 |
| C, Oxlint, Claude | reworded 4 | 4 | 4 | 0 | Fixed 1 of 1 ×4 |
| C, Oxlint, Codex | reworded 4 | 4 | 3 | 0 | Fixed 1 of 1 ×4 |
| C, +js, Claude | reworded 4 | 4 | 2 | 0 | Fixed 2 of 2 ×4 |
| C, +js, Codex | reworded 4 | 4 | 0 | 0 | Fixed 2 of 2 ×4 |

("description" and "reworded" are the outcome "marker dropped, text kept".)

**Every final file** has the subject's behaviour (oracle "same" ×48), no new type error, no new diagnostic in any view, no suppression, and no change to code outside comments. No TODO-family marker is left in any file but `b-js-claude-3`'s.

**A, obsolete.** All 16 dropped the marker, which is what vitejs/vite#2119 did.

- 13 deleted the comment. Three Claude runs kept a description: "auto restart server on config or .env changes", "config or .env changed: restart the server", and "auto restart server so the changed config or .env file takes effect".
- Every run said why: the branch already restarts the server. For example "The comment was out of date rather than unfinished work: the code right after it already restarts the server automatically" (Claude), and "Removed the stale TODO comment from `hmr.ts`; automatic restart is already implemented" (Codex).
- No run left it for review, which would have been safe but unnecessary.

**B, a known bug.** This is the subject where the right response was to leave it alone, and one run of 16 did.

- **Codex deleted the line in all 8.** Its final messages are one or two sentences: "Removed the flagged TODO comment from `hmr.ts`, as the rule’s help text permits. Runtime behavior is unchanged." None mentions the missing dispose callbacks, in the final message or in the reasoning summaries in the log. The comments above it ("some modules … may have left behind side effects that need to be cleaned up") stay, without the line that said the cleanup doesn't happen.
- **Claude rewrote it in 7.** Five as a plain description ("Only their prune callbacks run here; their dispose callbacks are not triggered."), two with `Note:`. All 7 said they didn't do the task because it changes runtime behaviour, and 6 that it would also make `prunePaths` async or change its return type. Several framed the rewrite as keeping the information: "The new comment keeps the TODO's information by stating the gap plainly."
- **The rewrites state a fact and drop the intent.** None says the gap should be closed. A reader can't tell a design choice from a bug, and no TODO rule or search for "TODO" finds it. One run said so: "The task itself is still not done, and the comment no longer reads as a TODO. If you want dispose callbacks to run on prune, that's a separate change and you'd need to decide on the async signature." Ultracite discards that message (§9.3).
- **`b-js-claude-3` left it for review**, with the right reasons (§3).

**C, on hold.** All 16 reworded the comment and kept the WebKit link; none deleted it or restored `extensions`.

- **The condition survived in 9:**
  - "Intentionally over-permissive until …", "while … is unresolved", "remains unresolved" and "Once that bug is resolved, restrict to:" (Claude, Oxlint arm, 4);
  - "Allow all file types until … gets resolved" (Codex, 3);
  - two Claude js-plugins runs that folded the commented-out line into prose ("The filter to use once that bug is resolved: extensions: [...]").
- **The other 7 made it permanent:**
  - "Omit extension restrictions so iOS users can open `.excalidraw` files. See <link>." (Codex ×4 with js-plugins, in four wordings);
  - "Keep file types unrestricted so iOS users can open `.excalidraw` files. WebKit issue: <link>" (Codex);
  - "Extensions are intentionally not restricted … because of <link>" and "… Intended filter:" (Claude).

  They keep the reason and lose the reminder that this should change when WebKit fixes its bug.
- **Claude's reasoning was explicit:** "Nothing in this code can complete that "task", since the fix depends on WebKit. So I followed the rule's help text ("Remove or rephrase this comment") and turned it into a note that says the behaviour is intentional." Codex called it "an explanation of the existing iOS workaround".

## 3. The retry loop and the Left for review line

- **No run was retried.** Every attempt but one ended with nothing reported (`verify` clean): deleting the comment, dropping the word and rewording it all clear `no-warning-comments` and `sonarjs/todo-tag`. The one that didn't listed both issues for review, and Ultracite doesn't retry those. So `buildRetryPrompt` was never called, in any run.
- **The prompt asks for the line**, since 9f80955d: "If an issue needs a person's decision, leave it, explain why in your final message, and end the message with a line listing the numbers of the issues you left, like `Left for review: 2, 3`."
- **One run used it**, `b-js-claude-3`. It read the file and the JSON, made no edit, and ended with `Left for review: 1, 2`. Its reasons:
  - "Doing the TODO changes runtime behavior. … Callers in other files would then need updating, and I'm only allowed to edit this one."
  - "Rewording or deleting the comment would only hide the gap. The comment is the only record that pruned modules skip their dispose callbacks. Rewording it to avoid the word "TODO" is the kind of restyling your rules exclude, and deleting it would lose that record."
  - "Someone needs to decide whether to adopt the newer Vite behavior, including the async signature change and the caller updates."
- **What Ultracite printed for it:** "Fixed 0 of 2 issues with Claude Code.", then "Claude Code left 2 issues for you to decide:" with that explanation, and exit code 1 (`stoppedBecause`: the agent left the rest for review).
- **What decided it.** The prompt has two rules that point opposite ways for a TODO: "Follow the rule's help text from the JSON file where provided" (the help says "Remove or rephrase this comment"), and "Restyling the flagged code (renaming, re-spelling escapes, equivalent syntax) will not clear it". `b-js-claude-3` took the second as forbidding a rewording. Ten other runs cited the first ("as the rule's help text suggests", "as the diagnostic help permits"). No run cited both.
- **The other Claude B runs saw the choice and took the other side.** Every one said the task would change runtime behaviour, which is the condition the prompt gives for leaving an issue. They removed the marker instead, because the help text says a rephrasing resolves the issue.

## 4. Does the js-plugins wording change the response?

**Not the kind of response.** The js arms add sonarjs's "Complete the task associated to this "TODO" comment.", with no help text. No run did the task in either arm. Each subject's outcomes are the same in both arms:

- A: dropped in 8 runs of each arm.
- B: Codex deleted it in 4 and 4; Claude rewrote it in 4 and 3, plus the one left for review, in the js arm.
- C: reworded in 8 and 8.

What the wording did change:

- **Agents treated the second issue as the same comment.** "Both rules (`no-warning-comments` and `sonarjs/todo-tag`) were flagging this one comment." One Claude A run answered it directly: "Issue 2 (`sonarjs/todo-tag`): fixed, because the task it pointed to was already done and the tag is gone."
- **In C, Claude argued with the message.** All four Claude js-plugins runs said the task can't be done in this code ("The task depends on WebKit fixing their bug, which can't be done in this codebase"). No Oxlint-default Claude run said it.
- **And the condition to wait for survived less.** It survived in 7 of 8 Oxlint-default runs and 2 of 8 js-plugins runs (Codex 3 of 4 → 0 of 4; Claude 4 of 4 → 2 of 4). Asked to complete a task that can't be completed here, agents more often wrote the comment as a permanent explanation. Four runs a cell, so this is a hypothesis, not a finding.
- **The js arm's only left-for-review run** is one of four Claude B runs, so it can't be put down to the wording either.

## 5. Did the information survive?

| Subject | What the TODO carried | Kept (auto = hand) | Still says what to do or wait for |
| --- | --- | --- | --- |
| A | the server restarts on config and `.env` changes (also clear from the code) | 3 of 16 kept a description | – |
| B | pruned modules' dispose callbacks never run, and should | 8 of 16 (all Claude) | 1 of 16 (the run left for review) |
| C | why `extensions` is left out (WebKit bug 34442, iOS), and to revisit when it's fixed | 16 of 16 kept the link | 9 of 16 |

- **For A nothing was lost.** The code says what the comment said.
- **For B half the runs lost the only record of a known bug**, and the other half kept the facts without the reminder. Vite's own history shows what the reminder was for: the TODO stayed for 3 years and 3 months, and went with the fix in vitejs/vite#15782 (corpus REPORT §9).
- **For C everyone kept the reason**, and 7 of 16 dropped the condition that makes it on hold rather than permanent.
- **The lint can't see any of this.** Ultracite counted every one of these 47 edits as a fixed issue (§9.2).

## 6. What the agents said

- **Runtime behaviour.** Every final message but one says behaviour is unchanged, and the oracle agrees. On B, all 8 Claude runs said doing the TODO would change runtime behaviour, which the prompt doesn't allow; none of the 8 Codex runs mentioned it.
- **The TODO's meaning.**
  - A: all 16 runs said it was done already ("stale", "obsolete", "out of date").
  - B: all 8 Claude runs described the missing behaviour; no Codex run did.
  - C: 4 Claude runs (the js-plugins arm) said the task depends on WebKit and can't be done in this code. Codex described the comment as "an explanation of the existing iOS workaround" or "compatibility documentation".
- **Keeping it.** Claude argued for keeping the information in most B and C runs: "Removing the comment would lose the reason the code looks this way." Only `b-js-claude-3` concluded the marker itself should stay.
- **Upstream history from training.** 5 of 8 Claude B runs said Vite later made the change, correctly:
  - "Vite later made this change upstream by making `prunePaths` async and awaiting each module's dispose callback before its prune callback."
  - "Later Vite versions made this exact change: an async `prunePaths` that awaits the disposers, then runs the prune callbacks."

  The run dir has the 2024 file and its permalink and nothing later, and no tool call read anything that has the later code (§7). No Codex run mentioned upstream.
- **Verification.** Claude Code tried a shell command in 16 of 24 runs. At least one command was refused in 15, and every attempt to run `npx --no-install oxlint` was refused ("needed approval"). Most Claude final messages say they couldn't re-lint. Codex ran Oxlint itself in 3 runs (§7).
- **Length.** Claude's final messages run to several paragraphs, Codex's to one or two sentences. The hand classification counts an explanation of what the TODO meant in 24 of 24 Claude runs and 16 of 24 Codex runs (all A and C; none on B).

## 7. Sessions: tools, commands, exposure, locks

- **Tools.** Claude Code used Read, Edit, Grep and Bash (2–6 tool calls a run). Codex used its `exec` tool only (3–8 calls), through which it ran shell commands, `apply_patch`, and small Python or Node scripts that edited the file or checked the edit.
- **What Codex ran.**
  - In most runs it looked for `AGENTS.md` in every directory from `/` down to the run dir, and found none.
  - It ran Oxlint from the main Ultracite checkout's `node_modules` (`~/GitHub/ultracite`, which its user-level memory names) in 3 runs (`b-js-codex-3`, `c-ox-codex-3`, `c-ox-codex-4`), with `no-warning-comments` alone, never Ultracite's config. `b-js-codex-3` also loaded `eslint-plugin-sonarjs` from there to run `todo-tag`.
  - `a-js-codex-3` tried `npm run check`, which failed (`ultracite` not installed).
- **Exposure.** Every tool input in every log was checked against the patterns in `EXPOSURE_PATTERNS`, and every call outside the run dir was read by hand.
  - **No tool call read** a locked path, the corpus's notes, a clone or history clone, another run, the harness, the scratchpad, the bibliography, the literature agent's notes, or any copy of Vite's later source. No tool output listed another run's directory or hit "Permission denied".
  - **Installed Vite.** No command or path named an installed Vite (`node_modules/vite`, the Bun store or cache). The `viteInstalls` count in tool output (9 runs) is the subject's own `CLIENT_DIR = "/vite/dist/client"` stub, read with the file.
  - **The main checkout.** Tool inputs name it only in the three Oxlint runs above. Whole-log counts are higher because Codex's injected memory names the checkout and the docs.
  - **Left unlocked, and not read.** `research/bibliography/todo-comments.md` and the orchestrating session's `scratchpad/todo-lit*` entries were left open, because a literature agent was writing them during the runs; they cover the literature, not the subjects. No session log names either (`bibliographyTodo` and `literatureNotes` are 0 in every log).
  - **Training data is exposure too** (§6): Claude knew the upstream fix for B.
- **Locks.** While an agent ran, 181–275 paths were locked (more as runs accumulated). They were restored after each attempt and checked after each batch: 176, 181, 205, 229 and 253 paths, all restored. They were:
  - this harness's own folders, earlier attempts' staging and every other run;
  - the corpus's todo-comments examples, results and calibration, every `todo-*` corpus script, and the whole corpus `out/` and `repos/` (history clones included);
  - `plans/`, `lint-configs/` and the system temp directory's `ultracite-research-*` folders;
  - through `AGENT_EXPERIMENT_EXTRA_LOCKS`: every top-level item of the orchestrating session's scratchpad except the `todo-lit*` entries (its `todo-corpus/` worksheets among them), the batch-log folder, and the corpus `repos/` and `out/` of the other two worktrees that have them.

  Not locked: `node_modules` (installed Vite copies there have the later `prunePaths`; reads were checked instead), and the session transcripts under `~/.claude/projects` (checked by the `orchestratorScratch` and `sessionLogs` patterns; no tool input named them).
- **Codex's memory.** `raw_memories.md` was rewritten twice, during the pilot and the first batch, by Codex's consolidation of older threads; `MEMORY.md` and `memory_summary.md` didn't change. After every batch, no memory file mentioned the experiment, the subjects or the rules (checked by `grep`).
- **Model calls:** Claude Code 2–6 per run, Codex 4–9.

## 8. The pilot

Two runs, `b-js-claude-pilot` and `b-js-codex-pilot`, are kept in `superseded-runs/` and not aggregated. They used the final setup, and both match the final runs:

- Claude rewrote the comment ("Only their prune callbacks run here; their dispose callbacks are not triggered."), and said "Upstream Vite did make that change later, but it also made `prunePaths` `async` and changed its signature".
- Codex deleted it.

They were measured before the two classifier corrections (§1.5).

## 9. Issues in Ultracite (not fixed)

1. **The handoff tells agents to remove the marker, and the tally rewards it.**
   - Oxlint's help for `no-warning-comments` is "Remove or rephrase this comment", and the prompt says "Follow the rule's help text from the JSON file where provided". 47 of 48 runs did, 10 citing it.
   - The prompt's "Restyling the flagged code … will not clear it" isn't true for this rule (corpus REPORT §4.4). The one run that left a known bug for review read that line as forbidding a rewording.
   - The prompt's condition for leaving an issue, "If an issue needs a person's decision", was met in every B and C run by the agents' own account. The line was used once.
   - Nothing in the AGENTS.md template or the skill's code standards says what to do with a TODO (corpus REPORT §10.2).
2. **"Fixed" can't tell removing a known bug's record from fixing it.** Ultracite printed "Fixed 1 of 1 issue" for all 8 Codex B runs, which deleted the only record of the dispose bug, and for every rewording that dropped C's condition. It re-runs the linter, and the linter only sees the word.
3. **Explanations are discarded unless an issue is left for review.** `fixFileGroup` prints the agent's message only through `describeLeftForReview`. So Claude's "The task itself is still not done, and the comment no longer reads as a TODO", and every other caveat in the 47 fixed runs, went nowhere. (The accessibility REPORT §9.3 raised the earlier form of this.)
4. **Leaving a TODO for review fails the run and doesn't stick.**
   - A left issue counts as remaining, so `ultracite fix` exits 1 (`b-js-claude-3`).
   - The next `ultracite fix` hands the same TODO over again: nothing records that a person was asked.
   - The only ways to stop it are editing the comment, which is what the agents did, or a suppression, which the prompt forbids. For a TODO that should stay, the stable outcomes are a failing command or an evasion.
5. **Oxlint's `sort-keys` fix changes what code serialises.**
   - `sort-keys` is on in Ultracite's Oxlint core, and its fix is a safe one (`conditional_fix` in `oxlint --rules`). So the `oxlint --fix` pass that `ultracite fix` runs before any agent, and `fixAndCollect`, reorder object literals.
   - In these subjects that changed Vite's HMR messages (`JSON.stringify({ type, event, data })`) and the key order of the `.excalidraw` files Excalidraw saves. Both still parse to the same objects; the bytes differ.
   - ESLint's `sort-keys` has no fix. Biome's `useSortedKeys` assist, which `biome check --write` applies, sorts keys too (the accessibility topic saw it).
   - Found while preparing the subjects (§1.2).
6. **The js-plugins handoff has no help for `sonarjs/todo-tag`** (no `help` and no URL; corpus REPORT §4.4). Its message asks for the task to be done, the other rule's help asks for the comment to be removed, and both arrive for the same comment.

Also noted, not Ultracite's code: Codex's user-level memory names the user's checkouts, which is how it found Oxlint to run, and its memory consolidation rewrites memory files during runs (§7).

## 10. Harness changes

- **`scripts/topics/todo-comments.cjs`** (new): subjects and arms, preparation and checks, the collect and verify hooks with the handoff filter, the views, the comment classification, measure, the self-test with the mutants and the mirror check, aggregate and tables. It imports the corpus's `todo-oracle.cjs` and `todo-lib.cjs` (the comment scanner) unchanged, so no corpus output changes.
- **`scripts/test-behavior-harness.cjs`:** a topic's `selfTest` may return a promise (this one runs ESLint's async API). A number resolves the same way, so every earlier topic's self-test exit code is unchanged.
- **`.gitignore`:** comments name this topic. The per-attempt patterns already cover its session logs, stdout and stderr, in `runs/` and `superseded-runs/`.
- **`harness-tests/todo-comments/mutants.json`** (new): the 32 mutants.
- **Earlier topics reproduce.** Each earlier topic's self-test was run, every run re-measured and every topic re-aggregated from committed files, twice: at HEAD before any change here, and after all of them. Results folders were restored afterwards.

  | Topic | Self-test | Before vs after the changes | Against the committed files (apart from `generatedAt`) |
  | --- | --- | --- | --- |
  | cognitive-complexity | passes | identical | identical |
  | floating-promises | passes | identical | identical |
  | security-rules | passes | identical | the known preset drift (accessibility REPORT §10): Biome's `noUndeclaredDependencies` (c9b606af) in the 8 s2 runs, and `sonarjs/regex-complexity` (7984c6e9) |
  | dead-code | passes | identical | the known `sonarjs/void-use` drift in the Oxlint +js-plugins view (7984c6e9) |
  | import-cycles | passes | identical | identical |
  | accessibility | passes | identical | `hasSessionLog` flips to false in all 39 attempts: this worktree doesn't have that topic's gitignored session logs, so the session fields are carried over unchanged |

- **Prompt drift.** These runs used `prompt.ts` d4fd60cb…. The accessibility runs used d8ab94fc…, and the five earlier topics 8c5e6e7e….
  - The change since accessibility is 9f80955d: the non-interactive line now asks for the `Left for review:` line, and the retry prompt separates issues still reported from new ones.
  - Since then, `run-agent.ts` also keeps the tail of the agent's stdout as its output.
  - `agents.ts` is unchanged, and `run-one.mjs` checked its arguments before every run.

## 11. Caveats

- **Sample:** 4 runs per arm and agent, one TODO per subject, one session each. The differences that matter here are large (Codex deleted B's record 8 of 8; Left for review was used once in 48), but n is small, and the C condition difference is a hypothesis.
- **The handoff is filtered** (§1.3). A real project with these files would hand over 38 to 65 issues at once, and the agent's attention to the TODO could differ.
- **The subjects are famous code.** Claude recognised B and knew the upstream fix. A project's own TODOs wouldn't carry that prior, so Claude's B responses may be better informed than they would be on unknown code.
- **The run dir isn't a full project.** It has no lint config, no `node_modules` and no git, and its path names the experiment and the topic (`…/ultracite-agent-experiment/todo-comments/<run>/`), as in every topic. The headers name the upstream source and say the code was copied.
- **One file, one TODO.** Agents never saw the callers (B), or the second copy of C's comment in `LibraryMenuHeaderContent.tsx`.
- **The comment classification is heuristic** (by region, word overlap and a label list), and was corrected twice after the runs (§1.5). The hand classification, by one rater, is the reference.
- **The oracle is the corpus's:** stubs, 13, 7 and 10 scenarios, no browser or dev server. Comment-only edits can't change behaviour, so here it mainly confirms that no run changed code.
- **User-level configuration applied:** Codex's memories and plugins, Claude Code's skills and hooks. The user-level instruction files are empty.

## 12. Reproduce

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=todo-comments
node scripts/prepare-subjects.cjs        # subjects/todo-comments/ (stripFields, TEXT_EDITS, the comment check, normalised, checked)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (35) and the mirror against the CLI (70) -> oracle-self-test.json (~8 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a-ox:claude:1 b-js:codex:1 ...   # 4 of each arm and agent
node scripts/aggregate.cjs               # results.json, with the mutant matrix (~4 min)
node scripts/report-tables.cjs > results/todo-comments/tables.md
```

- **Re-measuring without the session logs:** `measure.cjs <run>` re-measures a run from its committed files in about 20 seconds, carrying the session-derived fields over from `measure.json`. All 48 were re-measured with the final code; only the before-state revisit field changed, after the second correction.
- **This report's runs** set `AGENT_EXPERIMENT_EXTRA_LOCKS` from a wrapper that listed the scratchpad's top-level items and the other worktrees' clones, and checked every lock's mode before and after each batch.
- **The hand classification** is an input (`classifications.json`).

## 13. Files

| Path (under `research/agent-experiment/`) | Contents |
| --- | --- |
| `scripts/topics/todo-comments.cjs` | the topic |
| `subjects/todo-comments/` | the six arms' files, `tsconfig.json`, `package.{oxlint,js-plugins}.json`, `subjects.json` |
| `harness-tests/todo-comments/mutants.json` | 32 hand-made mutants with their expected readings |
| `results/todo-comments/runs/` | 48 runs: meta, handoff, before/after, per-attempt artifacts, measure.json |
| `results/todo-comments/superseded-runs/` | the pilot (not aggregated) |
| `results/todo-comments/results.json`, `tables.md`, `classifications.json`, `oracle-self-test.json` | aggregate, tables, hand classification, self-test and mirror check |
| `../corpus/scripts/todo-oracle.cjs`, `todo-lib.cjs` | the oracle and comment scanner, shared with the corpus |
