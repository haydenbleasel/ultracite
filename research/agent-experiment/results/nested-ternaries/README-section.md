### Nested ternaries (thirteenth post)

Ultracite turns `no-nested-ternary` on in Oxlint and ESLint core, and Biome's `noNestedTernary`. No linter fixes a nested ternary, so `ultracite fix --claude` or `--codex` is what rewrites one in a real project. This topic asks whether the agent rewrites without changing behaviour, picks a rewrite that fits the position, avoids the rewrites that look equivalent and aren't, and what Ultracite's other rules and fix passes do to its edit. The user's project is exactly what `ultracite init --linter oxlint --frameworks react` leaves; the rule is on there already.

Subjects are three files from `corpus/examples/nested-ternaries/`:

- **a:** Next.js's `denormalize-page-path.ts`: a two-test chain that is the function's return value. Right: early returns or if/else, in the same test order.
- **b:** Supabase Studio's `ExplorerNavNotebooks.tsx`: a loading / empty / list chain, a JSX child inside two wrappers, where no statement can go. Right: a variable or helper above the return, or a child component. `notebooks.length &&` renders `0`.
- **c:** Astro's `vite-plugin-config-alias` `getConfigAlias`: a chain in a `.map` callback whose first branch runs `++matchId`. Right: a block body with early returns, a switch or a lookup of functions. An object lookup increments the counter for every character.

**The run dir is what `ultracite init --linter oxlint --frameworks react` leaves.** `prepareSubjects` runs the CLI's own `init` (under Bun, `--frameworks react --skip-install --yes`) for Oxlint, Biome and ESLint in scratch projects, and fails if Oxlint's config doesn't extend the React preset. Init's files are kept in `subjects/nested-ternaries/init/`; Oxlint's files as the fix pass formats them, the subjects' `tsconfig.json` and each subject's stub module (`stubs.ts`, or `stubs.tsx` for B) make up `run-files/` and the subject folders. Oxlint's two configs and Biome's are stored with a `.txt` suffix.

**Subjects.** `prepareSubjects`:

- **Strips the header.** It removes the `stripFields` fields and the subject line. `TEXT_EDITS` cut B's `Components:` field (it listed the chain's branches) and C's `Function:` sentence about numbered capture references to an identification, and rewrite "copied verbatim", the license lines that pointed into `research/`, the stubs' headers, B's stub notes about the oracle and C's `ADDED for the behaviour oracle`.
- **Renames the stub modules.** The corpus names them `nested-ternaries-<id>-stubs`, which names the topic; the run dir calls them `stubs`, and the oracle is handed the corpus name back.
- **Checks every comment line** of the subject and its stub against 21 patterns: the construct, the rewrites, the traps (evaluation, `&&`, `0`, the counter), judgement words, review, the tools, the analysis and the history's PRs and commits. One stub directive (`biome-ignore lint/style/noNamespace`) is allowed by name. The same patterns match 46, 44 and 51 lines of the unstripped subjects.
- **Normalises** with Ultracite's Oxlint pass until nothing changes, and checks that the oracle's trace equals the corpus subject's (B's ignoring class order in `className`, which Oxfmt sorts), that each normalised stub module gives the same trace as the corpus's in its place, that `tsc` is clean, and that the handoff is exactly one `no-nested-ternary`.

