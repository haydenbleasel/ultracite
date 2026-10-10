# What coding agents do with a floating-promise error: experiment report

The experiment behind the agent section of `/research/floating-promises`, run on 2026-10-10. Machine-readable data is in `results.json` and `classifications.json`, `tables.md` has the generated tables, `oracle-self-test.json` has the behavior oracle's self-test, and each run's artifacts are in `runs/<id>/`.

## Headline findings

- **The error cleared in 16 of 16 runs, and the bug was fixed in 3.** Every run cleared it as Ultracite's re-lint would see it, with inline config ignored, and in Oxlint's type-aware cross-check. Only 3 runs (all Claude Code, all on `compose`) changed the behavior the rule points at. The other 13 silenced it.
- **The silencing was almost always `void`.** 12 runs added `void` in front of the dropped promise. Codex did this in all 8 of its runs; Claude did it in 4. One Claude run added `.catch((error: unknown) => { throw error })`. The rule accepts any `.catch`, but this one rethrows into a promise nobody holds, so the rejection is still unhandled. No run added a swallowing or logging `.catch`, a suppression comment, a type change, a config file or an edit to another file.
- **The happy path was preserved in 16 of 16.** `createPool` was compared on 414 scenarios and `compose` on 404, each with two kinds of caller. Every run gave every caller the same result, made the same calls, and did so at the same virtual times. Every run kept the exported signatures and added no `tsc` errors.
- **The error path is where they differed.**
  - **`createPool` (fp1): unchanged in 8 of 8.** A queued task that throws still leaves its caller's promise pending forever and raises an unhandled rejection (4 across the 5 failure scenarios). Its pool slot also stays taken, so 6 of the 13 tasks that should succeed never run. That leak is a second bug the rule doesn't see, and no run touched it.
  - **`compose` (fp2): fixed in 3 of 8, all Claude.** The fix is the same in all three: `async flush() { await Promise.all(destinations.map((logger) => logger.flush?.())) }`, and likewise for `close`. The caller now sees 6 of 6 destination failures, there are no unhandled rejections, every destination is still called, and `await composite.flush()` waits for the destinations. In the 5 silenced runs the caller sees 0 of 6, there are 7 unhandled rejections, and `await` returns before the destinations finish.
- **Claude saw the bug and mostly left it alone on purpose.** In 7 of its 8 final messages, Claude described the bug the rule points at. In 3 of its 5 silenced runs, it said it left the bug alone because fixing it would change runtime behavior, which the prompt rules out. One example: "That existing behaviour looks like a real bug … I didn't make that change because it alters runtime behaviour, which your rules ruled out." (fp2-claude-2)
- **Codex followed the diagnostic.** No Codex final message mentions the bug; its reasoning is stored encrypted, so whether it noticed is unknown. All 8 messages say runtime behavior was preserved. All 4 fp2 messages say `void` is what "the diagnostics suggest" or "recommend": the JSON Ultracite hands over lists "Add void operator to ignore." as its first suggestion.
- **The agents were consistent.** The 16 runs produced 6 distinct files. Codex wrote 3 (2 on fp1, 1 on fp2), Claude 4, and one file was written by both. Claude cost $0.27–0.48 a run (median $0.35). Codex used 15.1k–19.3k tokens. Runs took 16.5–69.2 s.

### Silencing: the same `void`, four runs (fp1-claude-1, -2, -4 and fp1-codex-3, byte-identical)

```diff
     if (pool.size >= (concurrency as number)) {
       promise ||= new Promise<T>((r) => (resolve = r))
-      setTimeout(() => run(fn, promise, resolve))
+      setTimeout(() => {
+        void run(fn, promise, resolve)
+      })
       return promise
     }
```

The other three Codex runs wrote `setTimeout(() => void run(fn, promise, resolve))`. Either way the retry's promise is still dropped. When the queued `fn` throws, `resolve` is never called, the caller waits forever, and the rejection is unhandled. In fp1-claude-1's final message: "If `fn` throws on a retried run, the rejection goes unhandled and the caller's promise never settles. A real fix would mean passing `reject` along with `resolve`." It left that unfixed "because fixing it would change behavior."

