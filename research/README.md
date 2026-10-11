# Research for the blog

The harnesses and verified sources behind the posts at `/research`. A post's numbers have to be measured, not estimated (see the "Research posts" section of `AGENTS.md`), and this folder is where that happens. Reuse it rather than rebuilding it.

| Folder | What it's for |
| --- | --- |
| [`bibliography/`](./bibliography/) | Sources that were opened and checked, one file per topic. Cite from here. |
| [`corpus/`](./corpus/) | Scores every function in eight real TypeScript codebases at pinned commits, with ESLint, Biome and Oxlint. |
| [`agent-experiment/`](./agent-experiment/) | Hands a real lint error to Claude Code and Codex, exactly as `ultracite fix --claude/--codex` does, and measures what they change. |

Each harness keeps one post's output under `results/<topic>/`. The first topic is `cognitive-complexity`; set `RESEARCH_TOPIC` to write somewhere else.

## Safety rules

- Clone measured repos shallowly (`git clone --depth 1`, sparse where possible) into the gitignored `corpus/repos/`.
- Never install, build or run anything from a cloned repo. Only parse its files with this repo's own tooling.
- Bun's test runner doesn't skip gitignored folders, so a bare `bun test` from the repo root also finds the clones' own test files (and those in `out/` mirrors) and fails by the thousand. Use `bun run test`, which Turbo scopes to `packages/cli`, or move `corpus/repos/` and `corpus/out/` aside first.
- Never commit an agent's session log, stdout or stderr. They carry account details, so they're gitignored, and everything else `run-one.mjs` copies back is redacted (paths, home directory, session ids).
- Agents run in a temp directory outside the repo, so they can't load this repo's `CLAUDE.md` or `AGENTS.md`, or find this harness, from a parent directory.

## Corpus

What it measures, per function: the `sonarjs/cognitive-complexity` score, ESLint's cyclomatic `complexity`, Biome's `noExcessiveCognitiveComplexity` and Oxlint's `complexity`. The scores are joined exactly by function, against a local census rule that counts every function so shares have a denominator. The first post's results are in `corpus/results/cognitive-complexity/`: `REPORT.md` (method, findings and caveats), `results.json` and `tables.md`.

From the repo root:

```sh
bash research/corpus/scripts/clone.sh      # ~20 s: the 8 repos at their pinned SHAs (scripts/repos.json)
node research/corpus/scripts/run-all.cjs   # ~15 s: analyze, Biome, Oxlint parity, calibration,
                                           # examples, results/<topic>/results.json and tables.md
```

Tools come from this repo: ESLint, the TypeScript parser and Biome from `packages/cli`, and `eslint-plugin-sonarjs` and Oxlint from the root `node_modules`. Nothing is installed.

To check a hand-written example before it goes in a post:

```sh
node research/corpus/scripts/score.mjs path/to/example.ts
```

Committed: `scripts/`, `calibration/` (hand-written edge cases), `examples/` (real functions copied with their licenses) and `results/<topic>/`. Regenerated and gitignored: `repos/`, `biome-input/` (Biome's config-free mirror of the sources) and `out/` (per-function rows).

`analyze.cjs` and `aggregate.cjs` are specific to complexity rules. For any other rule, start with the rule census.

### Rule census (any rule, every post)

`scripts/rule-census.cjs` runs Ultracite's own Oxlint presets, unchanged, over the corpus and counts diagnostics per rule and per repo, with hits per 10,000 lines. It covers every rule the presets enable, so one run answers "how often does rule X fire in real code?" for any post.

```sh
node research/corpus/scripts/rule-census.cjs --topic <slug> \
  [--presets core,react]          # presets under packages/cli/config/oxlint (default core,react)
  [--focus rule,rule]             # rules to tabulate first and keep per-hit rows for
  [--repos zod,hono]              # a subset of scripts/repos.json
  [--modes reported,raw]          # default both
# ~10 s for both modes over all 9 repos
```

- **Two modes.** `reported` lints the files as they are, so in-file `eslint-disable` / `oxlint-disable` comments are honoured: what `ultracite check` would print. `raw` lints a mirror (`out/rule-census/<slug>/mirror/`) with every disable directive rewritten to the same length, so it counts every occurrence, including the ones maintainers already suppressed. The difference between the two is a measure of how much a repo already enforces a rule.
- **Same files as every other measurement.** Files come from `collect-files.cjs`, passed to Oxlint as explicit lists with `--disable-nested-config`, so no config from a clone is read. Line counts match `results/cognitive-complexity/results.json`.
- **Type-aware rules never run** here (no `--type-aware`, and the clones have no `node_modules`), so they always count 0. `rule-census.json` marks them.
- **Outputs:** `results/<slug>/rule-census.json` (every enabled rule, per repo and pooled), `results/<slug>/rule-census.md` (focus rules, top 40, rules with no hits), and `out/rule-census/<slug>/<repo>.<mode>.json` (every hit of the focus rules, gitignored) for downstream sampling.
- **Pooled numbers exclude Ultracite's own CLI**, which is listed separately.
- **Checks.** The run fails if Oxlint lints a different number of files than it was given, or if a diagnostic maps to a rule the presets don't enable (that's how a scope alias such as `react-hooks` → `react` was found).

