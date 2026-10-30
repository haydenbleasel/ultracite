### Function style and order (twelfth post)

Ultracite holds functions to `const` expressions (`func-style`: `["error", "expression", { allowArrowFunctions: true }]`) and keeps `no-use-before-define` on at its defaults. No linter has a fix that converts a declaration, so `ultracite fix --claude` or `--codex` is what converts in a real project. This topic asks whether the agent converts without changing behaviour, reorders a top-down file correctly, and what it does when no order can satisfy `no-use-before-define`. The user's project is exactly what `ultracite init --linter oxlint` leaves; both rules are on there already.

Subjects are three files from `corpus/examples/func-style/`:

- **a:** Next.js's `duration-to-string.ts`: five declarations, each defined above its first use, three of them a single return. Right: convert each to a `const` arrow, keeping types and JSDoc; nothing moves.
- **b:** Supabase Studio's `ConfigurationDriftPage.utils.ts`, written top-down (three exports above five helpers). Right: convert and move the helpers above their callers.
- **c:** Astro's `runtime/server/serialize.ts`: `serializeArray` and `serializeObject` call `convertToSerializedForm`, which calls both. Right: convert, say no order satisfies the rule for a mutual recursion, and leave those issues for review; restructuring to satisfy an ordering rule is wrong.

**The run dir is what `ultracite init --linter oxlint` leaves.** `prepareSubjects` runs the CLI's own `init` (under Bun, `--skip-install --yes`) for Oxlint, Biome and ESLint in scratch projects. Init's files are kept in `subjects/func-style/init/`. Oxlint's files as the fix pass formats them, the subjects' `tsconfig.json` and each subject's stub module make up `run-files/` and the subject folders. Oxlint's two configs and Biome's are stored with a `.txt` suffix.

**Subjects.** `prepareSubjects`:

- **Strips the header.** It removes the `stripFields` fields and the subject line. `TEXT_EDITS` rewrite B's and C's `Functions:` fields, "copied verbatim", the license lines that pointed into `research/`, and the stubs' headers.
- **Renames the stub module.** The corpus calls it `func-style-b-stubs.ts`, which names the rule, so the run dir calls it `stubs.ts`. The oracle is handed the corpus name back.
- **Checks every comment line** of the subject and its stub against 18 patterns: the rules and the forms (declaration, expression, arrow, braces, concise, body), order (order, top-down, bottom-up, above, below, move, hoisting), the trap (mutual, recursion, cycle, TDZ, "before initialization"), review, the tools, the analysis and the history's PRs and commits. Two lines of the MIT license text are allowed by name. The same patterns match 34, 35 and 51 lines of the unstripped subjects.
- **Normalises.** It runs Ultracite's Oxlint pass (`oxlint --fix`, `oxfmt --write`) until nothing changes.
- **Checks the result.** The oracle's trace must equal the corpus subject's: A's and C's exactly, B's ignoring the key order `sort-keys` gave its row objects. B's normalised stub must behave as the corpus's does, the exports' names must be unchanged, `tsc` must be clean, and the handoff must hold exactly the corpus's counts of the two rules.

**The handoff is filtered** in the collect and in every re-lint, as in the four previous topics: the two rules, plus any diagnostic that isn't the prepared project's own, by rule and message. A real project would hand over 11, 22 and 26 issues. The filter caused all 3 retries (`typescript/no-explicit-any` on a new type alias), and a two-rule filter would have retried nothing.

**Retry loop:** `runWithRetries` and `scripts/ultracite-adapters.cjs`, unchanged. The self-test runs Ultracite's real Oxlint adapter under Bun in a project with init's own config files and `node_modules` links, next to the mirror: all 37 comparisons match.

**Measurement.** Each attempt is measured as the agent left the file and as verify left it:

- **Lint, inline config honoured and ignored, in eight views:**
  - Oxlint (init's config), and with `no-use-before-define` set to `{ functions: false }` and `{ variables: false }`;
  - ESLint core (`func-style` and `@typescript-eslint/no-use-before-define`), with typescript-eslint's option variants and the base rule under local aliases in the same pass;
  - Biome core.
- **`tsc`**, flagging TS2448, TS2454 and the other use-before-declaration errors.
- **The oracle,** exactly and ignoring key order, with each export's `name` and `length`.
- **The edit, from scope analysis:** each function's form, body and types, its JSDoc, the functions moved and their lines, the reading direction, references above their definition and at load time, restructuring (merged, nested, methods, a parameter added, a forward declaration), suppressions, comments lost and the diff size.
- **Ultracite's partition** and what it would print.
- **From the session log:** commands run or refused, writes outside the run dir, environment printing, searches for tests, reads of an installed Astro or Next.js, the final message, sentences about hoisting, the TDZ, the recursion, order and when calls run, and exposure.

The hand classification is in `classifications.json`. It includes a reader judgement (easier, about the same or harder to follow) by two raters from a blind packet: rater 1 is the model that ran the experiment, rater 2 a separate subagent that saw only the code.

**The deterministic paths.** `aggregate` runs `ultracite fix` and `--unsafe` with Oxlint, Biome and ESLint on each subject, as upstream wrote it and as handed over, through the mirror and Ultracite's real adapters, which agree in all 36 cases.

**Oracle:** `corpus/scripts/func-style-oracle.cjs`, imported unchanged. The self-test has 37 cases, all as expected:

- the three prepared subjects;
- the corpus's 25 variants, made by `func-style-examples.cjs`'s own `variantsOf` without running the script, from the cleaned subject, then normalised. Their verdicts, Oxlint counts and moved functions match `examples.json`;
- 9 hand-made mutants.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=func-style
node scripts/prepare-subjects.cjs        # subjects/func-style/ (runs ultracite init for each linter; stripped, checked, normalised; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (37) and the mirror against the CLI (37) -> results/func-style/oracle-self-test.json (~3 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths and the mutant matrix (~10 min)
node scripts/report-tables.cjs > results/func-style/tables.md
```

**Cost and time.** In this post's runs:

- Claude Code cost $0.40–1.35 a run (median $0.49, $8.27 for 12 runs).
- Codex used 22.7k–71.0k tokens a run (median 35.8k).
- Runs took 37–261 s (27 attempts in all), and measuring one takes about 30 s.
- The pilot (one run per agent on C) is in `results/func-style/superseded-runs/` and not aggregated.

**Locks.** While an agent runs, these are locked as well:

- the corpus's func-style examples, results and calibration, every `func-style-*` corpus script, and the whole corpus `out/` and `repos/`, history clones included;
- `research/bibliography/func-style.md` and the bibliography README;
- the main checkout's `research/agent-experiment/plans`, `lint-configs/`, the temp directory's `ultracite-research-*` folders and the other topics' run roots;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`: the orchestrating session's scratchpad (the batch logs were in it) and the other worktrees' corpus `repos/` and `out/`.

`node_modules` isn't locked, though the main checkout's has Astro 7.3.2's built `serialize.js` and the Bun cache has Next.js 16.2.9's `duration-to-string.js`. Reads were checked instead, and there were none.

The method, numbers and caveats are in `agent-experiment/results/func-style/REPORT.md`.

Harness changes made with this topic, all opt-in or behaviour-preserving:

- `scripts/topics/func-style.cjs` (new). It imports the corpus's `func-style-oracle.cjs` and `func-style-lib.cjs` unchanged and reads `func-style-examples.cjs`'s `variantsOf` without running the script.
- `harness-tests/func-style/mutants.json` (new): 34 mutants.
- `.gitignore` comments name the topic; the per-attempt patterns cover its logs.
- **Earlier topics, re-measured, re-aggregated and self-tested from their committed runs:** every self-test passes, and no shared script changed. Against the committed files they show only the known drift: tool versions, 947ca03e, `sonarjs/void-use`, Unicorn 79 and Biome 2.6 rules, Biome's shorter barrel message, and `hasSessionLog` where the session logs aren't in this worktree.