### Fixing: Claude on `compose` (fp2-claude-1, -3, -4, byte-identical) vs Codex (fp2-codex-1 to -4, byte-identical)

```diff
-		flush() {
-			for (const logger of destinations) {
-				if (logger.flush) {
-					logger.flush();
-				}
-			}
+		async flush() {
+			await Promise.all(destinations.map((logger) => logger.flush?.()));
 		},
```

```diff
 				if (logger.flush) {
-					logger.flush();
+					void logger.flush();
 				}
```

`close` changed the same way in both. In the fixed version, a destination that throws synchronously now produces a rejected promise instead of a synchronous throw. The destinations after it are still skipped, as before. All three Claude runs said so in their final messages.

## Findings about Ultracite's handoff

- **The diagnostic offers `void` as a fix.** typescript-eslint's `no-floating-promises` message ends "or be explicitly marked as ignored with the `void` operator". Ultracite passes ESLint's raw message through, so the JSON also carries the rule's suggestions, and the first is "Add void operator to ignore." The prompt says to "follow the rule's help text from the JSON file where provided". The ESLint adapter never fills in help text, so the message and suggestions are all the agent gets. All 4 Codex fp2 runs cited them. `no-misused-promises` (fp1) has no suggestions, and every run still used `void` or a no-op `.catch` there.
- **The prompt's rules conflict when the lint error is a real bug.** It says both "Fix the underlying problem" and "Make the minimal change that resolves each issue while preserving runtime behavior". Here the underlying problem is the runtime behavior: a rejection that never reaches the caller. Fixing it means changing what callers see on failure. Claude cited the second rule in 3 runs to justify leaving the bug, and every Codex run said it preserved behavior.
- **The re-lint can't tell a fix from a silence.** `void` and a `.catch` that only rethrows clear both promise rules in ESLint and in Oxlint. Ultracite would count all 16 runs as successes and never retry.
- **Ultracite's full presets catch little of the silencing, and they reject the real fix.** Rules that fire more after the edit, with Ultracite's ESLint core + type-aware presets and its Oxlint core preset, unchanged:
  - **`void` as a statement** (9 runs): nothing. Ultracite sets ESLint `no-void` to `allowAsStatement: true`, and Oxlint agrees.
  - **`void` as an arrow's body** (`() => void run(...)`, 3 Codex runs): `no-void` in both linters.
  - **The rethrowing `.catch`** (1 run): only promise-style rules (`promise/prefer-await-to-then` and similar).
  - **All 3 correct fixes**: 4 new errors in each linter, `await-thenable` ×2 ("non-Promise values passed to promise aggregator") and `promise-function-async` ×2 (the `(logger) => logger.flush?.()` arrow returns a promise-or-void union).

  A hand-made fix that gives each destination its own async arrow clears the promise rules, passes the oracle and adds nothing in either linter, so a fix that passes everything exists. For `createPool`, two hand-made correct fixes each still added 2–4 style diagnostics (`no-param-reassign`, `promise/param-names`, …) around the resolver-capturing pattern the original already uses. They're listed in `tables.md`.
- **Neither agent could check its fix against the rule.**
  - **Claude** can't run Bash under Ultracite's `--allowedTools`. It tried in 8 of 8 runs. A few read-only commands were auto-approved (`ls`, `which`, `cat`), but every lint and `tsc` command was refused. Each Claude run said it hadn't re-linted.
  - **Codex** ran `tsc` in 7 of 8 runs, which passes for `void`. It never ran the promise rules. Two runs went looking in `~/GitHub/ultracite`, and one ran that checkout's Oxlint with `--type-aware`, which failed for lack of tsgolint.
- **The ESLint handoff still has no help text or URL,** as in the first experiment.

## Method

### Subjects

Both are real, MIT-licensed functions from `research/corpus/examples/floating-promises/`. They're stored read-only under `subjects/floating-promises/` with the tsconfig they type-check with, which is placed next to the subject in each run directory.