### Type escape hatches (second post)

The escape-hatch scripts build on the rule census:

| Script | What it does |
| --- | --- |
| `escape-hatch-census.cjs` | Parses every file (syntax only) and counts `any`, `unknown`, `!`, definite assignments, every kind of type assertion, `satisfies`, `@ts-*` comments and suppression comments, each classified by where it sits. Its `any` and `!` counts match the rule census's raw counts exactly. |
| `escape-hatch-linters.cjs` | Runs the same rules in Oxlint, ESLint (typescript-eslint, with type information for the calibration cases) and Biome, on `calibration/escape-hatches/` and on the raw mirror, and records every line where Biome disagrees. |
| `typed-census.cjs` | For repos that type-check without installing anything (zod, hono), runs typescript-eslint's type-aware rules and joins `no-unsafe-type-assertion` and `no-unnecessary-type-assertion` to each assertion site. It records the TypeScript diagnostics first, so unresolved types can't silently become `any`. |
| `sample-escape-hatches.cjs` | Draws a seeded sample of `any` and `!` sites, 12 per repo, and writes a classification worksheet with code context and permalinks. |
| `escape-hatch-tables.cjs` | Generates `results/type-escape-hatches/tables.md` from all of the above plus the hand classifications. |

```sh
T=type-escape-hatches
node research/corpus/scripts/rule-census.cjs --topic $T --focus typescript/no-explicit-any,typescript/no-non-null-assertion,typescript/ban-ts-comment
node research/corpus/scripts/escape-hatch-census.cjs --topic $T
node --max-old-space-size=8192 research/corpus/scripts/escape-hatch-linters.cjs --topic $T --calibration --corpus
node --max-old-space-size=8192 research/corpus/scripts/typed-census.cjs --topic $T --repos zod,hono
node research/corpus/scripts/sample-escape-hatches.cjs --topic $T
node research/corpus/scripts/escape-hatch-tables.cjs --topic $T
```

The method, findings and caveats are in `corpus/results/type-escape-hatches/REPORT.md`.

### Floating promises and async mistakes (third post)

The async scripts build on the rule census and add the first type-aware census of the whole corpus. They're prefixed `async-`:

| Script | What it does |
| --- | --- |
| `async-rule-inventory.cjs` | Lists the async and promise rules Ultracite's Oxlint (core, react, js-plugins), ESLint (core + type-aware, resolved with ESLint's own config resolver) and Biome presets turn on, and which need type information. |
| `async-census.cjs` | Parses every file (syntax only) and finds floating calls to same-file async functions, `.then`/`.finally` statements with no rejection handler, async functions passed straight to a call (by callee), `.map(async …)` by what happens to the array, `await` in loops, async functions without `await`, `void x;` statements, `.catch` handlers by what they do, and suppression comments naming an async rule. Its `await`-in-loop and async-without-`await` counts equal Oxlint's raw `no-await-in-loop` and `require-await` counts in every repo. |
| `async-typed-census.cjs` | Runs typescript-eslint's `no-floating-promises`, `no-misused-promises` and the other type-aware async rules with each repo's own tsconfig (project service), and the same rules in Oxlint's `--type-aware` mode (tsgolint). A probe rule reads the program typescript-eslint built for each file and records how many imports resolve, TypeScript's diagnostics, and the type of every bare call statement, so a repo whose dependencies don't resolve is measured but marked as a lower bound. |
| `async-repo-configs.cjs` | Records every line of each repo's root ESLint, Biome or Oxlint config that names one of these rules, with permalinks. |
| `async-linters.cjs` | Runs `calibration/floating-promises/` through the TypeScript compiler and Ultracite's Oxlint (type-aware), ESLint (core + type-aware) and Biome presets, plus Biome's nursery `noFloatingPromises`/`noMisusedPromises`. With `--corpus`, compares the shared syntactic rules on the raw mirror and records every line where Biome differs from Oxlint. |
| `async-detector-check.cjs` | Matches the syntactic detector's floating sites to typescript-eslint's, line by line, and records why the detector missed each typed hit. Detector-only sites are reviewed by hand in `results/floating-promises/detector-review.json`. Also compares Biome's inference-based rules with typescript-eslint. |
| `async-sample.cjs` | Draws a seeded sample (12 per repo) of floating-promise sites and `await`-in-loop sites, and writes worksheets with code context and permalinks. |
| `async-merge-labels.cjs`, `async-agreement.cjs` | Assemble `classifications.json` from the hand classification passes, then print a blind subset for a second rater (`--print`) and compute agreement (`--compute`). |
| `async-examples.cjs` | Copies the two agent-experiment subjects into `examples/floating-promises/` with their licenses, and checks they keep their violation when type-checked on their own. |
| `async-tables.cjs` | Generates `results/floating-promises/tables.md`. |
| `async-run-all.cjs` | Runs all of the above in order. |

```sh
bash research/corpus/scripts/clone.sh
node research/corpus/scripts/async-run-all.cjs   # ~7 min, most of it the typed census
```

Oxlint's type-aware mode needs `oxlint-tsgolint`, which is installed under `packages/cli`. The scripts find its platform binary and pass it through `OXLINT_TSGOLINT_PATH`. tsgolint refuses a tsconfig that names a `types` package that isn't installed, so on clones without `node_modules` it lints nothing type-aware in zod, tRPC, Next.js and VS Code. typescript-eslint carries on, which is why it's the reference here.

Biome's inference-based rules only work when the config sits at the root of the linted files. With `--config-path` pointing elsewhere they report nothing, so `async-linters.cjs` copies its config into the directory it lints and removes it afterwards.

The hand labels (`classifications.json`), the detector review (`detector-review.json`) and the history search (`history.json`) are inputs, not outputs. The method, findings and caveats are in `corpus/results/floating-promises/REPORT.md`.

### Security rules (fourth post)

The security-rule scripts build on the rule census. They share `security-lib.cjs`, which holds the catalogue of security rules (what each detects, as the calibration measured it) and loads Ultracite's presets for all three linters.

