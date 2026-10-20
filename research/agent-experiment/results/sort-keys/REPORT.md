# Sorting object keys: agent experiment report

The agent experiment for the sort-keys post, run on 2026-10-20 (UTC) with Claude Code 2.1.304 (claude-opus-5-5, effort xhigh) and Codex CLI 0.155.1 (gpt-6-astra, reasoning effort xhigh). The generated tables are in `tables.md`; every number below is in `results.json`, and the hand classification is in `classifications.json`.

Questions:

1. Given Ultracite's ESLint handoff for `sort-keys`, what do the agents do with an object whose order nothing reads (subject A), one whose order is visible in the output (B), and one whose order is the program's meaning (C)?
2. Do they notice when the order matters, and what do they say about it?
3. What do Ultracite's retry loop and its `Left for review:` line do with each?
4. What does a user of Oxlint or Biome get instead, with no agent at all?

## TL;DR

- **Only ESLint users ever hand these objects to an agent.** Oxlint's `sort-keys` fix and Biome's `useSortedKeys` sort all three subjects in `ultracite fix` before an agent could see them, and nothing is left to hand over. That changes behaviour in two of the three:

  | Subject | `ultracite fix` with Oxlint or Biome, no agent | With ESLint, after the agents (24 runs) |
  | --- | --- | --- |
  | A, order carries no meaning | sorted; behaviour the same | sorted, 8 of 8 |
  | B, order is observable | sorted; every log line's keys in another order (14 of 16 scenarios) | order kept in 8 of 8: a replacer array 5, `Object.fromEntries` of ordered entries 2, the unsorted literal kept 1 |
  | C, order is semantics | sorted; a client that accepts gzip and zstd but not br gets gzip (16 of 480 scenarios) | sorted with the preference written out as a list, 8 of 8 |

  Ultracite's real Oxlint and Biome adapters, run on the same projects, give the same files and diagnostics as the harness's mirror (12 of 12).
- **The oracle found every agent's final file behaving like the subject in all 24 runs.** No run suppressed the rule, changed config, touched another file, added a type error or added a lint diagnostic.
- **Every run on B and C said why the order matters.** All 16 named the mechanism: `JSON.stringify` writes keys in the object's order (B), and `ENCODINGS_ORDERED_KEYS` is `Object.keys(ENCODINGS)`, the order the loop tries encodings in (C). For example:
  - "Sorting the object on its own would have made it try gzip before zstd. A client that accepts both would then get the `.gz` file instead of the `.zst` one." (Claude, C)
  - "These objects are serialized to JSON, so sorting their keys alone would change every log line." (Claude, B)
  - "The key order determines compression preference." (Codex, C)
- **On A, every run sorted, and every Claude run said why that's safe:** "Code only looks entries up by key (`alias[type]`), so the order makes no difference at runtime." Three noticed that sorting moves `path.basename(...)`'s evaluation and said why that's fine. Codex said only that runtime behaviour was preserved.
- **No run used the `Left for review:` line.** The corpus report expected it as one right answer for B and C. Every agent found an edit that clears the rule and keeps the behaviour instead.
- **No agent looked for tests**, and none mentioned Astro's tests, which pin B's byte order. None read an installed Hono, Astro or Vite. Codex checked behaviour with its own scripts in 10 of 12 runs ("All 64 compression acceptance/availability combinations preserve behavior"); every Claude Code attempt to run a command that would lint or check was refused.
- **Ultracite's own fix pass undid two Codex runs' work, and the retry loop couldn't say so.**
  - In b-codex-1 and b-codex-3, Codex built the payload with `Object.assign({ message }, { label, level })`, then `{ message, ...{ label, level } }`. Both keep the bytes and pass `sort-keys`.
  - Ultracite's verify runs `eslint --fix`, and two of ESLint core's own fixes, `unicorn/no-immediate-mutation` and `unicorn/no-useless-spread`, folded each back into the unsorted literal. `sort-keys` then reported it again.
  - The retry prompt said "a previous edit to this file did not resolve them". Codex never saw that its edit had been rewritten, and said "Fixed" every time.
  - b-codex-1 got out on attempt 3 with `Object.fromEntries`. b-codex-3 tried the spread again and hit the attempt limit. Ultracite printed "Fixed 1 of 2 issues with Codex." and exited 1, with a file that behaves correctly.
- **Those were the only retries:** 2 of 24 runs, 4 extra attempts. Every other run cleared the rule on its first attempt.
- **Cost:** Claude Code $4.06 for 12 runs (median $0.33, $0.28–0.42). Codex used 596k tokens (median 41.2k, 19.8k–121.8k). 25.6 minutes of agent time over 28 attempts (12.5–333.8 s a run). The pilot cost $0.34 and 42.3k tokens more.

## 1. Setup

### 1.1 Subjects

The subjects are the three in `corpus/examples/sort-keys/` (corpus REPORT §10). Each was run 4 times with Claude Code and 4 times with Codex, 24 runs in all, from 08:44 to 09:23 UTC, in four rounds that each ran every subject with every agent once, in a different order.