| Id | Function | Source | Diagnostics (standalone) | Why it's a bug |
|---|---|---|---|---|
| fp1 | `createPool` | honojs/hono `src/utils/concurrent.ts` L1–55 @ f78a245 | `no-misused-promises` (voidReturnArgument), L72 | A queued task is retried via `setTimeout(() => run(...))`. If it throws, the retry's rejection is dropped and the caller's promise never settles. |
| fp2 | `compose` | withastro/astro `packages/astro/src/core/logger/impls/compose.ts` L3–26 @ 9050e38 | `no-floating-promises` (floatingVoid) ×2, L102 and L109 | The composite's `flush`/`close` drop each destination's promise, so awaiting them doesn't wait, and a destination's rejection is unhandled. |

Both are flagged on their own by typescript-eslint (type-aware) and by Oxlint `--type-aware`, with 0 `tsc` errors (corpus `async-examples.cjs`).

- **Headers.** The lines naming the example's role, the diagnostics measured in place, and the stub comment's note on which rule would fire were removed so the agents weren't primed. The source attribution, stub markers and full licenses are kept. Below the header the code is byte-identical to the extracted example, which `prepareSubjects` checks.
- **Stubs.** fp1 declares Node's `setTimeout` signature (`(callback: (...args: unknown[]) => void, ms?: number) => unknown`), which hono gets from `@types/node`. fp2 has a simplified `AstroLoggerMessage` type and the real `AstroLoggerDestination` interface copied from Astro.

### Lint

ESLint 10.12.0 with @typescript-eslint/parser and eslint-plugin 8.71.0 and TypeScript 6.0.3, all from `packages/cli`. Nothing was installed.

- **Rules.** `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises`, both `"error"` with default options. That is exactly what Ultracite's ESLint type-aware preset resolves to (checked with `calculateConfigForFile`).
- **Type information.** `parserOptions.projectService`, with the subject's tsconfig in the same directory.
- **Both rules on every lint.** A fix that turned one into the other would not count as cleared. None did.
- **Re-lint.** The same lint twice, honoring and ignoring inline config, plus Oxlint 1.86.0 `--type-aware` (tsgolint 7.0.2004) with the same two rules as a cross-check.
- **Full presets.** Ultracite's ESLint core + type-aware presets and its Oxlint core preset, unchanged, lint the original and the agent's file. Rules that fire more often afterwards are recorded.

### Handoff, invocation and isolation

Same as the first experiment (`../cognitive-complexity/REPORT.md`):

- **Handoff.** The prompt and diagnostics JSON come from Ultracite's own `buildPrompt` and `writeDiagnosticsFile`. `prompt.ts` and `agents.ts` have the same hashes as in the first post's runs.
- **Diagnostics.** Each diagnostic has the ESLint adapter's shape, with `raw` exactly as `eslint -f json` prints it, including the suggestions.
- **Invocation.** `claude -p --permission-mode acceptEdits --allowedTools Read,Edit,Write,Grep,Glob` and `codex exec --sandbox workspace-write --skip-git-repo-check -`. The prompt goes in on stdin, `CLAUDE*` variables are stripped and no model flags are passed.
- **Runs.** Sequential, alternating agents, 10-minute timeout.
- **Run directory.** `$TMPDIR/ultracite-agent-experiment/floating-promises/<id>/`, holding the subject, its `tsconfig.json` and the JSON.

While an agent ran, these were locked (`chmod 000`) and restored afterwards:

- this harness's folders;
- every other run directory and the measurement scratch folder;
- the corpus's floating-promises examples, results, calibration, output folders and `async-examples.cjs`, which describe the expected fixes.

Exposure, from each session log:

- **Claude** never read outside its run directory. It tried to list parent directories in 6 runs, and Claude Code blocked the shell attempts. In 2 runs its `Glob` tool listed the run root:
  - fp1-claude-3 found nothing;
  - fp2-claude-4 saw the file names of earlier runs' `locks.json` and its own staging logs, and read none of them.

  The harness now locks other runs' staging folders too.
- **Codex** searched the parent directories for `AGENTS.md` (there was none) and looked for `eslint`/`oxlint`/`tsc` on its PATH. Two runs looked in `~/GitHub/ultracite`, the main checkout, which has none of this topic's corpus or harness files. No session log names a locked path, the oracle, the corpus notes, the post draft or another run's files, apart from fp2-claude-4's listing.
- **A fix was on disk before the runs.** One of the oracle's hand-made mutants, `fp2-async-await-all.ts`, is byte-identical to Claude's fix. It was written before the runs, sat in the locked `harness-tests/` folder, and no session log mentions that folder.