| Script | What it does |
| --- | --- |
| `security-inventory.cjs` | Reads the Oxlint (core, react, js-plugins), ESLint (core, type-aware, react) and Biome (core, react, plus Biome's recommended set) presets and records, for every security rule, which presets turn it on and whether it needs types. `--print-focus` lists the Oxlint names for the census. |
| `security-census.cjs` | Runs `rule-census.cjs` with the core, react and js-plugins presets, focused on every security rule they enable. |
| `security-linters.cjs` | `--calibration` runs the cases in `calibration/security-rules/` through each linter as Ultracite configures it: Oxlint default, with core's `env` re-declared on the root, with js-plugins, with `--type-aware`; ESLint untyped and type-aware; Biome, plus the Biome rules Ultracite leaves off. `--corpus` runs the security rules in ESLint and Biome on the census's raw mirror. Exports the runners. |
| `security-sink-census.cjs` | Parses every file (syntax only) and records each security sink: eval and the Function constructor (including aliases), string timers, `node:vm`, HTML writes, `dangerouslySetInnerHTML`, script elements, `javascript:` strings, cookie writes, `Math.random()`, `target="_blank"`, `window.open`, secret-looking strings and IP literals. Each site is joined to the security-rule diagnostics on its lines. |
| `security-sample.cjs` | Writes the classification worksheets and `sample.json` (every sink, plus a seeded sample of Biome `noSecrets` hits). `--print` prints the blind second-rater subset, `--compute` writes agreement into `classifications.json`. |
| `security-advisories.cjs` | Fetches the published GitHub advisories for the eight projects with `gh api`, both repository advisories and the global database by npm package. De-duplicates them and joins the hand labels from `advisory-classifications.json`. |
| `security-advisory-fixes.cjs` | For 25 fix commits (every XSS fix with a linked commit, the injection, ReDoS and a few contrast cases), downloads the changed files before and after the fix and lints both. |
| `security-examples.cjs` | Lints the agent-experiment subjects in `examples/security-rules/` and writes what fires to `examples.json`. |
| `security-tables.cjs` | Generates `results/security-rules/tables.md`. |

```sh
T=security-rules
node research/corpus/scripts/security-inventory.cjs --topic $T
node research/corpus/scripts/security-census.cjs --topic $T
node --max-old-space-size=8192 research/corpus/scripts/security-linters.cjs --topic $T --calibration --corpus
node research/corpus/scripts/security-sink-census.cjs --topic $T
node research/corpus/scripts/security-sample.cjs --topic $T --worksheet
node research/corpus/scripts/security-advisories.cjs --topic $T --fetch --build      # needs gh and the network
node --max-old-space-size=8192 research/corpus/scripts/security-advisory-fixes.cjs --topic $T   # needs gh
node --max-old-space-size=8192 research/corpus/scripts/security-examples.cjs
node research/corpus/scripts/security-tables.cjs --topic $T
```

- **Running the js-plugins preset.** `rule-census.cjs` runs it unchanged. The sonarjs, github and react-doctor plugins load from the root `node_modules`, and Oxlint applies them to every file. Type-aware Oxlint (`typescript/no-implied-eval`) needs `OXLINT_TSGOLINT_PATH`, which `security-linters.cjs` sets from the installed `oxlint-tsgolint`. It runs on the calibration cases only.
- **ESLint uses Ultracite's own preset modules.** The `ignores` block is dropped, because it ignores `build/` and `out/` and would skip `packages/next/src/build` and the mirror. Rules are filtered to the security set for the corpus run.
- **Advisories change over time.** `--fetch` writes the raw responses to `out/security-rules/advisories/` (gitignored), with the fetch date. New advisories show up in `advisories.json` as `unlabelled` until they're added to `advisory-classifications.json`.

The method, findings and caveats are in `corpus/results/security-rules/REPORT.md`.

## Agent experiment

What it does: takes a real function from the corpus, lints it with one rule, and builds the prompt and diagnostics file with Ultracite's own `buildPrompt` and `writeDiagnosticsFile` (imported from `packages/cli/src/agent-fix/prompt.ts`). It then runs the agent CLI with the arguments in `packages/cli/src/agent-fix/agents.ts`, and the run fails if they've drifted. Afterwards it measures whether the error cleared, the score of every function before and after, whether behavior was preserved, and whether the agent tried to suppress the rule or change config. Behavior is checked against the original on thousands of inputs, and for `s2` by comparing helper call traces. The method, numbers and caveats for the first post are in `agent-experiment/results/cognitive-complexity/REPORT.md`.

From `research/agent-experiment/`:

```sh
node scripts/prepare-subjects.cjs                # build subjects/ from corpus/examples (scores stripped from the headers)
node scripts/test-behavior-harness.cjs           # self-test the behavior checker against harness-tests/
node scripts/run-batch.mjs s1:claude:1 s1:codex:1 # run and measure each spec, one at a time
node scripts/aggregate.cjs                       # results/<topic>/results.json
node scripts/report-tables.cjs > results/cognitive-complexity/tables.md
```

`run-batch.mjs` needs `claude` and `codex` on your PATH and signed in, and it spends real money. In the first post's runs, Claude Code cost $0.30–0.33 a run and Codex used 20–35k tokens; each run took 24–83 s. Runs happen in `$TMPDIR/ultracite-agent-experiment/<topic>/` (override with `AGENT_EXPERIMENT_RUN_ROOT`). While an agent runs, this harness's own folders and every other run are locked (`chmod 000`), then restored. Your user-level agent config (plugins, MCP servers, memory) still applies, so note it in the post's caveats.

Each run is copied back into `results/<topic>/runs/<id>/`:

- Committed: `prompt.txt`, the diagnostics JSON, `before.ts`, `after.ts`, `diff.patch`, `meta.json` and `measure.json`.
- Gitignored: `transcript.jsonl`, `stdout.txt` and `stderr.txt`.

`measure.cjs` re-measures a run from the committed files. Without the session log it carries the session-derived fields (cost, tokens, tool calls, exposure) over from the run's existing `measure.json`, so a fresh checkout reproduces `results.json` exactly, without running any agent again.

### Topics

Each post's agent experiment is a topic. `RESEARCH_TOPIC` picks it (default `cognitive-complexity`), and `scripts/topics/<topic>.cjs` supplies what's specific to it: subjects, the lint whose diagnostics the agent gets, files the subject needs next to it (such as a `tsconfig.json`), extra paths to lock while an agent runs, and optionally its own `prepareSubjects`, `measure`, `aggregate`, `tables` and `selfTest`. The interface is documented in `scripts/topics.cjs`. The shared scripts (`run-one.mjs`, `run-batch.mjs`, `measure.cjs`, `aggregate.cjs`, `report-tables.cjs`, `prepare-subjects.cjs`, `test-behavior-harness.cjs`) are the same for every topic. When a topic module doesn't provide a hook, they run the original cognitive-complexity code. Session-log parsing (cost, tokens, tool calls, exposure) is shared in `scripts/session-stats.cjs`.

To add a topic: put its subjects in `corpus/examples/<topic>/`, write `scripts/topics/<topic>.cjs` and a behavior oracle, add hand-made mutants under `harness-tests/<topic>/`, and run the commands below with `RESEARCH_TOPIC=<topic>`.

### Floating promises (third post)

Subjects are `fp1` (hono's `createPool`, `no-misused-promises`) and `fp2` (Astro's `compose` logger, `no-floating-promises` ×2), from `corpus/examples/floating-promises/`.

- **Lint.** typescript-eslint with type information (project service, the subject's own tsconfig, copied into the run directory) and both promise rules at Ultracite's defaults.
- **Oracle.** `scripts/topics/floating-promises-behavior.ts` runs the original and the agent's file on a virtual clock. It compares the happy path on about 400 generated scenarios each, and records the error path: does a failure reach the caller, hang, or become an unhandled rejection?
- **Extra measurements.** Each run also gets a silencing scan (`void`, what each `.catch` handler does, suppressions, type changes) and the rules Ultracite's full ESLint and Oxlint presets add after the edit.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=floating-promises
node scripts/prepare-subjects.cjs        # subjects/floating-promises/ (analysis lines stripped from the headers)
node scripts/test-behavior-harness.cjs   # oracle self-test, 21 cases -> results/floating-promises/oracle-self-test.json
node scripts/run-batch.mjs fp1:claude:1 fp1:codex:1 fp2:claude:1 fp2:codex:1   # ...4 of each
node scripts/aggregate.cjs               # results.json; also runs the oracle on the originals and the hand-made reference fixes
node scripts/report-tables.cjs > results/floating-promises/tables.md
```

In this post's runs, Claude Code cost $0.27–0.48 a run and Codex used 15–19k tokens; each run took 17–69 s, and measuring one takes about 10 s. While an agent runs, the corpus's floating-promises examples, results, calibration, output and `async-examples.cjs` are locked as well, because they describe the expected fixes. The method, numbers and caveats are in `agent-experiment/results/floating-promises/REPORT.md`.

Harness changes made with this topic, all backwards-compatible:

- the cognitive-complexity measurement and `results.json` still reproduce exactly;
- session logs are found by the run directory's real path too, since macOS's `$TMPDIR` resolves through `/private`;
- other runs' staging folders are locked during a run;
- emails and the macOS per-user temp root are redacted from committed artifacts.

### Security rules (fourth post)

Subjects are `s1` (Vite's `evalValue`, `no-new-func` + `sonarjs/code-eval`) and `s2` (Next.js `Script`'s `beforeInteractive` branch with `htmlEscapeJsonString`, `react/no-danger` ×2), from `corpus/examples/security-rules/`. Both inputs are safe: s1 evaluates the developer's own options text, and s2's script body is JSON that has been HTML-escaped.

- **Lint.** Ultracite's ESLint core + react presets, unchanged, with the output filtered to the corpus inventory's security rules (`corpus/results/security-rules/inventory.json`). That's every security rule that fires, in the shape Ultracite's ESLint adapter produces.
- **Re-lint.** Each result is re-linted with:
  - the same lint, honoring and ignoring inline config;
  - Oxlint core + react and core + react + js-plugins, with the root config `ultracite init` writes, and once more with core's `env` re-declared (corpus report §7);
  - Biome with Ultracite's core + react presets;
  - every rule of all four presets, recording the rules that fire more after the edit.

  The generated Oxlint and Biome configs go in the gitignored `lint-configs/`, inside the repo, so the js-plugins specifiers resolve.

- **Oracle.** `scripts/topics/security-rules-behavior.ts`:
  - **s1.** Evaluates 113 inputs with the original and the agent's file. The tiers are real option strings, other static JavaScript, invalid input, shadowed names and adversarial input. In the adversarial tier, `process.exit` and the like are stubbed, side effects go to a probe and the environment carries a canary. s1 runs under Bun and again under Node.
  - **s2.** Renders 266 prop sets with `renderToStaticMarkup` (React 19.3.0) and compares the markup byte for byte. It also runs the script body in a vm and compares the queued payload, checks for `</script>` breakouts, and wraps React's `createElement`/JSX runtime to see which prop carried the body.
- **Extra measurements.**
  - A static scan for constructs that keep the capability: `Function` aliases, `.constructor` calls, computed `eval`, `vm`, `Reflect`, `createElement` or spread `dangerouslySetInnerHTML`, DOM HTML sinks, refs and effects, and suppressions.
  - Typecheck with React's types.
  - For runs over Ultracite's 5-minute timeout, the file at 300 s, rebuilt from the session log and checked again.
  - `aggregate` also puts 18 hand-made rewrites and evasions through every linter (the evasion matrix).

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=security-rules
node scripts/prepare-subjects.cjs        # subjects/security-rules/ (analysis, rule and behavior lines stripped from the headers)
node scripts/test-behavior-harness.cjs   # oracle self-test, 20 cases (s1 under Bun and Node) -> results/security-rules/oracle-self-test.json
SECURITY_RULES_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs s1:claude:1 s1:codex:1 s2:claude:1 s2:codex:1   # ...4 of each
node scripts/aggregate.cjs               # results.json, including the evasion matrix (~2 min)
node scripts/report-tables.cjs > results/security-rules/tables.md
```

`SECURITY_RULES_EXTRA_LOCKS` is optional: colon-separated paths outside the repo that describe the expected fixes (an orchestrating session's notes, say), locked with everything else and recorded as `<outside-repo>/<name>`.

In this post's runs, Claude Code cost $0.36–1.53 a run (median $0.41) and Codex used 20.6k–33.9k tokens. Runs took 33–349 s, measuring one takes about 12 s, and two Claude runs went past Ultracite's 5-minute agent timeout. While an agent runs, these are locked as well: the corpus's security-rules examples, results, calibration and output; the `security-*.cjs` corpus scripts; the post draft and its page; and `plans/`. The method, numbers and caveats are in `agent-experiment/results/security-rules/REPORT.md`.

Harness changes made with this topic, all backwards-compatible:

- `run-one.mjs` names a `.tsx` subject's copies `before.tsx` and `after.tsx`; `.ts` subjects still get `before.ts` and `after.ts`;
- `run-one.mjs` records a lock path outside both the repo and the run root as `<outside-repo>/<name>`;
- `lib.redact` also replaces the OS account name as a whole word, which an agent's `ls -l` output can print;
- `lint-configs/` is gitignored;
- the cognitive-complexity and floating-promises measurements, tables and `results.json` still reproduce exactly from their committed runs.
