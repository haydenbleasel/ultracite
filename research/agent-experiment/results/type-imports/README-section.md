### Type imports (fourteenth post)

Ultracite's Oxlint core turns on typescript-eslint's `consistent-type-imports` (with `consistent-type-exports`, which needs type information, and `no-import-type-side-effects`), `import/consistent-type-specifier-style` set to `"prefer-top-level"`, `import/no-duplicates` and `no-duplicate-imports`, and Biome's preset has `useImportType` and `useExportType`. The safe fixes convert a value import used only as a type before an agent sees it, so `ultracite fix --claude` or `--codex` gets what they can't fix or leave unsettled. This topic asks whether the agent fixes those without changing which modules load (under the repo's build, a compiler that keeps imports as written, and one that elides them), picks the form the rules ask for, avoids the moves that compile and change what loads, leaves a report for review when the rule's help would change what loads, and whether its edit survives the next fix pass. The user's project is exactly what `ultracite init --linter oxlint` leaves; the rules are on there already.

Subjects are three folders from `corpus/examples/type-imports/`, each laid out in the run dir as in the corpus:

- **a:** Next.js's `telemetry/flush-telemetry.ts`, with `trace/shared.ts` and a stub `telemetry/storage.ts`: `InstanceType<typeof import('./storage').Telemetry>`. Right: `import type { Telemetry }`; storage never loads.
- **b:** tRPC's `TRPCClientError.ts` with a stub module: one Oxlint pass splits upstream's mixed import into a second `import type`, which `no-duplicates` and `no-duplicate-imports` report and no further pass merges. Right: one value import of `isObject` and one `import type`.
- **c:** Next.js's `client/normalize-locale-path.ts` with the shared module: `require(…) as typeof import(…)` inside the `__NEXT_I18N_SUPPORT` branch, with `node/global-require` and `unicorn/prefer-module` on the same line. Right: type the `require` without `import()` and leave the require rules for review; a static import loads the i18n module in every app.

**The run dir is what `ultracite init --linter oxlint` leaves.** `prepareSubjects` runs the CLI's own `init` (under Bun, `--skip-install --yes`) for Oxlint, Biome and ESLint in scratch projects, and fails unless Oxlint's config extends core alone. Init's files are kept in `subjects/type-imports/init/`; Oxlint's files as the fix pass formats them make up `run-files/`. Each subject folder holds the subject, the files beside it and a `tsconfig.json` from the corpus examples' compiler options (`verbatimModuleSyntax`, `module: esnext`, `moduleResolution: bundler`, strict; B's `paths` re-rooted). Oxlint's two configs and Biome's are stored with a `.txt` suffix.

**Subjects.** `prepareSubjects`:

- **Strips the header.** It removes the `stripFields` fields and the subject line. `TEXT_EDITS` cut C's `Function:` sentences about the build-time variable to an identification, and rewrite "copied verbatim", the license lines that pointed into `research/`, and the stubs' and copies' headers that named the topic or the oracle.
- **Checks every comment line** of the subject and the other files of its folder against 17 patterns: the forms (type import, `import type`, inline, top-level, specifier), what compilers do (elide, erase, strip, verbatim), the trap (side effect, eager, lazy, load, bundle, evaluate, the build-time variable, static import), the fix passes' fight (duplicate, merge, split), the rules, review, the tools, the analysis and the history's PRs, commits and authors. The MIT License's "merge" line and B's two upstream directive texts are allowed by name. The same patterns match 30–57 lines of each unstripped subject.
- **Normalises** the whole folder with Ultracite's Oxlint pass until nothing changes (two passes each). B's first pass splits upstream's mixed import and `prefer-ts-expect-error` adds two TS2578 errors; that state, the corpus's one-pass handoff, is also the fixed point and is what the agents get.
- **Checks the result:** in every oracle mode the prepared folder behaves as the corpus folder, and the prepared subject behaves the same with the corpus's own other files; the collect leaves every file unchanged; the handoff holds exactly the corpus's counts of the subject's rules.

**The handoff is filtered** in the collect and in every re-lint, as in the seven previous topics: the six topic rules, for C the two require rules on the same line, plus any diagnostic that isn't the prepared project's own, by rule and message. A real project would hand over 2, 10 and 3 issues in the subject; C's handoff is a real project's. The filter never acted.

**Retry loop:** `runWithRetries`, with `scripts/ultracite-adapters.cjs` at a new "v4" revision, which this topic selects. The CLI changed after the nested-ternaries runs in three mirrored slices (f23eb8e8's jsdoc and tsdoc help lookup, d0219d34's Biome explain cache, and the Stylelint target expansion from 800bc5d6, 6c29ae8c and 4a32ea73), and v4 ports them. The self-test runs v4's `toStylelintTargets` against the CLI's own on 13 target lists and compares the JS plugin list (14 checks), the diff.ts port against `diff.ts` on 6 edits, and Ultracite's real Oxlint adapter next to the mirror on 49 inputs; all agree. v1, v2 and v3 are unchanged.

**Measurement.** Each attempt is measured as the agent left the file and as verify left it:

- **Lint, inline config honoured and ignored, in five views:** Oxlint (init's config, and with `--type-aware`), ESLint (core, and with the type-aware preset), Biome (core): 21 import rules, 72 rules an import edit can trip, and every rule a state adds.
- **`tsc`** in three settings: the run dir's tsconfig, `verbatimModuleSyntax` on, imports elided. TS1361, TS1202, TS1484, TS2206 and TS2857 flagged among others.
- **The oracle** in all three of the corpus's modes (repo, kept, elided): which modules evaluate, in what order, and every scenario's result (C with i18n off and on).
- **The edit, from the AST and the corpus's inventory:** the form chosen, top-level or inline, B's declarations and whether `isObject` is still a value import, C's `require` (in the branch, still lazy), casts, local types, lines and everything else that changed.
- **Ultracite's partition**, the recomputed retry decision, and what it would print.
- **From the session logs, the agent's and its forks'** (every Codex run spawned one): commands run or refused, `tsc`, searches for tests, reads of an installed Next.js or tRPC, the final, progress and fork messages, sentences about loading, side effects, laziness, bundles, elision, type stripping, duplicates and the rules' conflict, and exposure.

The hand classification is in `classifications.json`. It includes a reader judgement (easier, about the same or harder to follow) by two raters from a blind packet: rater 1 is the model that ran the experiment, rater 2 a separate subagent that saw only the code.

**The deterministic paths.** `aggregate` runs `ultracite fix` and `--unsafe` with Oxlint, Biome and ESLint on each subject, as upstream wrote it and as handed over (30), and on every run's final file (120), each repeated until the file stops changing, through the mirror and Ultracite's real adapters, which agree in all 150.

**Oracle:** `corpus/scripts/type-imports-oracle.cjs`, imported unchanged (a scratch examples folder per trace, so the prepared files are used without touching the corpus). The self-test has 49 cases, all as expected:

- the three prepared subjects;
- the corpus's 23 variants, made by `type-imports-examples.cjs`'s own `variantsOf` without running the script, normalised, and 7 of them as written. Their verdicts in every mode match `examples.json`;
- 16 hand-made mutants.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=type-imports
node scripts/prepare-subjects.cjs        # subjects/type-imports/ (runs ultracite init for each linter; stripped, checked, normalised; ~20 s)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (49), the diff.ts port (6), the v4 port (14) and the mirror against the CLI (49) -> results/type-imports/oracle-self-test.json (~4 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths, the passes on the final files and the mutant matrix
node scripts/report-tables.cjs > results/type-imports/tables.md
```

**Cost and time.** In this post's runs:

- Claude Code cost $0.33–0.38 a run (median $0.345, $4.15 for 12 runs).
- Codex used 16.0k–34.9k tokens a run as reported (median 19.9k), and its forks 68.8k more in all, which Codex doesn't report.
- Runs took 20.7–55.9 s, one attempt each, and measuring one takes about a minute.
- The pilot (one run per agent on C) is in `results/type-imports/superseded-runs/` and not aggregated.

**Locks.** While an agent runs, these are locked as well:

- the corpus's type-imports examples, results and calibration, every `type-imports-*` corpus script, the tRPC license copy, and the whole corpus `out/`, `repos/` (history clones included) and `biome-input/`;
- `research/bibliography/type-imports.md` and the bibliography README;
- `plans/`, `lint-configs/`, the temp directory's `ultracite-research-*` folders and the other topics' run roots;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`: the orchestrating session's scratchpad (with the corpus run's `TYPE_IMPORTS_TMP` copies), other sessions' files that mention the subjects or the rules, this session's task outputs, the main checkout's corpus clones, plans and `lint-configs`, and the other worktrees' corpus `repos/` and `out/`.

`node_modules` isn't locked. No checkout has Next.js or tRPC installed; the Bun cache has Next.js 15 and 16 builds with A's and C's compiled files. Reads were checked instead, and there were none.

The method, numbers and caveats are in `agent-experiment/results/type-imports/REPORT.md`.

Harness changes made with this topic, all opt-in or behaviour-preserving:

- `scripts/topics/type-imports.cjs` (new). It imports the corpus's `type-imports-oracle.cjs` and `type-imports-lib.cjs` unchanged and reads `type-imports-examples.cjs`'s `variantsOf` without running the script.
- `scripts/ultracite-adapters.cjs`: the "v4" revision (the CLI at 60a16471), selected with `ULTRACITE_MIRROR=v4`, and a `jsPluginPackages` export. v1, v2 and v3 are unchanged.
- `scripts/run-one.mjs`: a subject or run file may sit in a folder of the run dir; every further session log with the run dir as its cwd (a Codex agent's forks) is kept as `transcript.<k>.jsonl`; v4 reads as v3. With flat names and one log, as in every earlier run, nothing changes.
- `harness-tests/type-imports/mutants.json` (new): 46 mutants.
- `.gitignore`: comments name the topic, and `attempt*/transcript.*.jsonl` is ignored in `runs/` and `superseded-runs/`.
- **Earlier topics,** re-measured, self-tested and re-aggregated from their committed runs before and after these changes: before and after match for all of them and prompt-revision except func-style, whose v1 mirror check depends on the order Oxlint's threads report files in (25, 22, 26 and 24 failures in four runs, two of them with HEAD's shared scripts). No committed run's response, outcome or oracle verdict changes. Five self-tests fail on the current repo before and after alike (accessibility, todo-comments, sort-keys, length-limits, func-style), for the reasons the nested-ternaries topic gives. Against the committed files the drift is what the nested-ternaries topic lists, plus 60a16471 (Ultracite 8.3.0) and nested-ternaries' `mirroredSlicesDriftNow` naming the three slices v4 ports.