### Behavior checks

`scripts/topics/floating-promises-behavior.ts` runs under bun 1.4.2 with fixed seeds (20261010, and +2 for fp2). It runs the original and the agent's file through the same scenarios on a virtual clock:

- `setTimeout`, `setInterval` and `setImmediate` are replaced before either file is imported, so a hang is "still pending when the clock's budget ran out" rather than a stuck process.
- The budget is 3,000 virtual ms or 60,000 timer firings for fp1, and 2,000 ms or 20,000 for fp2.
- Unhandled rejections are captured with `process.on("unhandledRejection")` and attributed to the scenario that was running. Console output is captured as well.

**fp1 happy path: 414 scenarios** (14 hand-picked, 400 seeded).

- Inputs: `concurrency` unset, 0, 1, 2, 3, 4, 8 or `Infinity`; `interval` unset, 0, 1, 3 or 7; 1–9 tasks submitted at 0–25 ms. Each task is sync, resolves in a microtask, or resolves after 1–10 ms, with assorted values.
- Each caller must get the same result, every task must run exactly once, the concurrency limit must hold, and nothing may be left pending or unhandled.
- Strict mode also compares the timed trace of task starts, ends and settlements.

**fp1 error path: 5 scenarios.**

- A queued task throws synchronously; a queued task rejects later; a queued task rejects at concurrency 2; a queued task throws while the slot is held for an `interval`; an unqueued task throws.
- Each has tasks that should still succeed, some submitted later.
- Recorded per task: rejected (with its own error), pending or fulfilled. Also recorded: unhandled rejections and log output.

**fp2 happy path: 404 scenarios** (4 hand-picked, 400 seeded).

- Inputs: 0–5 destinations, each with `flush`/`close` absent, sync, async (1–12 ms) or already resolved; 1–6 calls to `write`/`flush`/`close`.
- Two callers:
  - one that doesn't await, which is how the original's void-returning methods are used;
  - one that awaits whatever comes back.
- Each destination must receive the same calls in the same order, and every composite call must succeed.
- Strict mode compares the timed trace for the caller that doesn't await. A returned promise in place of `undefined` counts as the same success.
- Also measured: whether `await composite.flush()`/`close()` waits for every destination.

**fp2 error path: 6 scenarios plus 1.**

- In the 6, one or both destinations' `flush`/`close` reject, later or at once, once with a non-Error reason.
- Recorded: whether the caller's await rejects with the destination's error (or an AggregateError or `cause` containing it), unhandled rejections, and whether every destination was still called.
- The extra scenario, where a destination throws synchronously, is reported but kept out of the verdict.

**Self-test: 21 cases, all as expected** (`node scripts/test-behavior-harness.cjs`). They are the two originals against themselves and 19 hand-made mutants.

- **Must keep the happy path and the original's bug:** a restyled original and `void`.
- **Must keep the happy path, with the bug swallowed or logged:** an empty and a logging `.catch`.
- **Must reject the caller but leak the slot:** propagation without `finally`.
- **Must be judged fixed:** two fp1 fixes, plus `Promise.all` (`.then`, `async`/`await` and per-destination forms) and `Promise.allSettled` with an `AggregateError` on fp2.
- **Must fail the happy path:** a doubled concurrency limit, a queued task resolving with `undefined`, and a composite that only flushes its first destination.
- **Must show the failure but skip later destinations, and fail the happy path for a caller that doesn't await:** a sequential `for … await`.

### Silencing checks

From the parsed before and after files:

- `void` operators added, with where each sits (statement or arrow body);
- every `.catch` and two-argument `.then`, with what its handler does (empty, logs only, rethrows, forwards the error, or other) and whether its own promise is dropped;
- `try`/`catch` clauses, with what they do;
- suppression comments (`eslint-disable`, inline `/* eslint */`, `biome-ignore`, `oxlint-disable`, `@ts-*`, comments naming the rules);
- added `any`, `as` assertions and non-null assertions;
- changes to any type-level declaration, such as the `setTimeout` stub, `Pool`, `AstroLoggerDestination` or `AstroLoggerMessage`;
- new imports;
- the run directory's file snapshot (other files changed, config created, the JSON or tsconfig edited);
- exported names and types, and `tsc` errors, with the subject's tsconfig.