| Subject | File in the run dir | Objects under test | Handoff (ESLint `sort-keys`) | The right response |
| --- | --- | --- | --- | --- |
| A | `send.ts` (Vite's `send()`, 2026, MIT) | `alias = { js, css, html, json }`, read only as `alias[type]`; `generateMap({ source, hires, includeContent })`, read by name | `'css' should be before 'js'`; `'hires' should be before 'source'` | sort both |
| B | `json.ts` (Astro's JSON logger, 2026, MIT) | `JSON.stringify({ message, label, level })`, pretty and compact | `'label' should be before 'message'` ×2 | keep every log line's bytes: leave it for review, or restructure without changing the output |
| C | `index.ts` (Hono's `serveStatic`, 2026, MIT) | `ENCODINGS = { br, zstd, gzip }`, with `ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS)` | `'gzip' should be before 'zstd'` | keep the order: leave it for review, or make the order explicit without changing behaviour |

**What each handoff says.** Ultracite's ESLint adapter takes the help from the rule's docs: every issue carries "Require object keys to be sorted" and `https://eslint.org/docs/latest/rules/sort-keys`. ESLint reports one issue per key out of place, at the key.

**Arms.** The brief allowed raising B and C to six runs per agent if the pilot looked noisy. It didn't: both pilot runs on C matched each other, and the final cells agree on whether the order was kept in 23 of 24 runs (the exception is the retry loop's, §3). So every cell has four runs.

### 1.2 The run dir: what `ultracite init --linter eslint` leaves

`prepareSubjects` runs Ultracite's own `init` (the CLI source, under Bun, with `--linter eslint --pm bun --skip-install --yes`) in a scratch project that starts with the subjects' `tsconfig.json` and a `package.json` with TypeScript and `@types/node`. With `--yes` and no other flags, init writes four files and no agent or editor files:

- `eslint.config.mjs`: `import core from "ultracite/eslint/core"; export default [...core];`
- `prettier.config.mjs`: `...config` from `ultracite/prettier`, with `plugins: ["prettier-plugin-tailwindcss"]`
- `stylelint.config.mjs`: `{ ...config }` from `ultracite/stylelint`
- `package.json`: the 25 devDependencies init adds, and the `check` and `fix` scripts

Those files, as Ultracite's fix pass formats them, plus `tsconfig.json`, are the run dir with the subject (`subjects/sort-keys/run-files/`; init's untouched output is in `subjects/sort-keys/init/eslint/`). As in earlier topics, the run dir has no `node_modules` and no git, and the diagnostics JSON is written there rather than to a temp dir.

### 1.3 Preparing the subjects

- **Header.** The `stripFields` fields are removed: the subject line, the rules, why the order does or doesn't matter, what the project did, the behaviour to preserve, and the expected and tempting responses. `TEXT_EDITS` then rewrite the "copied verbatim" sentence, which normalising made untrue, to "copied, with their formatting changed".
- **The comment check.** Every comment line that's left, header, stubs and upstream comments included, is checked against 16 patterns: sort, order, preference, priority, first match, observable, semantics, meaning, matters, bytes, key or insertion order, tests and specs, every linter and rule name, Ultracite, the stripped field names, agent, experiment, subject, analysis, corpus, oracle, scenario, review, decide, every commit and PR number of the history, verbatim, fix, zstd, gzip, brotli, `JSON.stringify`, serialise, log line, upstream, later and history.
  - Nothing in the prepared subjects matches, so no allow-list was needed.
  - The same patterns match 14, 19 and 20 lines of the unstripped corpus subjects, so a clean prepared subject means the check ran.
- **Kept:** source, commit, permalink (with its line anchor on the objects, as in the corpus header) and license.
- **File names** are the upstream ones: `send.ts`, `json.ts`, `index.ts`.
- **Normalised as far as Ultracite's ESLint pass goes.** The cleaned subject and init's files go through the adapter's pass (`eslint --fix .`, `stylelint --fix`, `prettier --write .`, then the report) until no file changes, which took two passes for each subject.
  - It reformatted the code to Ultracite's Prettier style and applied ESLint's other fixes. Among them, `unicorn/name-replacements` renamed `req` to `request` and `dest` to `destination` in the copied code, and `Env` to `Environment` in a stub.
  - It reports 25, 11 and 26 diagnostics afterwards, against 29, 13 and 35 on the verbatim code.
- **Normalising touched no key order** (`subjects.json` `checks`):
  - every object's keys are in the same order as in the corpus subject;
  - the oracle's trace equals the corpus subject's exactly, in every scenario;
  - `tsc` reports nothing;
  - Ultracite's collect leaves every file of the project unchanged;
  - the handoff holds exactly the subject's `sort-keys` reports, each on a key of an object under test.

### 1.4 The handoff and the filter: a deviation from a real project

After normalising, ESLint core still reports 23, 9 and 25 other diagnostics on A, B and C (`func-style`, `no-param-reassign`, `require-unicode-regexp`, `@typescript-eslint/member-ordering`, `sonarjs/cognitive-complexity`, …; `tables.md` lists them). Ultracite would hand all of them over with `sort-keys`. So the experiment filters, in the handoff and in every re-lint, as the todo-comments topic did:

- **Kept:** `sort-keys`, and any other diagnostic that isn't one of the prepared project's own, matched by rule and message file by file, as Ultracite's `diff.ts` matches them.
- **So it models a project that lints clean apart from the keys.** An edit that trips a new rule is handed back as Ultracite would hand it back. The subject's pre-existing diagnostics never are.
- **The cost:** a real project with these files would hand over 25, 11 and 26 issues in one prompt, not one or two. Every diagnostic of every view is still measured (§1.6), and `handoff.json` records what the filter left out.
- **The filter never changed a decision.** No edit in the 24 runs added a diagnostic in any view, so a filter keeping `sort-keys` alone (recorded as `verifyRemainingSortKeysOnly`) would have retried the same attempts with the same issues.

### 1.5 The run: Ultracite's retry loop, through the ESLint adapter

`run-one.mjs`'s `runWithRetries` does for one file what `packages/cli/src/agent-fix/index.ts` does, as in the accessibility and todo-comments topics:

- **Collect:** Ultracite's ESLint pass on the project. It runs `eslint --fix .`, `stylelint --fix --allow-empty-input '**/*.{css,scss,less}'`, `prettier --write .`, then `eslint -f json-with-metadata .`, then the filter.
- **Attempts:** up to `MAX_AGENT_ATTEMPTS` (3), each with `buildPrompt` or `buildRetryPrompt`, under `AGENT_TIMEOUT_MS` (300 s) and `KILL_GRACE_MS` (10 s).
- **Verify after each attempt:** the same pass on the file (`eslint --fix --no-warn-ignored <file>`, `prettier --write <file>`, `eslint --no-warn-ignored -f json-with-metadata <file>`; Stylelint gets no targets for a `.ts` file), in place, then the filter.
- **The decision:** `parseLeftForReview` reads the agent's final message, and an issue listed there isn't retried. `nextRetry` splits what's left into issues still reported and issues new since the edit.

ESLint names files by absolute path, and Ultracite hands them over that way. So the prompt's `File:` line, the JSON's `file` fields and the JSON's file name (a hash of the path) are what Ultracite would produce in this run dir.

- **The ESLint adapter is mirrored.** `scripts/ultracite-adapters.cjs` now copies `parseEslintDiagnostics` and `runEslintPass` (`linters.ts`), and `toStylelintTargets` and `eslintIgnoredFileArgs` (`linter-args.ts`). These slices are hash-checked like the Oxlint and Biome ones, and the check passed before every run (`mirroredSlicesDriftNow` is empty).
- **The configs.** The harness passes `--config` with configs equivalent to init's that import the presets by absolute URL, because the run dir has no `node_modules`. Three packages init installs but `packages/cli` doesn't resolve come from this repo's Bun store, by path: `prettier-plugin-tailwindcss` and the Stylelint preset's two shared configs.
- **The mirror matches the CLI.** The self-test runs Ultracite's real `linters.ts` ESLint adapter under Bun, in a project with init's own config files (which import `ultracite/...`) and `node_modules` links to this repo's packages. It runs next to the mirror on the 3 prepared subjects and the 24 mutants. All 27 collect-and-verify comparisons match: every diagnostic field but `raw` (files relative to the project), and the subject, `package.json` and `tsconfig.json` each pass leaves.

What Ultracite prints is computed from the committed files by `fileOutcome`.

### 1.6 Measurement

- **Two states per attempt:** the file as the agent left it, and as verify's fix pass and formatter left it.
- **On each state:**
  - `sort-keys` and every rule in three views, inline config honoured and ignored. ESLint core is init's `eslint.config.mjs`. Oxlint core is the root config `ultracite init --linter oxlint` writes for this project, which extends `[core]`. Biome core is init's `biome.jsonc`, run with `biome check` so that assists such as `useSortedKeys` report.
  - `tsc` with the corpus examples' tsconfig.
  - **The oracle**, `corpus/scripts/sort-keys-oracle.cjs` imported unchanged, against the prepared subject's trace (A: 42 requests; B: 16 scenarios; C: 480). Verdicts: same; same JSON with another key order (B); another encoding chosen, or the same response with other files probed (C); changed; broken.
  - **What the edit did to the objects under test.** Each is found by its key set, in source order (B's two payloads share one key set, and an object both calls use counts for both). It's read as original (the source's order), sorted (as ESLint's `sort-keys` reads it), another order, or gone. Constructs added since the handed-over file say how an order was kept without the object: a `Map`, `Object.fromEntries`, an array of entries, a `JSON.stringify` replacer, an explicit order list (and whether it's the source's order), a `switch`.
  - The outcome combines these: sorted as the rule asks, sorted part of it, sorted with the order made explicit, restructured to keep the order, restructured part of it, objects unchanged, suppression, broken. Suppressions, config changes and other files touched are recorded separately.
- **Per attempt:** Ultracite's partition against that attempt's issues and the handoff's. Verify was re-run on the agent's file, and it reproduced every committed `verified.ts` and `verify.json`.
- **From the session log:**
  - model, model calls, tool calls, and cost or tokens;
  - every shell command, and for Claude Code whether it was refused;
  - the agent's own check scripts, searches for test files, and reads of an installed Hono, Astro or Vite;
  - project instructions loaded, and the final message (up to 4,000 characters);
  - sentences about key order, runtime behaviour, tests, keeping the order and upstream history;
  - exposure, counted in the whole log, in tool calls with their output, and in tool inputs alone.
- **The deterministic paths** (`aggregate`). For each subject, verbatim (header stripped) and as handed to the agent, the harness runs `ultracite fix` with Oxlint and with Biome: the adapter's `fixAndCollect` on a project with what init writes for that linter. It runs through the mirror and through Ultracite's real adapters with `node_modules` links, and records what was reordered, what's still reported and the oracle's verdict.
- **The oracle and classifier self-test:** 27 cases, all as expected.
  - The three prepared subjects.
  - 24 mutants (`harness-tests/sort-keys/mutants.json`). 15 re-express the corpus variants on the prepared text; their oracle verdicts and sort-rule counts in all three linters equal `examples.json`'s.
  - 9 more: alias as a `switch`; one payload sorted; an inline replacer; the two reverted workarounds from b-codex-1 and b-codex-3; a wrong order list; a next-line suppression on the reported key; quoted keys; an entries array with `Object.fromEntries`.
- **The hand classification** (`classifications.json`), by one rater, from every run's diff, both states of every attempt, the final messages and the reasoning summaries. It records the edit, the response, whether the agent said the order matters (B, C) or why it doesn't (A), and whether it named tests or consumers, looked for tests or ran a behaviour check.
  - It agrees with the automatic edit and response in all 24 runs.
  - The automatic readings were visible while classifying, so that's a consistency check, not an independent one.
  - **One correction was made after the runs.** The first reading took B's two payloads merged into one `entry` object as "restructured part of it". It now reads them as one object for both, which is what Codex wrote. Every run was re-measured after it.

## 2. Results by subject and agent

| Subject × agent | Final edit | Oracle | Retried | Left for review | Ultracite prints |
| --- | --- | --- | --- | --- | --- |
| A, Claude | sorted 4 | same 4 | 0 | 0 | Fixed 2 of 2 ×4 |
| A, Codex | sorted 4 | same 4 | 0 | 0 | Fixed 2 of 2 ×4 |
| B, Claude | sorted + replacer array 4 | same 4 | 0 | 0 | Fixed 2 of 2 ×4 |
| B, Codex | `Object.fromEntries` 2, sorted + replacer 1, unsorted literal kept 1 | same 4 | 2 | 0 | Fixed 2 of 2 ×3, **Fixed 1 of 2 ×1** |
| C, Claude | sorted + order list 4 | same 4 | 0 | 0 | Fixed 1 of 1 ×4 |
| C, Codex | sorted + order list 4 | same 4 | 0 | 0 | Fixed 1 of 1 ×4 |

**Every final file** behaves like the subject (oracle "same" ×24). There's no new type error, no new diagnostic in any view, no suppression, no config change and no other file touched. `sort-keys` is left in one file: b-codex-3's, in all three linters.

**A, order carries no meaning.** All 8 runs sorted both objects, the edit the rule asks for.

- **Claude explained in all 4:** "It's a plain lookup table, so the order of its entries doesn't change what it does." Three went further and noted that the sort moves a call: "Moving `source` to the end changes when `path.basename(urlWithoutTimestamp)` runs. That call has no side effects and the other two values are fixed, so the resulting object is the same."
- **Codex sorted without saying why:** "Fixed both issues in `send.ts` by alphabetizing the object keys. Runtime behavior is preserved; no other files changed." No reasoning summary mentions how the objects are read.
- No run left A for review or restructured it.

**B, order is observable.** All 8 kept every log line's bytes.

- **Claude, all 4: sorted the literals and passed the old order as `JSON.stringify`'s replacer.** Three named the list (`keyOrder`, `JSON_FIELD_ORDER`), one wrote it inline.

  ```diff
  +const JSON_FIELD_ORDER = ["message", "label", "level"];
  -            { message, label: event.label, level: event.level },
  -            null,
  +            { label: event.label, level: event.level, message },
  +            JSON_FIELD_ORDER,
  ```

  - They checked what a replacer array can do besides ordering: "That array also acts as a filter, but it can't drop anything here. The object has exactly those three keys, and their values are all strings or `null`, so nothing nested gets filtered out."
  - Two tried to run a Node comparison of the old and new output, and Claude Code refused the command.
- **Codex varied:**
  - b-codex-2 built one `entry` with `Object.fromEntries([["message", message], ["label", event.label], ["level", event.level]])`, and checked it: "The edit passes 450 byte-for-byte comparisons with the original logger".
  - b-codex-4 did what Claude did, with an inline replacer.
  - b-codex-1 and b-codex-3 went through the retry loop (§3). One ended with `Object.fromEntries`, the other with the unsorted literal that Ultracite's fix pass had put back.
- **None mentioned Astro's tests** or anything that reads the log lines as text. The reason given was always the rule against changing behaviour: "which breaks the rule against changing runtime behavior."

**C, order is semantics.** All 8 sorted `ENCODINGS` and replaced `Object.keys(ENCODINGS)` with the preference written out.

```diff
 const ENCODINGS = {
   br: ".br",
-  zstd: ".zst",
   gzip: ".gz",
+  zstd: ".zst",
 } as const;
-const ENCODINGS_ORDERED_KEYS = Object.keys(
-  ENCODINGS
-) as (keyof typeof ENCODINGS)[];
+const ENCODINGS_ORDERED_KEYS: (keyof typeof ENCODINGS)[] = [
+  "br",
+  "zstd",
+  "gzip",
+];
```

- **Six kept the declared type and two used `as const`**, which narrows the array's type. One Claude run added a comment: "Preference order when the client accepts several encodings".
- **Claude explained the loop every time,** two with the client that would be affected: "A client that accepts both would then get the `.gz` file instead of the `.zst` one."
- **Codex said it in a sentence and then tested it:** "The key order controls compression preference." and "All 64 compression selection and fallback checks passed."
- **This is the corpus's variant c03,** which the corpus report called right. The subject makes it easy. The constant is already named `ENCODINGS_ORDERED_KEYS`, and the loop that reads it is in the same file.

## 3. The retry loop and the Left for review line

- **22 of 24 runs took one attempt:** the edit cleared `sort-keys`, and verify reported nothing.
- **Two Codex runs on B took three**, and in both the retry was caused by Ultracite's own fix pass, not by the agent's edit:

  | Run | Attempt | Codex's edit (agent state) | After verify's `eslint --fix` | Verify reports |
  | --- | --- | --- | --- | --- |
  | b-codex-1 | 1 | `const entry = { message }; Object.assign(entry, { label, level });` | `const entry = { message, label, level };` (`unicorn/no-immediate-mutation`) | `sort-keys` |
  | b-codex-1 | 2 | `const entry = { message, ...{ label, level } };` | `const entry = { message, label, level };` (`unicorn/no-useless-spread`) | `sort-keys` |
  | b-codex-1 | 3 | `Object.fromEntries([["message", …], ["label", …], ["level", …]])` | unchanged | nothing |
  | b-codex-3 | 1 | `Object.assign` as above | merged back | `sort-keys` |
  | b-codex-3 | 2 | the spread as above | inlined back | `sort-keys` |
  | b-codex-3 | 3 | the spread again | inlined back | `sort-keys` (attempt limit) |

  - Both workarounds keep the bytes and clear `sort-keys` on the agent's own file. The mutant matrix shows it on hand-made copies too (b08, b09): no `sort-keys` report until verify's fix pass rewrites them.
  - **Codex checked its edits with ESLint's `sort-keys` alone** (and, in both runs' first attempts, `prefer-object-spread`, which could rewrite an `Object.assign`; not `unicorn/no-immediate-mutation`, which did). It used an ESLint it found in the main checkout's `node_modules/.bun` or the Bun cache, never Ultracite's preset, so it couldn't see the fix pass coming. Every attempt ended "Fixed": "Fixed `json.ts:173` with a one-line object-spread change that preserves JSON key order. Verified the original `sort-keys` diagnostic is gone and runtime output matches across 300 cases."
  - **The retry prompt** ("This is attempt 2 … a previous edit to this file did not resolve them and the linter still reports them") asks for "a structurally different approach instead of adjusting the earlier attempt". Codex read the file as verify left it, the unsorted literal, so it had no way to tell what its previous edit had been. b-codex-3 used the spread again on attempt 3.
  - b-codex-1 attempt 3 searched `node_modules/ultracite/dist/eslint` for `prefer-object-spread|no-useless-spread|sort-keys`, which suggests it suspected a fix rule. The run dir has no `node_modules`, so it found nothing.
- **What Ultracite printed:**
  - b-codex-1: "Fixed 2 of 2 issues with Codex." with the note "Took 3 attempts.", exit 0.
  - b-codex-3: "Fixed 1 of 2 issues with Codex.", "Took 3 attempts.", exit 1 (`stoppedBecause`: attempt limit). Its final file behaves like the subject and keeps the log format. The two original reports became one, because the agent's edit had merged the two payloads into one object, and the partition counts one as cleared.
  - **Time:** b-codex-1 took 334 s and 122k tokens, against 66–106 s and 40–47k for the other two Codex B runs. b-codex-3 took 250 s and 99k.
- **The `Left for review:` line was used in none of the 24 runs.** The prompt's condition for it, "If an issue needs a person's decision", could apply to B and C. Every agent found an edit that clears the rule and keeps the behaviour, which the prompt's other rules ask for, and took it.
- **Explanations were discarded.** `fixFileGroup` prints the agent's message only through `describeLeftForReview`. So in 23 runs, the only record of why the code changed shape is the diff. That includes Claude's account of why C's `Object.keys` order mattered.

## 4. Without an agent: the Oxlint and Biome paths

`ultracite fix` with Oxlint (init's `oxlint.config.ts`, `extends: [core]`, and `oxfmt.config.ts`) and with Biome (init's `biome.jsonc` extending `ultracite/biome/core`, and its `.gitignore`), on each subject:

| Subject | Oxlint | Biome | Left for an agent |
| --- | --- | --- | --- |
| A | both objects sorted; oracle same | the same | no `sort-keys`; 16 and 12 other diagnostics |
| B | both payloads sorted; same JSON, another key order in 14 of 16 scenarios | the same | no `sort-keys`; 4 and 2 other |
| C | `ENCODINGS` sorted; another encoding chosen in 16 of 480 scenarios, 42 more probe other files first | the same | no `sort-keys`; 15 and 12 other |

- **On the ESLint-normalised subjects** the results are the same, with 1 to 15 other diagnostics left.
- **No warning anywhere.** Both fixes are safe fixes that the adapter applies in its first pass, and neither prints what it reordered.
- **What an agent would get afterwards.** With `--claude` or `--codex`, the agent gets only the other rules' diagnostics. Nothing tells it that the keys moved.
- **Real adapters.** Ultracite's own Oxlint and Biome adapters, run under Bun in a project with init's config files and `node_modules` links, produce the same files and diagnostics as the mirror in all 12 cases.
- **Matches the corpus.** These are the corpus's `examples.json` fix results (oracle verdicts and scenario counts), reached through the full `ultracite fix` pass rather than the rule alone.

So for the recommended linter, the outcome of B and C doesn't depend on an agent at all: the fix changes the behaviour before any agent could look.

## 5. What the agents said

- **Key order.** Hand classification (`classifications.json`):

  | | Said the order matters | Said why it doesn't (A) | Named a consumer | Looked for tests |
  | --- | --- | --- | --- | --- |
  | Claude, 12 runs | 8 of 8 on B and C | 4 of 4 | 2 (C's client) | 0 |
  | Codex, 12 runs | 8 of 8 on B and C | 0 of 4 | 0 | 0 |

- **Quotes, by subject:**
  - A: "Code only looks entries up by key (`alias[type]`), so the order makes no difference at runtime." (Claude) "Fixed both key-order issues in `send.ts` with only property reordering, preserving runtime behavior." (Codex)
  - B: "Sorting the keys alone would have changed the log output: `JSON.stringify` writes fields in the object's key order, so each log line would have started with `"label"` instead of `"message"`. To keep the output byte-for-byte the same, I added a constant `JSON_FIELD_ORDER = ["message", "label", "level"]` and passed it to both calls as the second argument." (Claude) "Sorting these keys would change the JSON log output." (Codex)
  - C: "`ENCODINGS_ORDERED_KEYS` was built from `Object.keys(ENCODINGS)`, so the order of the keys decided which precompressed file is served first: br, then zstd, then gzip (see the loop at `index.ts:243`). With sorted keys, gzip would have been picked before zstd." (Claude) "The key order determines compression preference." (Codex)
- **Tests.** No final message or reasoning mentioned tests, and no tool call searched for a test file. B's byte order is pinned by Astro's own tests, which aren't in the run dir. The agents reached the right answer from the code alone, because the order dependence is in the same file in both B and C.
- **Verification.**
  - Claude Code tried a shell command in 10 of 12 runs, to lint (`npx --no-install eslint`, `oxlint`) or to compare outputs with `node -e`. Every such command was refused ("This command requires approval", "This command uses shell operators that require approval for safety"). Only three read-only commands ran: two `cat`s of the diagnostics JSON and an `ls`. The final messages say so: "I couldn't re-run the linter because the shell command needed approval, which this run can't get, so the fix hasn't been checked by a lint pass."
  - Codex ran its own check scripts in 10 of 12 runs: a sortedness check on A, behaviour comparisons on B and C ("100 cases", "225", "450", "600", "All 64 compression acceptance/availability combinations").
  - Five Codex runs (a-codex-2, b-codex-1, b-codex-2, b-codex-3, c-codex-4) linted with ESLint's `sort-keys` alone, from ESLint copies in `~/GitHub/ultracite/node_modules/.bun`, `~/.bun/install/cache` or `~/.npm/_npx`. No run linted with Ultracite's preset. c-codex-4 found an installed Ultracite in `~/.npm/_npx`, but still configured `sort-keys` alone.
- **Length.** Claude's final messages run to several paragraphs, Codex's to one or two sentences.
- **Upstream history.** No run mentioned Hono's, Astro's or Vite's history or a later version.

## 6. Sessions: tools, commands, exposure, locks

- **Tools.** Claude Code used Read, Edit, Grep, Glob and Bash (3–9 tool calls a run, 3–8 model calls). Codex used `exec_command`, `exec` and `apply_patch` (4–29 tool calls, 5–32 model calls). It ran shell commands, Node and Python scripts, and patches.
- **What Codex looked at outside the run dir:**
  - It looked for `AGENTS.md` in every directory from `/` down, and found none.
  - It listed `$TMPDIR`, the experiment root and the run root (b-codex-2, b-codex-3, b-codex-4, c-codex-1). The listings show the topic folders, this topic's run ids, and the locked folders as `d---------` (the oracle's temp dir, the batch-log folder, the other topics' run roots). Their contents weren't readable.
  - It searched the main checkout's `node_modules/.bun`, `~/.bun/install/cache` and `~/.npm/_npx` for ESLint and the TypeScript parser, and read ESLint's own `sort-keys.js`. One `find` over `~/.npm/_npx` listed `jsonc-parser` files inside an `astro` package (file names only).
  - b-codex-1 grepped its own `~/.codex/memories/MEMORY.md` for `sort-keys|lint.*fix|ultracite`. It found only lines about an earlier SEO audit.
- **Exposure.** Every tool input in every log was checked against the patterns in `EXPOSURE_PATTERNS`, and every call outside the run dir was read by hand.
  - **No tool call read** a locked path, the corpus's notes, a clone or history clone, another run's files, the harness, the scratchpad, the bibliography, an installed Hono, Astro or Vite (`readInstalledCopies` is empty in every run), or Hono's or Astro's tests or history. No tool output hit "Permission denied".
  - **Whole-log counts are higher** because Codex's injected memory names the checkout, and because tool output listed directory names. Those were the `ultracite-research-sort-keys` folder name, the `node_modules/astro` paths in the `find` above, and a file size of 3366 bytes, which matched a PR-number pattern.
  - **Training data:** no run showed knowledge of these files' history.
- **Locks.** While an agent ran, 54–100 paths were locked (more as runs accumulated), and restored after each attempt. Each batch's snapshot was checked afterwards: 49, 54, 66, 78 and 90 paths, all restored. They were:
  - this harness's own folders, earlier attempts' staging, and every other run;
  - the corpus's sort-keys examples, results and calibration, every `sort-keys-*` corpus script, and the whole corpus `out/` and `repos/` (history clones included);
  - `research/bibliography/sort-keys.md` and the bibliography README, whose sort-keys line lists where key order changes behaviour;
  - `plans/`, `lint-configs/`, the system temp directory's `ultracite-research-*` folders (the oracle's among them), and the other topics' run roots;
  - through `AGENT_EXPERIMENT_EXTRA_LOCKS`: the orchestrating session's scratchpad (the corpus work's copies and notes, and this experiment's scripts), the batch-log folder, and the corpus `repos/` and `out/` of the three other worktrees that have them.

  Not locked: `node_modules` (the main checkout's has Hono 4.13.5, Astro and Vite; reads were checked instead, and there were none), and the session transcripts under `~/.claude/projects` (checked by the `orchestratorScratch` and `sessionLogs` patterns; no tool input named them).
- **Codex's memory.** `raw_memories.md` was rewritten once, during the pilot, by Codex's consolidation; `MEMORY.md` and `memory_summary.md` didn't change. After every batch, no memory file mentioned the experiment, the subjects or the rule (checked by `grep`).
- **Project instructions:** none loaded in any run (no `AGENTS.md` or `CLAUDE.md` in the run dir or above it).

## 7. The pilot

Two runs, `c-claude-pilot` and `c-codex-pilot`, are kept in `superseded-runs/` and not aggregated. They used the final setup and were re-measured with the final code. Both sorted `ENCODINGS` and wrote out `["br", "zstd", "gzip"]`, Claude with the declared type and Codex `as const`, like the final runs.

## 8. Issues in Ultracite (not fixed)

1. **The recommended linters change behaviour before any agent can judge it.**
   - With Oxlint or Biome, `ultracite fix` sorts B and C in its first pass. Astro's log lines change byte order, and Hono serves gzip to clients that prefer zstd. Neither fix prints what it moved, and an agent run afterwards is never told.
   - With ESLint, which has no fix, all 16 agent runs on B and C kept the behaviour.
   - So on these subjects the agent was safer than the deterministic fix. The corpus report (§8.1) found the same in the corpus.
2. **ESLint's own fix pass can undo an agent's fix, and the retry prompt blames the agent.**
   - `unicorn/no-immediate-mutation` and `unicorn/no-useless-spread`, both in ESLint core, rewrote two behaviour-preserving workarounds back into the unsorted literal. `sort-keys` then reported it again.
   - `buildRetryPrompt` says "a previous edit to this file did not resolve them", and verify's fix pass leaves the agent nothing to compare. It cost two runs four extra attempts, and one ended at the attempt limit with exit 1 and a correct file.
   - The same can happen with any pair of rules where one's fix recreates what another reports.
3. **"Fixed" counts reports, not objects or behaviour.** b-codex-3 merged two reported objects into one and got "Fixed 1 of 2 issues". Every run that kept B's bytes and every run that would have broken them get the same count.
4. **Explanations are discarded unless an issue is left for review** (also todo-comments §9.3). In 23 runs, Ultracite printed "Fixed N of N" and nothing of the agent's account. That includes "`ENCODINGS_ORDERED_KEYS` was built from `Object.keys(ENCODINGS)`, so the order of the keys decided which precompressed file is served first".
5. **The ESLint handoff's help is only the docs description**, "Require object keys to be sorted". Nothing in the handoff, the AGENTS.md template or the skill's code standards says that an object's order can be its meaning (corpus REPORT §8.8). The agents worked it out from the code here. A dependency through another module, the corpus's common case (§4.9), would be invisible to them.
6. **`ultracite fix` with ESLint renames identifiers.** `unicorn/name-replacements`' autofix renamed `req` to `request` and `dest` to `destination` in the copied Vite and Astro code, and `Env` to `Environment` in a stub, during normalising. It's harmless for locals, and would break an exported name's importers. Found while preparing the subjects (§1.3); not measured further.

Also noted, not Ultracite's code:

- Claude Code's `-p` permissions refused every lint and check command the agents tried, so no Claude run could verify its edit.
- Codex found linters through its user-level memory of the checkout and through global caches, as in earlier topics.

## 9. Harness changes

- **`scripts/topics/sort-keys.cjs`** (new):
  - subjects, preparation (running `ultracite init`, stripping, the comment check, normalising, checks);
  - the collect and verify hooks with the handoff filter, the three views and the edit reading;
  - measure, the self-test with the mutants and the mirror check, the deterministic paths, aggregate and tables.
  - It imports the corpus's `sort-keys-oracle.cjs` unchanged, so no corpus output changes.
- **`scripts/ultracite-adapters.cjs`:**
  - the ESLint adapter (`eslintPass`, `parseEslintDiagnostics`, `toStylelintTargets`, `eslintIgnoredFileArgs`), and the paths of packages/cli's ESLint, Prettier and Stylelint;
  - three new hash-checked slices (`linters.ts eslint`, `linter-args.ts toStylelintTargets`, `linter-args.ts eslintIgnoredFileArgs`). The existing slices' hashes are unchanged;
  - `verifySafely` checks a file with `resolve(cwd, file)` instead of `join`. That's the same for a relative path and correct for ESLint's absolute ones.
- **`scripts/run-one.mjs`:** `runWithRetries` checks the handoff by each file's path relative to the run dir when the linter reports an absolute path (ESLint). Relative paths are compared as before.
- **`scripts/topics.cjs`** documents absolute diagnostic paths.
- **`.gitignore`:** comments name this topic. The per-attempt patterns already cover its session logs, stdout and stderr, in `runs/` and `superseded-runs/`.
- **`harness-tests/sort-keys/mutants.json`** (new): the 24 mutants.
- **Earlier topics reproduce.** Each earlier topic's self-test was run, every run re-measured, and every topic re-aggregated from committed files, twice: at HEAD before any change here, and after all of them. Results folders were restored afterwards.

  | Topic | Self-test | Before vs after the changes | Against the committed files (apart from `generatedAt`) |
  | --- | --- | --- | --- |
  | cognitive-complexity | passes | identical | identical |
  | floating-promises | passes | identical | identical |
  | security-rules | passes | identical | the known preset drift (todo-comments REPORT §10): Biome's `noUndeclaredDependencies` (c9b606af) in the s2 runs |
  | dead-code | passes | identical | the known `sonarjs/void-use` drift in the Oxlint +js-plugins view (7984c6e9) |
  | import-cycles | passes | identical | identical |
  | accessibility | passes | identical | `hasSessionLog` flips to false in all 39 attempts (its gitignored session logs aren't in this worktree) |
  | todo-comments | passes | identical | `hasSessionLog` flips to false in all 48 attempts, for the same reason |

- **Prompt drift.** These runs used `prompt.ts` d4fd60cb…, the same as the todo-comments runs: nothing in the prompt changed since them.
  - `agents.ts` (2afbcf99…), `index.ts` (e0b222a3…), `linters.ts` (ba0fc725…), `run-agent.ts` and `diff.ts` are unchanged too.
  - The accessibility runs used d8ab94fc… and the five earlier topics 8c5e6e7e….
  - `run-one.mjs` checked the agent arguments against `agents.ts` before every run.

## 10. Caveats

- **Sample:** 4 runs per subject and agent, one file each. The result that matters is uniform: 16 of 16 kept B's and C's behaviour, against 0 of 2 for each deterministic fix. Smaller differences, such as Codex's way of keeping B's bytes, are hypotheses.
- **The order dependence is in the same file.** C's constant is named `ENCODINGS_ORDERED_KEYS`, and B serialises the literal on the same line. The corpus found most order-sensitive rewrites escaping where a reader can't follow: exported, returned or passed to a function (§4.9). An agent handed one of those would have to look further, and none of these agents looked for tests or other files.
- **The handoff is filtered** (§1.4). A real project with these files would hand over 11 to 26 issues at once, and the agent's attention to the keys could differ.
- **The subjects are famous code**, but no run showed it knew their history.
- **The run dir isn't a full project.** It has no `node_modules` and no git, and its path names the experiment and the topic (`…/ultracite-agent-experiment/sort-keys/<run>/`), as in every topic. So no agent could run Ultracite's preset, which is how the fix-pass revert in §3 went unseen. The headers name the upstream source and say the code was copied.
- **Only the ESLint path was given to agents.** Oxlint hands an agent `sort-keys` only when its fix can't apply (comments between keys) or overlaps another, with help that spells out the sorted order (corpus §4.4). That path wasn't tested.
- **The oracle is the corpus's:** stubs and fakes, 42, 16 and 480 scenarios, no server or real logger.
- **The edit reading is heuristic** (objects by key set, constructs by count), and was corrected once after the runs (§1.6). The hand classification, by one rater who saw the automatic readings, is the reference.
- **User-level configuration applied:** Codex's memories and plugins, and Claude Code's plugins (Cloudflare, Vercel, Warp) and settings. The user-level instruction files are empty.

## 11. Reproduce

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=sort-keys
node scripts/prepare-subjects.cjs        # subjects/sort-keys/ (runs ultracite init; stripFields, TEXT_EDITS, the comment check, normalised, checked; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (27) and the mirror against the CLI (27) -> oracle-self-test.json (~15 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths and the mutant matrix (~3 min)
node scripts/report-tables.cjs > results/sort-keys/tables.md
```

- **Re-measuring without the session logs:** `measure.cjs <run>` re-measures a run from its committed files in about 30 seconds, carrying the session-derived fields over from `measure.json`. All 24 were re-measured with the final code.
- **This report's runs** set `AGENT_EXPERIMENT_EXTRA_LOCKS` from a wrapper that listed the scratchpad, the batch-log folder and the other worktrees' clones and outputs, and checked every lock's mode before and after each batch.
- **The hand classification** is an input (`classifications.json`).

## 12. Files

| Path (under `research/agent-experiment/`) | Contents |
| --- | --- |
| `scripts/topics/sort-keys.cjs` | the topic |
| `scripts/ultracite-adapters.cjs` | the mirror, now with the ESLint adapter |
| `subjects/sort-keys/` | the three subjects, `run-files/` (init's files as the fix pass leaves them, and `tsconfig.json`), `init/` (what `ultracite init` writes for ESLint, Oxlint and Biome; Oxlint's `oxlint.config.ts` and `oxfmt.config.ts` are stored with a `.txt` suffix, because this repo's Oxlint and Oxfmt would load them as nested configs), `subjects.json` |
| `harness-tests/sort-keys/mutants.json` | 24 hand-made mutants with their expected readings |
| `results/sort-keys/runs/` | 24 runs: meta, handoff, before/after, per-attempt artifacts, measure.json |
| `results/sort-keys/superseded-runs/` | the pilot (not aggregated) |
| `results/sort-keys/results.json`, `tables.md`, `classifications.json`, `oracle-self-test.json`, `README-section.md` | aggregate, tables, hand classification, self-test and mirror check, the section for `research/README.md` |
| `../corpus/scripts/sort-keys-oracle.cjs` | the oracle, shared with the corpus |
