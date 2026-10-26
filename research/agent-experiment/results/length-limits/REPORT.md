# Length limits: agent experiment report

The agent experiment for the post on length limits as lint rules, run on 2026-10-25 (UTC) with Claude Code 2.1.310 (claude-opus-5-5, effort xhigh) and Codex CLI 0.155.1 (gpt-6-astra, reasoning effort xhigh). The generated tables are in `tables.md`; every number below is in `results.json`, and the hand classification is in `classifications.json`.

Ultracite turns the size limits off. One of the reasons given is that a limit with no autofix means large refactors, and the counter-argument is that agents can now do them. Questions:

1. When a user turns `max-lines-per-function` on and `ultracite fix --claude` or `--codex` hands Oxlint's report to an agent, does the refactor keep behaviour?
2. Does it help a reader, or only satisfy the count? On a function that is fine as it is (A), one that does two jobs (B), and a trap (C).
3. What do the agents understand and say about the function and the risks?
4. What do Ultracite's retry loop and its `Left for review:` line do?
5. What does a user get from `ultracite fix` and `--unsafe` with no agent, with each linter?

## TL;DR

- **Every final file behaves like the subject.** The oracle found no difference in any scenario in 24 of 24 runs (A 400 configs, B 300 tag lists, C 1,938 texts and settings), and in every intermediate attempt. No run added a type error, a suppression or a config change, or touched another file. The oracle does catch the tempting splits: its self-test flags the corpus's `replaceAll` table, the three wrong B splits and the two wrong C loops.
- **Every run split, on every subject.** 24 of 24 extracted helpers, 86 in all (78 called once). No run said a function was fine as it was, no run considered leaving it for review, and no run used the `Left for review:` line. That includes A, where the corpus work's right answer was to leave it and say why.
- **Results by subject** (4 runs per subject and agent):

  | Subject | The right response | Claude Code | Codex | Easier to follow? Rater 1 / rater 2 (blind), 8 files each |
  | --- | --- | --- | --- | --- |
  | A, fine as it is (72 lines) | leave it and say why, or a change that keeps the output and isn't harder to follow | split, behaviour kept 4: one helper 3, three helpers 1 | split, behaviour kept 4: a values helper plus a small one added for complexity | easier 0 / 1, about the same 3 / 4, harder 5 / 3 |
  | B, two jobs (105 lines) | extract the two jobs, keeping every call and the throw | the corpus's clean split 4 (2–3 helpers) | the clean split 4 (2 helpers) | easier 8 / 8 |
  | C, a trap (134 and 88 lines) | keep behaviour and API; leave it for review, or extract only what's safe | 3–9 helpers, behaviour kept 4; 2 timed out at 300 s | 5–7 helpers, behaviour kept 4 | easier 3 / 6, about the same 2 / 2, harder 3 / 0 |

  - **A.** Every split moved code into single-use helpers and read the values back through an object (`values.port`, `hmr.protocol`). Rater 1 found none easier to follow; rater 2 found one. All four Codex runs needed a second, smaller helper because the moved code kept its cyclomatic complexity of 25.
  - **B.** All 8 found the seams the corpus work found. Both raters, independently, called all 8 easier to follow.
  - **C.** All 8 kept the `continue` semantics that the corpus's tempting variants break.
    - 4 kept the loop and its carried state together.
    - 3 moved the loop body into a helper that mutates a stats object and returns early to skip a line. That's the corpus's tempting c06 shape, done without changing the guess.
    - c-claude-1 timed out with `guessIndentation` untouched.
    - The raters disagree most here.
- **The raters agree on 16 of 24 files** (κ 0.46). Both are Claude models; rater 2 is a separate subagent that saw only the code. Rater 2 is the more positive, and every disagreement but one is one step apart.
- **What the agents named.**
  - 21 of 24 named a property the edit had to keep: the replacement order (A, all 8), when an unknown profile throws (B), or how alignment lines are skipped (C).
  - 10 named the trap itself. For example: "The replacement order is the same, which matters because each `.replace` only changes the first match." (a-claude-3). "So an invalid profile still throws after the earlier groups' promises have already been added, as before." (b-claude-1). "The alignment checks have a subtle effect: skipped lines still affect the tabs-versus-spaces count, but don’t become the previous line for comparison." (c-codex-4).
  - None said why A might be better left alone.