### Classification

Each diff was classified by hand (`classifications.json`), with the categories:

- `void` silencing;
- swallowing `.catch`;
- logging `.catch`;
- rethrowing `.catch`, which was added for the one run that needed it;
- proper propagation;
- restructure.

Each entry also quotes or paraphrases what the agent's final message said about the bug. The final messages themselves aren't committed.

## Versions and environment

| Item | Value |
|---|---|
| Claude Code | 2.1.296, model `claude-opus-5-5`, effort `xhigh` (the account's default) |
| Codex | 0.155.1, model `gpt-6-astra`, reasoning `xhigh` (the account's default); workspace-write sandbox |
| Tooling | ESLint 10.12.0, typescript-eslint 8.71.0, TypeScript 6.0.3, Oxlint 1.86.0, oxlint-tsgolint 7.0.2004, Node 24.14.1, bun 1.4.2, macOS |
| Ultracite | `5ffb08c2`; `prompt.ts` and `agents.ts` unchanged since the first post |

**User-level config applied.** Both CLIs ran as personal installs. The user-level `CLAUDE.md` and `AGENTS.md` were empty, but installed plugins, skills and MCP servers were active, and Codex has a memory lookup.

## Results: all runs

| Run | Approach | Cleared | Happy path (outcomes / timing) | Error path | Fixed | Wall | Cost / tokens |
|---|---|---|---|---|---|---|---|
| fp1-claude-1 | `void` (statement) | yes | yes / yes | caller hangs, unhandled rejection | no | 36.0s | $0.33 |
| fp1-claude-2 | `void` (statement) | yes | yes / yes | caller hangs, unhandled rejection | no | 17.5s | $0.27 |
| fp1-claude-3 | rethrowing `.catch` | yes | yes / yes | caller hangs, unhandled rejection | no | 69.2s | $0.48 |
| fp1-claude-4 | `void` (statement) | yes | yes / yes | caller hangs, unhandled rejection | no | 20.4s | $0.29 |
| fp1-codex-1 | `void` (arrow body) | yes | yes / yes | caller hangs, unhandled rejection | no | 22.3s | 17.9k (142k) |
| fp1-codex-2 | `void` (arrow body) | yes | yes / yes | caller hangs, unhandled rejection | no | 20.8s | 16.0k (132k) |
| fp1-codex-3 | `void` (statement) | yes | yes / yes | caller hangs, unhandled rejection | no | 27.0s | 19.3k (172k) |
| fp1-codex-4 | `void` (arrow body) | yes | yes / yes | caller hangs, unhandled rejection | no | 16.8s | 15.1k (104k) |
| fp2-claude-1 | `await Promise.all` | yes | yes / yes | fixed | **yes** | 50.5s | $0.40 |
| fp2-claude-2 | `void` (statement) | yes | yes / yes | caller can't see it, unhandled rejection | no | 33.7s | $0.35 |
| fp2-claude-3 | `await Promise.all` | yes | yes / yes | fixed | **yes** | 42.6s | $0.36 |
| fp2-claude-4 | `await Promise.all` | yes | yes / yes | fixed | **yes** | 52.7s | $0.43 |
| fp2-codex-1 | `void` (statement) | yes | yes / yes | caller can't see it, unhandled rejection | no | 16.5s | 18.3k (146k) |
| fp2-codex-2 | `void` (statement) | yes | yes / yes | caller can't see it, unhandled rejection | no | 16.5s | 16.9k (137k) |
| fp2-codex-3 | `void` (statement) | yes | yes / yes | caller can't see it, unhandled rejection | no | 26.3s | 18.9k (117k) |
| fp2-codex-4 | `void` (statement) | yes | yes / yes | caller can't see it, unhandled rejection | no | 17.1s | 18.3k (146k) |

- **Cleared** means all three views: Ultracite's, inline config ignored, and Oxlint.
- **Codex tokens** are the "tokens used" figure Codex prints, with the figure including cached input in brackets. Codex reports no cost.
- **Claude cost** is Claude Code's own; its total tokens were 156k–464k.
- **In every run:** no suppressions, type changes, config files or other files touched, signatures were kept, and there were 0 new `tsc` errors.

## Summary by subject × agent

| Group | Cleared | Bug fixed | Happy path kept | `void` | Rethrowing `.catch` | Proper propagation | Wall s (median) | Cost / tokens (median) |
|---|---|---|---|---|---|---|---|---|
| fp1/claude | 4/4 | 0/4 | 4/4 | 3 | 1 | 0 | 28.2 | $0.31 |
| fp1/codex | 4/4 | 0/4 | 4/4 | 4 | 0 | 0 | 21.6 | 16.9k |
| fp2/claude | 4/4 | 3/4 | 4/4 | 1 | 0 | 3 | 46.6 | $0.38 |
| fp2/codex | 4/4 | 0/4 | 4/4 | 4 | 0 | 0 | 16.8 | 18.3k |
| all | 16/16 | 3/16 | 16/16 | 12 | 1 | 3 | 24.3 | – |

## Other observations

- **Claude reasoned about the trade-off; Codex didn't explain.**
  - Claude's final messages ran to several paragraphs. Each one said what it changed, what stayed the same and what it couldn't verify.
  - fp1-claude-3 avoided `void` because it expected Ultracite to ban the operator. It wrote the rethrowing `.catch` instead, which changes nothing at runtime.
  - fp1-claude-1 warned that `no-void` would flag its fix if Ultracite set it without `allowAsStatement`.
  - Codex's messages were two lines.
- **The fix only appeared on `compose`.** On `createPool`, a fix means threading a `reject` through the retry and changing what a queued caller sees. Claude described exactly that change in 2 runs and declined it both times. On `compose` the fix keeps every call the same for a caller that doesn't await, which may be why it was easier to justify.
- **Codex was nearly deterministic.** It wrote one file on fp2 and two on fp1. fp1-codex-2 first wrote the block-bodied form, then rewrote it to `() => void run(...)`.

## Caveats

- **n is small:** 2 functions × 2 agents × 4 runs. Codex's fp2 runs were byte-identical, so they say little more than one run would.
- **The prompt shapes this result.** It asks for "the minimal change … while preserving runtime behavior", and agents cited that to leave the bug. A prompt that said the rule may point at a real bug was not tested.
- **Not the full `ultracite fix` flow:**
  - Only the two promise rules were handed over. Ultracite's full ESLint presets report 30 diagnostics in fp1, 3 of them on the flagged line, and 5 in fp2.
  - There was no `eslint --fix` or Prettier pass first.
  - There was one attempt per run and no retries. The single-rule re-lint would have accepted every run anyway.
  - The timeout was 10 minutes rather than 5, and the working directory was a scratch folder.
  - The full-preset numbers are "rules that fire more after the edit", not a re-run of the agent with those diagnostics.
- **Personal installs:** the models and effort levels are one account's defaults on 2026-10-10, with that account's plugins, skills and MCP servers active.
- **The originals are public code** and may be in both models' training data.
- **The behavior checks are tests, not proofs.** They run on a virtual clock, with constructed scenarios and fixed budgets. The fp1 slot leak is a second bug the rule doesn't flag, so the "other tasks" numbers reflect both.
- **`void` isn't always wrong.** In the corpus, most floating promises were judged intentional, and there `void` is the documented way to say so. Here the oracle shows both subjects' dropped promises are real bugs.
- **A draft of the post existed, unlocked, during the runs.** It was `apps/docs/blog/floating-promises.mdx`, in the same worktree. No session log references it.
- **Harness fixes made after the runs, none of which changed what an agent saw:**
  - fp1-claude-1's session log wasn't found at first, because Claude records the `/private` form of `$TMPDIR`. It was recovered from the log, and `run-one.mjs` now matches both forms.
  - Other runs' staging folders are now locked.
  - Redaction now also covers emails and macOS's per-user temp root.
- **Session logs are not committed.** They contain account identifiers; see `research/README.md`.

## Reproduce

From `research/agent-experiment/`, with `RESEARCH_TOPIC=floating-promises` (see `README-section.md`). Re-measuring the committed runs and aggregating reproduces `results.json` without running any agent. This was checked with the session logs moved aside: every `measure.json` and `results.json`, apart from `generatedAt`, came out identical.