**The handoff is filtered** in the collect and in every re-lint, as in the six previous topics: the rule, plus any diagnostic that isn't the prepared project's own, by rule and message. A real project would hand over 2, 2 and 6 issues in the subject (C's `no-plusplus` on the very line). Here the filter never acted: every run cleared the rule in one attempt and added nothing Oxlint reports.

**Retry loop:** `runWithRetries`, with `scripts/ultracite-adapters.cjs` at a new "v3" revision, which this topic selects. The CLI's agent-fix code changed after the func-style runs (#866, #871), and v3 ports it: `diff.ts`'s line-aware matching (each report's file as the linter read it, places between unique lines, number-free leftovers on the same line), `verifySafely` returning what `recordSourceLines` returns, and the per-file recording in `runAgentFix`. The self-test runs the port against `diff.ts` itself on nine edits, and Ultracite's real Oxlint adapter next to the mirror on 52 inputs; all agree. A re-measurement rebuilds each report's file from the run's committed copies, so retry decisions reproduce. v1 and v2 are unchanged.

**Measurement.** Each attempt is measured as the agent left the file and as verify left it:

- **Lint, inline config honoured and ignored, in three views:** Oxlint (init's config, core and react), ESLint (init's core and react: `no-nested-ternary`, `sonarjs/no-nested-conditional`, `unicorn/prefer-ternary` with Ultracite's options, `curly`, `no-else-return`, `react/jsx-no-leaked-render`; React Doctor's rules left out of every count) and Biome (core and react). The nested-ternary rules, 49 conditional rules, and every rule a state adds.
- **`tsc`**, strict, with the stub module and Node's types.
- **The oracle:** exactly, and ignoring key order, class order and a regular expression's printed flags.
- **The edit, from the AST:** guards and whether each is the one-line `if (bool) return x;`, if/else returns, `let` + if/else, helpers, child components, switches, lookups, IIFEs, `&&`/`||` (and a `.length &&` in JSX), a ternary moved into a const, the nested trees left, C's counter and where each update of it runs, B's wrappers, cognitive complexity with the corpus's scorer, lines, and everything else that changed.
- **Ultracite's partition**, the recomputed retry decision, and what it would print (the outro, the notes, the end of the agent's final message).
- **From the session log:** commands run or refused, searches for tests, reads of an installed Astro or Next.js, the final message and progress messages, sentences about evaluation order, side effects, the counter, `0`, the default branch, readability and reasons, and exposure.

The hand classification is in `classifications.json`. It includes a reader judgement (easier, about the same or harder to follow) by two raters from a blind packet: rater 1 is the model that ran the experiment, rater 2 a separate subagent that saw only the code.

**The deterministic paths.** `aggregate` runs `ultracite fix` and `--unsafe` with Oxlint, Biome and ESLint on each subject, as upstream wrote it and as handed over (30), and on every run's final file (120), through the mirror and Ultracite's real adapters, which agree in all 150.

**Oracle:** `corpus/scripts/nested-ternaries-oracle.cjs`, imported unchanged. The self-test has 52 cases, all as expected:

- the three prepared subjects;
- the corpus's 32 variants, made by `nested-ternaries-examples.cjs`'s own `variantsOf` without running the script, from the cleaned subject, then normalised, and 3 of them as written. Their verdicts, differing counts and Oxlint counts match `examples.json`;
- 14 hand-made mutants.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=nested-ternaries
node scripts/prepare-subjects.cjs        # subjects/nested-ternaries/ (runs ultracite init --frameworks react for each linter; stripped, checked, normalised; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (52), the diff.ts port (9) and the mirror against the CLI (52) -> results/nested-ternaries/oracle-self-test.json (~5 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths, the passes on the final files and the mutant matrix (~10 min)
node scripts/report-tables.cjs > results/nested-ternaries/tables.md
```

**Cost and time.** In this post's runs:

- Claude Code cost $0.29–0.44 a run (median $0.30, $3.88 for 12 runs).
- Codex used 16.2k–31.6k tokens a run as reported (median 17.7k).
- Runs took 14.5–47 s, one attempt each, and measuring one takes about 20 seconds.
- The pilot (one run per agent on C) is in `results/nested-ternaries/superseded-runs/` and not aggregated.

**Locks.** While an agent runs, these are locked as well:

- the corpus's nested-ternaries examples, results and calibration, every `nested-ternaries-*` corpus script, and the whole corpus `out/`, `repos/` (history clones included) and `biome-input/`;
- `research/bibliography/nested-ternaries.md` and the bibliography README;
- `plans/`, `lint-configs/`, the temp directory's `ultracite-research-*` folders and the other topics' run roots;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`: the orchestrating session's scratchpad, other sessions' scratchpads and job logs that mention the topic (regular files only: some task outputs are symlinks to live transcripts, which `chmod` would follow), the main checkout's plans, corpus clones and `lint-configs`, and the other worktrees' corpus `repos/` and `out/`.

`node_modules` isn't locked, though the main checkout's has Astro 7.3.2's built `vite-plugin-config-alias` and the Bun cache has Next.js 16.x's `denormalize-page-path.js`, both with the same nested ternary. Reads were checked instead, and there were none.

The method, numbers and caveats are in `agent-experiment/results/nested-ternaries/REPORT.md`.

Harness changes made with this topic, all opt-in or behaviour-preserving:

- `scripts/topics/nested-ternaries.cjs` (new). It imports the corpus's `nested-ternaries-oracle.cjs` and `nested-ternaries-lib.cjs` unchanged and reads `nested-ternaries-examples.cjs`'s `variantsOf` without running the script.
- `scripts/ultracite-adapters.cjs`: the "v3" revision (the CLI at 9743dfcb), selected with `ULTRACITE_MIRROR=v3`. v1 and v2 are unchanged.
- `scripts/run-one.mjs`: under v3 only, the handed-over group is what `recordSourceLines` returns, and `meta.json` records the mirror's revision.
- `harness-tests/nested-ternaries/mutants.json` (new): 49 mutants.
- `.gitignore` comments name the topic; the per-attempt patterns cover its logs.
- **Earlier topics,** re-measured, self-tested and re-aggregated from their committed runs before and after these changes: before and after match exactly for all eleven and prompt-revision (func-style's self-test once differed in two mirror comparisons under parallel load, from Oxlint's report order; alone it is identical). No committed run's response, outcome or oracle verdict changes. Five self-tests fail on the current repo before and after alike, for reasons that predate this topic (accessibility's strict v1 hash check, todo-comments' JS-plugin help, and sort-keys', length-limits' and func-style's variants since key sorting went off in 37ead86b). Against the committed files every topic shows drift from commits made after its runs: 3e83844c Oxlint 1.90, 6675a904 Oxfmt 0.75, 79d73d9e Biome 2.6.4, 3572b864 the ESLint plugins, 7a2d831c, 8eb46ade and 37ead86b the presets, and `hasSessionLog` where the session logs aren't in this worktree.