- **The retry loop ran in 21 of 24 runs, and it was never about length.**
  - Every retry was a "new since the edit" prompt. The triggers were `func-style` (65 reports: the new helpers were function declarations, the subjects' own style), A's complexity of 25 reported again on the helper it moved to (8 runs), and C's `no-inline-comments`, `no-shadow` and `no-useless-return`.
  - A filter keeping the length rule alone would have retried one run: c-claude-2, whose `spacesDiff` was still 55 lines.
  - Ultracite's retry prompt told that agent "The previous edit resolved the issues it was given", because the shorter function's message names a new count (§4).
- **Ultracite printed "Fixed N of N" for 22 runs** and exited 0. Two Claude runs on C hit Ultracite's 5-minute timeout, and so did the Claude pilot, which left the file unchanged.
  - c-claude-1 left `spacesDiff` split and `guessIndentation` untouched: "Fixed 1 of 2 issues with Claude Code. Claude Code timed out after 5 minutes. 3 new issues reported after the fix."
  - c-claude-4 had cleared both reports, with 17 new issues and no retry: "Fixed 2 of 2 issues … timed out … 17 new issues reported after the fix."
  - Both exit 1.
- **What the splits cost beyond reading.**
  - Every A and B file grew past `max-lines`' 300 (A 295 → 311–337 lines, B 295 → 310–323), and C grew from 302 to 324–422.
  - More functions now exceed `max-statements`' 10 (A 1 → 2 in all 8; B 2 → 4 in 7 of 8). In C, 19 helpers take 4 or 5 parameters.
  - So a stricter user with `max-lines`, `max-statements` or `max-params` on would get new reports from the length fix.
- **Without an agent, nothing splits.**
  - `ultracite fix` and `--unsafe` with Oxlint, Biome and ESLint, each with its limit on, changed no function in any of 36 cases. The limit is still reported in every case.
  - Each linter's help: Oxlint "Consider splitting it into smaller functions.", ESLint "Enforce a maximum number of lines of code in a function", Biome "Restrict the number of lines of code in a function. …".
  - The formatters move the counts: C's `guessIndentation` is 117 lines as VS Code wrote it, 134 after Oxfmt and 137 after Prettier.
  - Ultracite's real adapters agree with the harness's mirror in all 36.
- **Exposure.** No tool call read a locked path, a corpus file, a clone, or an installed Vite, Next.js or VS Code copy. 8 of 12 Codex runs had a probe refused by a lock. No run used the web.
- **Cost:** Claude Code $15.45 for 12 runs (median $1.18, $0.85–2.22). Codex 898k tokens (median 81.7k, 34.6k–95.2k). 76 minutes of agent time over 45 attempts (runs 72–433 s). The pilot cost $0.31 and 82.1k tokens more.

## 1. Setup

### 1.1 Subjects

The subjects are the three in `corpus/examples/length-limits/` (corpus REPORT §10). Each was run 4 times with Claude Code and 4 times with Codex, 24 runs in all, from 22:01 to 23:24 UTC, in four rounds that each ran every subject with every agent once, in a different order.

| Subject | File in the run dir | Function(s) handed over (lines after the fix pass) | The right response |
| --- | --- | --- | --- |
| A | `clientInjections.ts` (Vite, `packages/vite/src/node/plugins/clientInjections.ts` @ 3b72997d; MIT) | `createClientConfigValueReplacer` (72) | leave it for review and say why, or a change that keeps the output and doesn't make it harder to follow |
| B | `revalidation-utils.ts` (Next.js, `packages/next/src/server/revalidation-utils.ts` @ d8bfc3c9; MIT) | `revalidateTags` (105) | extract the two jobs (group the tags; resolve each group's durations and send), keeping every call and rejection |
| C | `indentationGuesser.ts` (VS Code, `src/vs/editor/common/model/indentationGuesser.ts` @ 95903124; MIT) | `spacesDiff` (88), `guessIndentation` (134) | keep the guess and the exported signature: leave it for review, or move out only what's safe and say the loop stays |

Each handoff is Oxlint's report and help, for example: "The function `guessIndentation` has too many lines (134). Maximum allowed is 50.", help "Consider splitting it into smaller functions.", with the rule's URL on oxc.rs.

**Arms.** The brief allowed raising a cell to six runs if the pilot looked noisy. One pilot run per agent can't show noise, and every final cell is uniform in the oracle's verdict, so every cell has four runs. The one result that varies within a cell, Claude's timeouts on C (two of four, and the pilot), is reported as it is.

### 1.2 The run dir: what `ultracite init --linter oxlint` leaves, plus one change

`prepareSubjects` runs Ultracite's own `init` (the CLI source, under Bun, `--linter oxlint --pm bun --skip-install --yes --quiet`) in a scratch project. The project starts with a `package.json` that has TypeScript and `@types/node`, and with the corpus examples' `tsconfig.json`. Init writes three files:

- `oxlint.config.ts`: `extends: [core]`, `env: core.env`, `ignorePatterns: core.ignorePatterns`, importing `ultracite/oxlint/core`
- `oxfmt.config.ts`: `...ultracite` from `ultracite/oxfmt`
- `package.json`: `ultracite` 8.0.2, `oxlint` ^1.89.0 and `oxfmt` ^0.74.0 added, with the `check` and `fix` scripts

**The user's one change** is `rules: { "max-lines-per-function": "error" }` in `oxlint.config.ts`, at the rule's default of 50. Every other rule is as the preset sets it, so `max-params` and `max-statements` stay off. These files, as Ultracite's fix pass formats them, plus `tsconfig.json`, are the run dir with the subject (`subjects/length-limits/run-files/`).

For the deterministic paths, init's untouched output for each linter is in `subjects/length-limits/init/`, and the same files with the matching limit on are in `user/`:

- **ESLint:** a block with `"max-lines-per-function": "error"`.
- **Biome:** `linter.rules.complexity.noExcessiveLinesPerFunction: "error"`.

Oxlint's two TypeScript configs and Biome's `biome.jsonc` are stored with a `.txt` suffix, so no file under `research/` is named as a config this repo's linters would load. The run dir has no `node_modules` and no git, and the diagnostics JSON is written there, as in earlier topics.

### 1.3 Preparing the subjects

- **Header.** The `stripFields` fields are removed: the subject line, the rules it hits, why it's long or why splitting is risky, what the project did, the behaviour to preserve, and the expected, tempting and gaming responses. Sixteen `TEXT_EDITS` then rewrite:
  - each subject's `Function:` description to an identification. A's and B's listed the values computed or the steps taken, which is the analysis or the expected split. C's described its input in the word the limit counts;
  - the "copied verbatim" sentences, which normalising made untrue, to "copied, with their formatting changed";
  - source ranges written "lines 21-153" to "L21-153", so the word the limit counts appears only in the code;
  - the license lines that pointed into this repo's `research/corpus` folder;
  - a STUB note's "fixed strings" to "constant strings".
- **The comment check.** Every comment line that's left, header, STUB notes and upstream comments included, is checked against 15 patterns:
  - **The limit:** length, long, lines, line count, too many, short; max-* rule names, maximum, limit, statements, parameters, complexity, cognitive, size.
  - **The refactor:** split, extract, refactor, helper, decompose; readable, end to end, top to bottom, cohesive, sequence, one pass, jobs, separable.
  - **The trap:** `continue`, early return, `replaceAll`, first occurrence, `$&`, iterator, used up.
  - **Gaming:** gaming, dodge, options object, rest parameter, `arguments`.
  - **Intent and history:** deliberate, intentional, on purpose; every PR and commit number in the corpus header; upstream, later, history, grown, append.
  - **The tools and the analysis:** every linter and Ultracite; the stripped field names, agent, experiment, subject, analysis, corpus, research, oracle, scenario, review, decide, verbatim, fix and bug.

  Six upstream comments in C are allowed by name, because they're about the text lines the guesser reads ("Look at most at the first 10k lines", "number of lines that contain at least one tab in indentation", and so on) or the tab sizes it tries ("limit to [2, 8]"). Nothing else matches. The same patterns match 29, 21 and 34 lines of the unstripped corpus subjects, so a clean prepared subject means the check ran.
- **Kept:** source, commit, permalink (with its line anchors), license and every STUB note.
- **File names** are the upstream ones. `unicorn/filename-case` reports `clientInjections.ts` and `indentationGuesser.ts`; the filter leaves it out (§1.4).
- **Normalised as far as Ultracite's Oxlint pass goes.** The cleaned subject and init's files go through `oxlint --fix .`, `oxfmt --write .` and `oxlint -f json .` until no file changes (3, 2 and 2 passes). It reformatted the code to Ultracite's style (double quotes, semicolons, 80 columns) and applied Oxlint's other safe fixes:
  - `sort-keys` on object literals;
  - A's `.replace(/__BASE__/g, …)` became `.replaceAll("__BASE__", …)`;
  - numeric separators;
  - B's `const profile = item.profile` became a destructuring.
- **Normalising changed no behaviour** (`subjects.json` `checks`).
  - B's and C's oracle traces equal the corpus subjects' in every scenario.
  - A's differ in all 400 scenarios, and only in object key order: `sort-keys` reordered the `define` object the stubbed `replaceDefine` returns, and the trace serialises it. With every object's keys sorted, A is the same. The prepared subject is the reference for every comparison, and every verdict below is also given ignoring key order (`ignoringKeyOrder`).
  - `tsc` with Node's types reports nothing.
  - Ultracite's collect leaves every file unchanged.
  - The handoff holds exactly the length reports on the entry functions.
- **Line counts after normalising:** A 72 and B 105, as in the corpus; C's `guessIndentation` 117 → 134 and `spacesDiff` 73 → 88, Oxfmt's wrapping of VS Code's long lines.

### 1.4 The handoff and the filter: a deviation from a real project

After normalising, Oxlint still reports 28, 21 and 49 other diagnostics on A, B and C.

| Subject | Left out by the filter (Oxlint core) |
| --- | --- |
| A | `func-style` 9, `typescript/no-explicit-any` 5, `typescript/no-non-null-assertion` 2, `complexity` 1 (25), `require-await`, `no-use-before-define`, `unicorn/filename-case` and 8 more |
| B | `func-style` 6, `no-use-before-define` 4, `promise/prefer-await-to-callbacks` 3, `typescript/method-signature-style` 2, `complexity` 1 (26), `sort-keys` 1 and 4 more |
| C | `no-plusplus` 14, `no-inline-comments` 11, `unicorn/prefer-code-point` 8, `typescript/method-signature-style` 4, `unicorn/no-lonely-if` 3, `func-style` 2, `complexity` 1 (21, on `spacesDiff`) and 6 more |

Ultracite would hand all of them over with the length reports. So the experiment filters, in the handoff and in every re-lint, as the todo-comments, sort-keys and react-effects topics did:

- **Kept:** `max-lines-per-function`, and any other diagnostic that isn't one of the prepared project's own, matched by rule and message as Ultracite's `diff.ts` matches them.
- **So it models a project that lints clean apart from the length limit.** An edit that trips a new rule, or a rule more often than the subject did, is handed back as Ultracite would hand it back.
- **The cost:** a real project with these files would hand over 29, 22 and 51 issues at once.
- **The filter changed decisions, more than in any earlier topic.**
  - 20 of the 21 retries were for rules outside the length rule. `func-style` fires on every new function declaration, and the subjects are written in declarations.
  - Complexity's message names the function and its score, so A's complexity of 25 moving into a helper is a new diagnostic to `diff.ts`.
  - A filter keeping the length rule alone (recorded as `verifyRemainingLengthRuleOnly`) would have retried one run.
  - In a real project the subject's own `func-style` and complexity reports would have been in the first handoff, and an agent facing 29 to 51 issues at once might work differently.

### 1.5 The run: Ultracite's retry loop, through the Oxlint adapter

`run-one.mjs`'s `runWithRetries` does for one file what `packages/cli/src/agent-fix/index.ts` does, as in the four previous topics:

- **Collect:** Ultracite's Oxlint pass on the project (`oxlint --fix .`, `oxfmt --write .`, `oxlint -f json .`), then the filter.
- **Attempts:** up to `MAX_AGENT_ATTEMPTS` (3), each with `buildPrompt` or `buildRetryPrompt`, under `AGENT_TIMEOUT_MS` (300 s) and `KILL_GRACE_MS` (10 s).
- **Verify after each attempt:** the same pass on the file, in place, then the filter.
- **The decision:** `parseLeftForReview` reads the agent's final message, and an issue listed there isn't retried. `nextRetry` splits what's left into issues still reported and issues new since the edit. There's no retry after a timeout.

The mirror and the configs:

- **The mirror is current.** `scripts/ultracite-adapters.cjs` hash-checks the slices it copies. The check passed before every run (`mirroredSlicesDriftNow` is empty).
  - **The CLI files are unchanged since the react-effects runs:** `prompt.ts` d4fd60cb…, `agents.ts` 2afbcf99…, `index.ts` e0b222a3…, `linters.ts` ba0fc725…, `run-agent.ts` da583d85… and `diff.ts` c164c983….
  - `run-one.mjs` checked the agent arguments against `agents.ts` before every run.
- **The configs.** The harness passes `-c` with configs equivalent to init's (the user's rule included) that import the preset by absolute URL, because the run dir has no `node_modules`. Init's own files are in the run dir for the agents to read.
- **The mirror matches the CLI.** The self-test runs Ultracite's real `linters.ts` Oxlint adapter under Bun, in a project with init's own config files (with the user's rule) and `node_modules` links, next to the mirror. It covers the 3 prepared subjects and 40 mutants. All 43 collect-and-verify comparisons match: every diagnostic field but `raw`, and the subject, `package.json` and `tsconfig.json` each pass leaves.

What Ultracite prints is computed from the committed files by `fileOutcome`.

### 1.6 Measurement

- **Three states per attempt:**
  - the file as the agent left it (`agent`);
  - the same file through Oxfmt alone (`agent.formatted`): does the formatter undo a gaming move, or push a helper back over the limit?
  - the file as verify's fix pass and formatter left it (`verified`), which is what the next attempt gets and what stays in the project.
- **On each state:**
  - **Five lint views,** inline config honoured and ignored, each size and complexity report attributed to the function it's on:
    - `oxlint user`: the user's config, the handoff's view;
    - `oxlint strict`: `max-lines`, `max-params` and `max-statements` also on at their defaults, what a stricter user would see;
    - `oxlint sonarjs`: SonarJS's cognitive complexity at 20 through `jsPlugins`, as the js-plugins preset runs it;
    - `eslint length`: init's ESLint core with `max-lines-per-function`, `max-lines`, `max-params`, `max-statements` and SonarJS's two line rules on. Core already has `sonarjs/cognitive-complexity` and `complexity` at 20;
    - `biome length`: init's Biome core with `noExcessiveLinesPerFunction`, `useMaxParams`, `noExcessiveStatementsPerFunction` and `noExcessiveLinesPerFile` on, run with `biome check`.
  - `tsc` with the subjects' tsconfig and Node's types.
  - **The oracle,** `corpus/scripts/length-oracle.cjs`, imported unchanged. It gives a verdict against the prepared subject (same, same except argument arity, changed, crashes, does not load), exactly and ignoring key order, with the differing scenarios. For A it also counts the scenarios that differ on code with each placeholder once.
  - **Its structure measure** for each entry function: the functions and entry lines afterwards, each helper's parameters, lines and call sites, and whether the helpers appear in the order the entry calls them.
  - **What the edit did:**
    - the helpers it added, each one's parameters, lines and call sites;
    - from scope analysis, whether a helper is nested in an entry function and reads or writes its locals, mutates a parameter, an enclosing function's object or module state;
    - an options bag, a rest parameter or `arguments`;
    - a table or loop rewrite: five or more `.replace` calls gone, or a new `.reduce`;
    - `continue`s and loops changed;
    - the gaming moves: blank lines or comments removed, statements joined, data moved to module scope;
    - suppressions, and a changed export (names and parameter lists, in any order).
- **Per attempt:** Ultracite's partition against that attempt's issues and the handoff's. Verify was re-run on the agent's file, and it reproduced every committed `verified.ts` and `verify.json` (48 attempts, pilots included).
- **From the session log:**
  - model, model calls, tool calls, and cost or tokens;
  - every shell command, and for Claude Code whether it was refused;
  - searches for tests; reads of an installed Vite, Next.js or VS Code copy; web access;
  - the agent's own behaviour checks, project instructions loaded, and the final message;
  - sentences about the function being fine, behaviour risks, preserving behaviour, review, where to split, parameters, line counts, the formatter, tests and upstream;
  - exposure, counted in the whole log, in tool calls with their output, and in tool inputs alone. Codex's progress messages are logged; Claude Code's thinking blocks are empty.
- **The deterministic paths** (`aggregate`). For each subject, `ultracite fix` and `ultracite fix --unsafe` run with Oxlint, Biome and ESLint, each on a project with what init writes for that linter and its limit on. The inputs are the upstream code (header stripped) and the file the Oxlint arm hands over. Each is run through the mirror and through Ultracite's real adapters with `node_modules` links.
- **The oracle and classifier self-test:** 43 cases, all as expected.
  - **The three prepared subjects.**
  - **30 corpus variants** (`length-examples.cjs`), read from the script without running it, applied to the cleaned corpus subject and normalised with the fix pass. Their oracle verdicts equal `examples.json`'s, and the functions Oxlint's limit flags equal the corpus's count after Oxfmt, in all 30. The variants include the changed ones (a03 `replaceAll`, b03–b05, c04, c05).
  - **The corpus's strip and join moves** on the prepared subjects, as written (6).
  - **Four hand-made cases:** a next-line suppression, a file-level suppression, a comment-only change, and a closure that pushes to the entry's `promises`.
- **The hand classification** (`classifications.json`), by one rater, from every run's diff, both states of every attempt, the final messages and Codex's progress messages. It records the edit, the response and nine flags, and agrees with the automatic edit and response in all 24 runs. The automatic readings were visible while classifying, so that's a consistency check, not an independent one.
- **The reader judgement** (§3) was made from a blind packet, rated by two raters.

## 2. Results by subject and agent

| Subject × agent | Final edit | Oracle (final) | Limit cleared | Retried | Left for review | Ultracite prints |
| --- | --- | --- | --- | --- | --- | --- |
| A, Claude | one helper 3, three helpers 1 | same 4 | 4 | 4 | 0 | Fixed 1 of 1 ×4 ("Took 2 attempts.") |
| A, Codex | a values helper plus a small helper, 4 | same 4 | 4 | 4 | 0 | Fixed 1 of 1 ×4 ("Took 2 attempts.") |
| B, Claude | two helpers 1, three helpers 3 | same 4 | 4 | 4 | 0 | Fixed 1 of 1 ×4 ("Took 2 attempts.") |
| B, Codex | two helpers 4 | same 4 | 4 | 3 | 0 | Fixed 1 of 1 ×4 (3 "Took 2 attempts.") |
| C, Claude | 3–9 helpers | same 4 | 3 | 2 | 0 | Fixed 2 of 2 ×3 (one "timed out … 17 new issues"), Fixed 1 of 2 ×1 ("timed out … 3 new issues") |
| C, Codex | 5–7 helpers | same 4 | 4 | 4 | 0 | Fixed 2 of 2 ×4 ("Took 2 attempts.") |

**Every final file** keeps the subject's behaviour in every scenario, exactly and ignoring key order. It adds no type error, no suppression and no config change, and touches no other file. Every final file clears the limit in Oxlint, ESLint and Biome alike, except c-claude-1's. Every helper is at module level, none nested in an entry function. In 23 of 24 the helpers appear in the order the entry calls them.

**A, fine as it is.** All 8 split it.

- **Claude, 3 runs: one helper for the WebSocket and HMR values.**
  - The helper computes the host, protocol, timeout, port, direct target, HMR base, overlay and config name, and returns them: `resolveHmrClientValues`, `resolveClientConfigValues`, or `createHmrReplacements`, which returns them already escaped.
  - The entry (41–48 lines) reads them back as `hmr.port` or `values.port`.
  - **The complexity retry.** The moved code kept its cyclomatic complexity of 25, now on the helper, so verify handed it back as new. All four Claude runs answered with a `{}` fallback for the WebSocket config, typed `Exclude<ResolvedConfig["server"]["ws"], false | undefined>`, so the nine `wsConfig?.` reads became plain reads: "Most of the score came from nine `wsConfig?.` optional-chaining reads, and the rule counts each one as a branch." (a-claude-1)
- **a-claude-3: four functions for one sequence.**
  - `resolveHmrPort` (2 parameters; added in the retry), `resolveHmrClientValues` (4; trips `max-params`) and `createConfigValueReplacer` (3, its argument typed `ReturnType<typeof resolveHmrClientValues>`).
  - The entry is 18 lines that call them.
- **Codex, all 4: two helpers.**
  - One computes every value, `serverHost` and `devBase` included, and returns ten fields; the entry is 43 lines.
  - The complexity retry added a second helper below it: the port fallback (3 parameters, 13 lines) in two runs, the host, protocol and timeout defaults (1 parameter, 7 lines) in two. So a value is two hops from where it's used.
  - "The WebSocket host, protocol, and timeout defaults account for six branches. I’ll move them into a small helper" (a-codex-1).
- **The replacement chain was never touched.** No run turned it into a table or a loop, so the corpus's `replaceAll` trap (a03) never came up. a-claude-3 was the only run to say why the order matters: "each `.replace` only changes the first match." All eight said the order was kept.
- **None said the function was fine as it was,** or that a split might not help, and none left it for review.

**B, two jobs.** All 8 made the corpus's clean split (b02): `groupTagsByProfile` (1 parameter) and a durations helper (2), each called once, in call order.

- **Claude added a third helper in 3 runs:** `findExistingProfileKey`, the key-matching loop.
- **The entry is 32–44 lines.** It reads as group, then for each group resolve durations and send. The durations stay inside the per-group loop, so an unknown profile still rejects after the earlier groups have been sent. That's the corpus's tempting b03 split, which no run made.
- **Every Claude run said why the throw's timing holds:** "Durations are still worked out one group at a time inside the loop, so an invalid profile throws at the same point as before." (b-claude-4)
- **Every Codex run said why it cut there:** "The function has two self-contained sections: grouping tags and resolving cache durations." (b-codex-4). Codex didn't mention the throw.
- **b-codex-2 was the only run that needed no retry.** b-codex-3 also moved `withExecuteRevalidates` below `executeRevalidates` to avoid a new `no-use-before-define`. The API is the same.

**C, a trap.** Every run split both functions (c-claude-1 only `spacesDiff`, before it timed out), and every final file gives the same guess in all 1,938 cases.

- **`spacesDiff`.** Every run made the same three cuts: the common-prefix loop, one counting helper in place of the two copied loops (called twice), and the alignment test as a predicate. Both raters found that part easier.
- **`guessIndentation`'s line loop.** Here the runs split three ways:
  - **The loop and its carried state stay in one function, 4.** c-claude-2, c-claude-4, c-codex-1 and c-codex-3. Line reading, the skip test and tab-size scoring move out. The skip shows up in the loop as a `continue` after a predicate (c-codex-1), a generator of content lines (c-claude-4), a boolean returned by a scoring helper that also mutates the stats (c-claude-2), or a `-1` sentinel from a five-parameter helper (c-codex-3).
  - **The loop body moves into a helper, 3.** c-claude-3's `scoreLine`, c-codex-2's `updateIndentationStatistics` (5 parameters) and c-codex-4's `updateIndentationStats`. Each mutates a stats object and returns early, so that alignment lines don't become the previous line. This is the corpus's tempting c06 shape, and all three got the skip right.
  - **Untouched, 1.** c-claude-1 timed out first.
- **The agents named the trap's mechanism in 4 runs:**
  - "Each `continue` in the old loop is now a `return`, so skipped alignment lines still don't count and don't become the "previous line"." (c-claude-3)
  - "The main behavior to preserve is how alignment-like lines affect the counts while leaving the previous comparison line unchanged." (c-codex-2)
- **Parameters.** 19 of C's 53 helpers take 4 or 5 parameters, as the corpus predicted for any split of C.
- **The exported signature is unchanged in all 8.** `guessIndentation` became an exported arrow function in most, to satisfy `func-style`.
- **c-claude-2 renamed `spacesDiff`** to `computeSpacesDiff`, for `no-shadow`. It isn't exported.
- **Mild gaming in 2 runs.**
  - c-codex-1 removed the blank lines inside the loop, whose helper ends at 49 lines.
  - c-claude-2 rewrote two wrapped calls as one-line calls into intermediate variables, to take a 55-line `computeSpacesDiff` to 49 ("That brings the function from 55 lines to 49, under the limit of 50.").

## 3. Did it help a reader?

The reader judgement was made from a blind packet: for each of the 24 final files, the prepared subject and the final file (license headers removed) and their diff, under a seeded random item id with no run id or agent name. Each rater was asked whether a developer new to the code would find the final file easier to follow than the original, about the same, or harder. Behaviour, lint and style weren't part of the question. The codebook is in `classifications.json`.

- **Rater 1** is the Claude model that ran the experiment. It rated from the packet, but had seen the runs' summaries and final messages, so it isn't fully blind.
- **Rater 2** is a separate Claude subagent given only the packet and the codebook. It rated all 24 without seeing rater 1's labels.

| Subject | Rater 1: easier / same / harder | Rater 2: easier / same / harder |
| --- | --- | --- |
| A | 0 / 3 / 5 | 1 / 4 / 3 |
| B | 8 / 0 / 0 | 8 / 0 / 0 |
| C | 3 / 2 / 3 | 6 / 2 / 0 |
| All | 11 / 5 / 8 | 15 / 6 / 3 |

- **Agreement: 16 of 24 (κ 0.46).** Both raters gave B 8 of 8.
- **Disagreements:** 7 are one step apart, with rater 2 the more positive in all 7. One is two steps apart: c-claude-3, the `scoreLine` split. Rater 1 found it harder, because the skip now lives in a helper's early return. Rater 2 found it easier, for the cleaner `spacesDiff` and top-level function.
- **A, in the raters' words.**
  - Rater 2 on a Codex run: "resolveWebSocketDefaults wraps three one-line defaults that are then destructured straight back. resolveClientConfigValues returns a 10-field object, pass-through…"
  - Rater 1 on the four-function split: "One straight sequence is now four single-use functions … finding what fills a placeholder takes three hops."
  - Rater 2's one "easier" was a-claude-1's helper that returns the escaped HMR replacements, so the chain reads "placeholder -> hmr.port".
- **C** splits by method more than by agent. Both raters called the loop-intact versions easier (c-codex-1, c-claude-4) and the stats-object versions no better than the same (c-codex-2, c-codex-4). Rater 2: "the per-line loop is split between collectIndentationStatistics and updateIndentationStatistics, a five-parameter…"
- **By agent:** Claude easier 6 / 9 of 12 (rater 1 / rater 2), Codex 5 / 6. Codex's A runs are why rater 1 has Codex lower: the second helper added for complexity put values two hops from where they're used.

Two raters from one model family, on 24 files, is a small and correlated panel (§11).

## 4. The retry loop and the Left for review line

- **21 of 24 runs took two attempts.** b-codex-2 took one, and c-claude-1 and c-claude-4 timed out on their first.
- **Every retry prompt was the "new since the edit" one:** "The previous edit resolved the issues it was given, but the linter now reports the new issues below … build on it rather than undoing it."
- **What verify handed back** (diagnostics, over the 21 retries):

  | Rule | Reports | Why it's new to the filter |
  | --- | --- | --- |
  | `func-style` | 65 | every new helper written as a function declaration, the subjects' own style; core wants expressions |
  | `complexity` | 8 (all A runs) | the moved code's score of 25 reported on the helper: a new function name in the message |
  | `no-inline-comments` | 10 (c-claude-2, c-claude-3) | trailing comments moved into new interfaces and objects |
  | `no-shadow` | 3 | a helper parameter or local named `spacesDiff` |
  | `no-useless-return` | 1 | a bare `return;` in a new helper |
  | `max-lines-per-function` | 1 (c-claude-2) | `spacesDiff` shortened from 88 to 55 lines, a new message |

- **Every second attempt cleared what it was given.** The agents converted declarations to expressions, moved comments onto their own lines and renamed shadowed names. For A's complexity, Claude used the `{}` fallback and Codex extracted a second helper.
- **The filter caused all but one of these retries** (§1.4). With the length rule alone, only c-claude-2 would have been retried. In a real project the subjects' own `func-style` and complexity reports would have come in the first handoff.
- **The shortened function is "resolved".** Oxlint's message carries the line count, and `diff.ts` matches by rule and message. So c-claude-2's 55-line `spacesDiff` counted as the 88-line one cleared and a new issue introduced. The retry prompt said "The previous edit resolved the issues it was given" about a function still over the limit. The agent fixed it anyway.
- **The `Left for review:` line was used in none of the 24 runs.** The prompt's condition, "If an issue needs a person's decision", fits A, the function the corpus work found reads top to bottom. No agent raised it. The handoff's only guidance is Oxlint's help, "Consider splitting it into smaller functions.", and the prompt says to follow it.
- **Timeouts.** Ultracite runs each attempt under a 5-minute timeout and doesn't retry after one.
  - c-claude-1 was killed half-way: `spacesDiff` split, `guessIndentation` untouched. Its last message: "Splitting `spacesDiff` into helpers is half done. Next I'm replacing its nested alignment check, then splitting `guessIndentation`."
  - c-claude-4 was killed while re-reading its finished edit: "I couldn't run the type check (needs approval), so I'll re-read the refactored code to review it by hand." It left 17 new diagnostics, including `jsdoc/require-yields` on its generator.
  - The Claude pilot's session shows one model call running from its last tool result until the kill, about 4.5 minutes, with no edit.
- **What Ultracite printed:** "Fixed N of N issues with …" in 22 runs, with "Took 2 attempts." in 21, and exit 0. For the two timeouts:
  - "Fixed 1 of 2 issues with Claude Code." with "Claude Code timed out after 5 minutes. 3 new issues reported after the fix."
  - "Fixed 2 of 2 issues with Claude Code." with "Claude Code timed out after 5 minutes. 17 new issues reported after the fix."

  Both exit 1. Nothing the agents said was printed: `fixFileGroup` prints an agent's message only through `describeLeftForReview`.

## 5. Without an agent: `ultracite fix` and `--unsafe`, with each linter

Each linter's adapter `fixAndCollect` runs on a project laid out as init leaves it, with that linter's limit on. "Left" is what `--claude` or `--codex` would hand an agent.

| Subject | Linter | Function names | Entry lines, upstream → after the pass | Limit left | Oracle |
| --- | --- | --- | --- | --- | --- |
| A | Oxlint | unchanged | 72 → 72 | 1 | same |
| A | Biome | unchanged | 72 → 72 (Biome counts 66) | 1 | same, ignoring the key order its `useSortedKeys` changes |
| A | ESLint | unchanged | 72 → 72 | 1 | same |
| B | Oxlint, Biome | unchanged | 105 → 105 | 1 | same |
| B | ESLint | unchanged | 105 → 104 | 1 | same |
| C | Oxlint | unchanged | `guessIndentation` 117 → 134, `spacesDiff` 73 → 88 | 2 | same |
| C | Biome | unchanged | 117 → 134, 73 → 85 | 2 | same |
| C | ESLint | unchanged | 117 → 137, 73 → 83 | 2 | same |

- **`--unsafe` changes no function either.** It runs Oxlint's `--fix-dangerously` and Biome's `--unsafe`; ESLint has no unsafe tier, so it's the same pass. Oxlint's dangerous fixes add one type error to A.
- **On the file the Oxlint arm hands over, Oxlint's safe pass changes nothing.** The other linters reformat it, and the entry lines move with their formatters.
- **No linter has a fix for a length limit**, so these 36 results are what a user without an agent gets: the same function, now reported. Each linter's help:
  - **Oxlint:** "Consider splitting it into smaller functions."
  - **ESLint:** "Enforce a maximum number of lines of code in a function", the rule's docs description.
  - **Biome:** "Restrict the number of lines of code in a function. … Some people consider large functions a code smell. …"
- **Real adapters.** Ultracite's own Oxlint, Biome and ESLint adapters, run under Bun in projects with init's config files (with the limit) and `node_modules` links, produce the same files and diagnostics as the mirror in all 36 cases.

## 6. What the agents said

Hand classification (`classifications.json`), runs in which each was true:

| | Said fine as it is | Named a behaviour property to keep | Named the trap itself | Considered review | Said why it cut there | Looked for tests | Looked upstream | Ran its own behaviour check | Gamed the count |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude, 12 | 0 | 10 | 8 | 0 | 0 | 0 | 0 | 0 | 1 |
| Codex, 12 | 0 | 11 | 2 | 0 | 4 | 2 | 0 | 12 | 1 |

- **Nobody questioned the split.**
  - No message, Claude's or Codex's, says a function reads well as it is or that splitting might not help.
  - None says the limit is arbitrary, and none mentions leaving it for review.
  - A search of every message for review, readability, "as is", "fine", "worth", "top to bottom" and "end to end" finds only "I left `escapeReplacement` as it is because it wasn't flagged." (a-claude-2) and two Claude runs saying they would "review" their own code by reading it.
- **Both agents knew the behaviour to keep. They differed in how much they said.**
  - **Claude's final messages** list what moved where and why behaviour holds, several paragraphs each.
  - **Codex's** are two sentences ("Fixed by extracting two helpers. `revalidateTags` is now 37 lines; both helpers are under 50."). Its progress messages carry the reasoning: "The function has two separable pieces: grouping tags and resolving expiration settings. I’ll extract both, preserving the matching logic and cache-handler call order." (b-codex-1)
- **The trap's mechanism.** Claude named it in 8 runs: A's first-match `replace` or the global `__BASE__` call (2), B's throw timing (4) and C's skip (2). Codex named it in 2 (C).
- **The limit as the goal.** The messages talk in line counts: "now 41 lines, down from 72"; "Functions are now 49 and 46 lines." Two runs reasoned about the counter itself:
  - "I put the helpers at the top level on purpose, because the rule also counts the lines of any function nested inside another." (c-claude-2)
  - c-claude-2 then cut six lines from a 55-line function by reshaping two calls.
- **Verification.**
  - **Claude Code** tried shell commands in 11 of 12 runs. It was refused 48 of 62: every attempt to run Oxlint, `tsc` or `npx`, and every listing outside the run dir. The 14 that ran were `ls`, `cat` and `which` in the run dir. Its messages say so: "I couldn't re-run the linter or type checker because the folder has no `node_modules`, so I checked the complexity count by hand."
  - **Codex** linted in all 12 runs with the main checkout's `node_modules/.bin/oxlint` and Ultracite's presets under `packages/cli/config/`, type-checked in most with the checkout's TypeScript, and ran its own before/after comparisons in all 12: "34,056 behavior comparisons" (c-codex-1), "48,039 behavior comparisons" (c-codex-2).
- **Tests and upstream.** Two Codex runs globbed the run dir for `*test*` files and found none. No run looked for Vite's, Next.js's or VS Code's tests or history, and none mentioned a later version.

## 7. Sessions: tools, commands, exposure, locks

- **Tools.**
  - Claude Code used Read, Edit, Bash, Glob and Grep: 7–40 tool calls a run, 6–24 model calls.
  - Codex used `exec`, through which it ran shell commands, `apply_patch`, Node and Python scripts: 11–30 tool calls, 12–32 model calls. It didn't use its web tool.
- **What Codex looked at outside the run dir:**
  - `AGENTS.md` in every directory from `/` down, in every run. It found none.
  - Listings of the run root and its parents, which show the topic's other runs and the other topics as `d---------`.
  - The main checkout, which its user-level memory names: `node_modules/.bin/oxlint`, TypeScript, `package.json`, `oxlint.config.ts`, the Oxlint core preset. In c-codex-1, an `rg -n 'max-lines-per-function' ~/GitHub/ultracite/packages` matched Ultracite's presets and `packages/cli/CHANGELOG.md`. These are Ultracite's own presets and changelog, the ones a user's `node_modules` would hold.
  - `~/.npm/_npx` and `~/.bun/install/cache`, for linter and TypeScript binaries.
- **Exposure.** Every tool input in every log was checked against `EXPOSURE_PATTERNS`, and every call outside the run dir was read by hand.
  - **No tool call read a locked path,** the corpus's examples, results, calibration or scripts, a clone or history clone, another run's files, the harness, the scratchpad, the bibliography or a post draft.
  - **8 of 12 Codex runs had a probe refused by a lock.**
    - Five `rg` searches over the main checkout were denied its `research/agent-experiment/plans`.
    - a-codex-3 tried to list `$TMPDIR/ultracite-research-length-limits` (the oracle's inputs): "EACCES: permission denied".
    - a-codex-4's `rg` over the experiment's temp root was denied the other topics and runs.
    - c-codex-4's listing was denied the run root's `.measure`.
    - c-codex-3's `rg --files --hidden /private/tmp …`, looking for `oxlint` binaries, was denied the orchestrating session's scratchpad. Its output listed file names from other projects' scratch folders; it read none of them.
  - **Codex's memory.** a-codex-3 searched its own memory file for "length-limits|clientInjections|max-lines-per-function" and found nothing.
  - **Installed copies of the three projects.** The main checkout's Bun store and `~/.npm/_npx` hold Vite 8, whose `createClientConfigValueReplacer` is a later version of A. The Bun cache holds Next.js 16.x builds with `revalidation-utils.js`, and an npx cache's `yaml-language-server` has a copy of VS Code's indentation guesser. No tool input names any of them.
  - **Training data:** no run mentioned the projects' history, PRs or tests.
- **Locks.** While an agent ran, 65–111 paths were locked (median 89; more as runs accumulated) and restored after each attempt. Each batch's snapshot was checked afterwards: 60, 65, 77, 89 and 101 paths, all restored. They were:
  - this harness's own folders, earlier attempts' staging, and every other run;
  - the corpus's length-limits examples, results and calibration, every `length-*` corpus script, and the whole corpus `out/` and `repos/`, history clones included;
  - `research/bibliography/length-limits.md` and the bibliography README;
  - `plans/`, `lint-configs/`, the system temp directory's `ultracite-research-*` folders (the oracle's inputs among them) and the other topics' run roots;
  - through `AGENT_EXPERIMENT_EXTRA_LOCKS`, 13 paths: the orchestrating session's scratchpad (the briefs, the corpus work's copies and notes, the literature notes, this experiment's scripts and logs), the batch-log folder, the main checkout's `research/agent-experiment/plans`, and the corpus `repos/` and `out/` of the five other worktrees that have them.

  Not locked: `node_modules`, and the session transcripts under `~/.claude/projects` (the `orchestratorScratch` and `sessionLogs` patterns check them; no tool input named them).
- **Codex's memory.** `MEMORY.md`, `memory_summary.md` and `raw_memories.md` were rewritten by Codex's consolidation during the pilot, the third batch and the fourth. After every batch, no memory file mentioned the experiment, the subjects or the rule (checked by `grep`).
- **Project instructions:** none loaded in any run. There's no `AGENTS.md` or `CLAUDE.md` in the run dir or above it.

## 8. The pilot

Two runs on C, `c-claude-pilot` and `c-codex-pilot`, are kept in `superseded-runs/` and not aggregated. They used the final setup and were re-measured with the final code.

- **Claude timed out after 300 s** with the file unchanged. After one refused `ls`, a single model call ran until the kill. Ultracite printed "Fixed 0 of 2 issues with Claude Code." with "Claude Code timed out after 5 minutes."
- **Codex** extracted six helpers, including a stats object mutated by `recordIndentationDiff`. Its second attempt converted the six new declarations for `func-style`, and the guess stayed the same. Its own check: "All 30,280 behavior comparisons matched the original."

The pilot showed the harness working end to end. Its Claude timeout recurred in two of the four final Claude runs on C.

## 9. Issues in Ultracite (not fixed)

1. **The handoff points one way: split.**
   - The only guidance an agent gets is Oxlint's help, "Consider splitting it into smaller functions.", and the prompt says "Follow the rule's help text".
   - For A, a function the corpus work found reads top to bottom, the honest minimal change is none, and "Left for review" allows it (corpus REPORT §7.5). No agent took that route. Every one split, and Ultracite reported "Fixed 1 of 1" for all eight.
2. **A shortened function counts as fixed.** Oxlint's message carries the line count ("too many lines (55)"), and `diff.ts` matches by rule and message.
   - So shortening an over-long function to a still over-long one partitions as "cleared" plus "introduced".
   - The retry prompt then says "The previous edit resolved the issues it was given".
   - Had the agent stopped there, the tally would have said "Fixed 2 of 2 issues" with "1 new issue reported after the fix". The same holds for `max-statements`, `max-params` and `complexity`, whose messages carry counts.
3. **Ultracite's 5-minute timeout is short for a large refactor, and a timeout ends the run.**
   - Three of five Claude runs on C (the pilot included) were killed at 300 s: one with no edit, one half done, one finished but unchecked with 17 new diagnostics.
   - Ultracite doesn't retry after a timeout. So the user gets a half-done refactor, or one with new issues, and exit 1.
   - Here the half-done file still behaved the same; on other code a split interrupted half-way might not.
4. **Collateral rules dominate the retries.** In a project with these subjects, every helper an agent writes as a function declaration trips core's `func-style`. Code moved out of a function takes its complexity score with it, under a new name. Here that cost a second attempt in 21 of 24 runs. In a real project these rules would be in the first handoff, with 29 to 51 issues in all (§1.4).
5. **The fix for one limit trips the others.** Every A and B split pushed the file past `max-lines`' 300, and more functions exceeded `max-statements`' 10. C's splits added 19 helpers with 4 or 5 parameters, over `max-params`' 3. A user with those limits on too would be handed new reports, and the next agent would split again.
6. **Explanations are discarded unless an issue is left for review** (also react-effects §9.6). Claude's paragraphs on why behaviour holds, and the two timeouts' last messages, aren't shown to the user.
7. **Formatting decides the count.** Oxfmt makes C's `guessIndentation` 134 lines, Prettier 137, Biome's count 98 from the same code (corpus REPORT §4.4–4.5). The function the agent is asked to shorten depends on the formatter the project uses.

Also noted, not Ultracite's code:

- Claude Code's `-p` permissions refused every lint, check and download command, so no Claude run could verify its edit. Codex verified every one of its own.
- Codex found a linter and Ultracite's presets through its user-level memory of the checkout and through global caches, as in earlier topics.
- **A harness detail.** Under Bun, a script that `console.log`s a large JSON string to a pipe and exits can be cut at 64 KiB. The real-adapter check in this topic writes its result to a file instead. The react-effects topic's copy of that script still uses stdout; its outputs are small, and its runs reproduce (§12).

## 10. Harness changes

- **`scripts/topics/length-limits.cjs`** (new):
  - subjects and preparation: running `ultracite init` for each linter and adding the user's limit, stripping, the comment check, normalising, checks;
  - the collect and verify hooks with the handoff filter;
  - the five lint views;
  - the edit reading, with scope analysis for closures and shared state;
  - measure; the self-test with the mutants and the mirror check;
  - the deterministic paths with the real adapters;
  - aggregate and tables.

  It imports the corpus's `length-oracle.cjs` and `length-lib.cjs` unchanged, and reads `length-examples.cjs`'s variants by compiling its source without the final `main()` call. No corpus file changes, and `examples.json` regenerates as it is.
- **`harness-tests/length-limits/mutants.json`** (new): the 40 mutants and their expected readings.
- **`.gitignore`:** comments name this topic and pilots. The existing per-attempt patterns cover its session logs, stdout and stderr in `runs/` and `superseded-runs/`.
- **No other shared script changed.**
- **Earlier topics reproduce.** Each earlier topic's self-test was run, every run re-measured, and every topic re-aggregated from committed files, twice: before any change here, and after all of them. Results folders were restored afterwards. Before and after: see §12.

## 11. Caveats

- **Sample:** 4 runs per subject and agent. Every cell is uniform in the oracle's verdict (24 of 24 same), so behaviour isn't noisy. Method differences (Claude's `{}` fallback against Codex's second helper; how C's loop was cut) are 4-run observations.
- **The handoff is filtered** (§1.4), and here that shaped the runs. 20 of 21 retries were for rules a real project would have handed over at the start, and A's second helpers came from a complexity report that a real project would also have handed over at the start. With 29 to 51 issues in front of it, an agent might split differently, or spend its five minutes elsewhere.
- **The reader judgement is two Claude models on 24 files** (κ 0.46). They agree completely on B and differ on A and C, mostly by one step. Rater 1 ran the experiment and had seen the runs, and rater 2 shares its model family. No human rated readability. "Easier to follow" is a judgement about one reader's effort, not a measured comprehension task.
- **The oracle checks behaviour through each file's public API** on generated and real inputs (corpus REPORT §10). It doesn't measure performance: c-claude-2 noted that its counting helper "creates a small object on each call". Nor does it measure readability.
- **The subjects are famous code**, and later versions of A's file are installed on this machine. No run read them or showed it knew the history.
- **The run dir isn't a full project.** It has no `node_modules` and no git, and its path names the experiment and the topic (`…/ultracite-agent-experiment/length-limits/<run>/`), as in every topic. So Claude couldn't lint at all, and Codex linted with its own configuration of the main checkout's Oxlint.
- **Claude's reasoning isn't logged.** Its thinking blocks are empty, so "what it understood" for Claude comes from its messages. For Codex it comes from progress messages, since its reasoning summaries are empty too.
- **Timeouts depend on effort.** Both agents ran at xhigh effort (user-level settings). At a lower effort Claude might fit C into 300 s; at a higher one the runs might time out more.
- **The edit reading is heuristic.** It counts helpers, call sites and parameters, uses scope analysis for closures and mutation, counts blank lines and comments over the file, and compares exports sorted. The hand classification is the reference, and it agrees with the automatic reading in all 24.
- **User-level configuration applied:** Codex's memories and plugins, and Claude Code's plugins and settings. The user-level instruction files are empty.

## 12. Reproduce

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=length-limits
node scripts/prepare-subjects.cjs        # subjects/length-limits/ (runs ultracite init for each linter, adds the user's limit; stripFields, TEXT_EDITS, the comment check, normalised, checked; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (43) and the mirror against the CLI (43) -> oracle-self-test.json (~3 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths and the mutant matrix (~6 min)
node scripts/report-tables.cjs > results/length-limits/tables.md
```

- **Re-measuring without the session logs:** `measure.cjs <run>` re-measures a run from its committed files in about a minute, carrying the session-derived fields over from `measure.json`. All 24 and both pilots were re-measured with the final code.
- **The oracle's C inputs include 200 files from the corpus clones** (`corpus/repos/`), read as text. They must be cloned (`corpus/scripts/clone.sh`, `a11y-clone.sh`) to re-measure.
- **This report's runs** set `AGENT_EXPERIMENT_EXTRA_LOCKS` from a wrapper that listed the scratchpad, the batch-log folder, the main checkout's plans and the other worktrees' clones and outputs, and checked every lock's mode before and after each batch.
- **The hand classification** is an input (`classifications.json`). The blind packet and the raters' raw labels were scratch files; both raters' labels and reasons are in `classifications.json`.
- **Earlier topics.** Before and after this topic's changes, every self-test passes and every topic's re-aggregated outputs match exactly, for all nine.
  - Against the committed files they show the known drift, plus new drift from toolchain commits made after the react-effects runs:
    - 1fa337e6 Oxlint 1.89;
    - daf7b0ff Biome 2.6.3;
    - 72890bec the ESLint plugins and Unicorn 79.
  - The new drift is in tool versions, rule counts, messages and line numbers. No run's response, outcome or oracle verdict changes.

  | Topic | Against the committed files (apart from `generatedAt`) |
  | --- | --- |
  | cognitive-complexity | tool versions in `results.json` only |
  | floating-promises | the known 947ca03e drift; tool versions |
  | security-rules | the known preset drift; new rules from Unicorn 79 (`no-top-level-side-effects`) and Biome 2.6 (`useUnicodeRegex`, `useNamedCaptureGroup`) in the per-run counts and hits |
  | dead-code | the known `sonarjs/void-use` drift; preset totals moved by the same new rules |
  | import-cycles | new: Unicorn 79's `no-top-level-side-effects` and `no-barrel-files` at line 1; Biome's shorter "Avoid barrel files." message, which re-partitions one step's re-lint (icb-codex-2) from "still" to "cleared and introduced" |
  | accessibility | `hasSessionLog` (its gitignored logs aren't in this worktree) |
  | todo-comments | `hasSessionLog`; the known 947ca03e drift; new Unicorn 79 and Biome 2.6 rules in the per-run counts and the mirror check's counts |
  | sort-keys | `hasSessionLog`; new Unicorn 79, Biome 2.6 and Oxlint 1.89 rules in the per-run counts, the mirror check and the deterministic paths |
  | react-effects | `hasSessionLog`; new Biome 2.6 and Unicorn 79 rules in the per-run counts and the deterministic paths |

## 13. Files

| Path (under `research/agent-experiment/`) | Contents |
| --- | --- |
| `scripts/topics/length-limits.cjs` | the topic |
| `subjects/length-limits/` | the three subjects; `run-files/` (init's files with the user's limit, as the fix pass leaves them, and `tsconfig.json`); `init/` (what `ultracite init` writes for Oxlint, Biome and ESLint); `user/` (the same with each linter's limit on); `subjects.json`. Oxlint's two configs and Biome's are stored with a `.txt` suffix. |
| `harness-tests/length-limits/mutants.json` | 40 mutants with their expected readings |
| `results/length-limits/runs/` | 24 runs: meta, handoff, before/after, per-attempt artifacts, measure.json |
| `results/length-limits/superseded-runs/` | the pilot (not aggregated) |
| `results/length-limits/results.json`, `tables.md`, `classifications.json`, `oracle-self-test.json` | aggregate, tables, hand classification (both raters), self-test and mirror check |
| `../corpus/scripts/length-oracle.cjs`, `length-lib.cjs` | the oracle and its measure, shared with the corpus |
