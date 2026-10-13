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

### Dead code and duplication (fifth post)

The dead-code scripts build on the rule census. They share `dead-code-lib.cjs`, which defines what counts as a dead-code or duplication rule (unused names, dead values, unreachable code, the `no-useless-*` family, duplication) and holds the runners for Ultracite's Oxlint, ESLint and Biome presets and the TypeScript compiler. The runners keep each linter's exact message and help text, because that's what `ultracite fix --claude/--codex` hands an agent.

| Script | What it does |
| --- | --- |
| `dead-code-inventory.cjs` | Reads the Oxlint (core, react, js-plugins), ESLint (core, react, type-aware, resolved per file type with `calculateConfigForFile`) and Biome (core, react, plus Biome's recommended set) presets and records every dead-code and duplication rule they turn on, its options, test-file overrides, whether it needs types, and its fix kind. It also lines up each concept across the three linters and TypeScript. `--print-focus` lists the Oxlint names for the census. |
| `dead-code-census.cjs` | Runs `rule-census.cjs` with core, react and js-plugins, focused on every dead-code and duplication rule they enable. |
| `dead-code-linters.cjs` | `--calibration` runs `calibration/dead-code/` through Oxlint (as `ultracite init` wires it, and with js-plugins), ESLint (core, untyped and type-aware), Biome (core) and `tsc --noUnusedLocals --noUnusedParameters`, and keeps every message, help text, ESLint suggestion and Biome terminal note. `--autofix` records what each linter's own fix pass changes in each case. That pass is what `ultracite fix` runs before an agent sees anything: `oxlint --fix`, `eslint --fix`, `biome check --write`, and with `--unsafe`, `oxlint --fix-dangerously` and `biome check --write --unsafe`. `--corpus` runs the same rules in ESLint and Biome on the census's raw mirror and records every line where the linters disagree. |
| `dead-code-disagreements.cjs` | Explains each of those disagreements from the code on the line: a `_` prefix, a parameter before a used one, a rest sibling, a catch binding, `satisfies` statements, initializers, type imports. |
| `dead-code-typed.cjs` | Type-checks every TypeScript file with its nearest tsconfig plus `noUnusedLocals`, `noUnusedParameters`, `allowUnreachableCode: false` and `allowUnusedLabels: false`, records what each repo's own tsconfigs set, and compares TypeScript's diagnostics with the lint rules by file, line and name. |
| `dead-code-exports.cjs` | Builds one TypeScript program per repo (the measured package, its tests and sibling packages; no `node_modules`) and resolves every reference to every export. Workspace package names and `dist/` paths are mapped back to source. Classifies each export (used in source, public API from `package.json` entry points, used elsewhere, loaded by name, used only in its own file, unreferenced) and each file. Not run for Next.js and VS Code, whose clones are sparse. |
| `dead-code-clones.cjs` | A token clone detector on typescript-estree tokens: Type-1 and Type-2 (identifiers and literals normalized), maximal clone classes of at least 50 tokens and 5 lines (jscpd's defaults; 100 tokens as a sensitivity check), plus whole-function and branch clones. It covers source, tests and vendored code, and joins the function and branch clones to the sonarjs rules' hits. |
| `dead-code-markers.cjs` | Suppression comments naming these rules, `void x;` and `x;` statements, `_`-prefixed bindings by kind, and each repo's own config lines for these rules. |
| `dead-code-sample.cjs` | `--worksheet` draws the seeded samples (unused names, dead stores, clones, candidate unused exports) and writes worksheets with code context and permalinks. The sample is then frozen in `sample.json`: reruns rewrite the worksheets from it, and `--resample` draws again. `--print` prints the blind second-rater subset, and `--compute` writes agreement into `classifications.json`. |
| `dead-code-merge-labels.cjs` | Assembles `classifications.json` from the hand classification passes, with the codebooks and shares weighted by repo population. |
| `dead-code-history.cjs` | For each confirmed historical bug in `history.json`, downloads the files at the fix's parent commit with `gh api` (falling back to `raw.githubusercontent.com` when the API is rate-limited) and lints them with all three linters and `tsc`, recording which rules fire on the buggy lines. |
| `dead-code-examples.cjs` | Lints the agent-experiment subjects in `examples/dead-code/` and writes what fires to `examples.json`. |
| `dead-code-tables.cjs` | Generates `results/dead-code/tables.md`. |
| `dead-code-run-all.cjs` | Runs all of the above in order. |

```sh
bash research/corpus/scripts/clone.sh
node research/corpus/scripts/dead-code-run-all.cjs   # ~6 min; --skip-history skips the gh downloads
```

- **Raw mode matters here.** The census's raw mirror neutralises `eslint-`/`oxlint-disable` comments only. `biome-ignore` and `@ts-expect-error` comments aren't touched, and `dead-code-markers.cjs` counts them instead.
- **ESLint and Oxlint don't share `no-unused-vars` defaults.** Ultracite sets no options in either. typescript-eslint's defaults have no ignore patterns, while Oxlint's skip `_`-prefixed names, so the two report different sets on the same code (`disagreements.json`).
- **The unused-export analysis needs no installs.** TypeScript resolves modules from tsconfig `paths` and relative imports. A fallback maps workspace package names through their `package.json` `exports`, and maps relative imports of `dist/` back to `src/`. Each repo's resolution rate is recorded. Imports of third-party packages don't resolve, and that doesn't matter for whether the repo's own exports are used.
- **The clone detector matches the rule.** Restricted to what `sonarjs/no-identical-functions` looks at (same file, identical bodies of 3 or more lines, its node kinds), it predicts the rule's 25 hits exactly.
- **Hand inputs.** The label files the classification passes write go to `out/dead-code/labels-*.json` (gitignored). `classifications.json` keeps them all, with both raters, so `tables.md` regenerates without them. `history.json` and `decision-history.json` are hand inputs too.

The method, findings and caveats are in `corpus/results/dead-code/REPORT.md`.

### Import cycles and barrel files (sixth post)

The import-cycles scripts build on the rule census and on the whole-program TypeScript analysis of `dead-code-exports.cjs`. They share `import-cycles-lib.cjs`, which holds the topic's paths, the module resolution used to build each repo's file graph (TypeScript's own, then workspace package names and `dist/` paths mapped back to source), and runners for Ultracite's Oxlint, ESLint and Biome presets. The Oxlint runner keeps each diagnostic's `note`, where `import/no-cycle` prints the cycle path; Ultracite's agent handoff keeps it in the diagnostic's `raw` object.

| Script | What it does |
| --- | --- |
| `import-cycles-inventory.cjs` | Reads the Oxlint (core, react, js-plugins), ESLint (core, react, type-aware, resolved with `calculateConfigForFile`) and Biome (core, type-aware) presets and records every import-graph rule: cycles, self-imports, barrels and re-exports, namespace imports, restricted imports, type-only imports. For each: options, defaults (Oxlint's `configuration_schema.json`), whether it reads other modules, whether it needs types or Biome's project scanner, and ESLint's resolver settings. |
| `import-cycles-census.cjs` | Runs `rule-census.cjs` with core, react and js-plugins, focused on the import-graph rules those presets enable. |
| `import-cycles-graph.cjs` | Builds one TypeScript program per repo and records every import-like statement: kind (import, namespace, side-effect, `export … from`, `export *`, `export * as`, `import()`, `require()`), whether it's type-only, and whether it survives `ts.transpileModule` with the repo's own `verbatimModuleSyntax`. From that it computes strongly connected components under six edge models (all static edges, each linter's, runtime, runtime plus lazy loads), classifies every runtime cycle and every Oxlint report's cycle path (type-only, barrel-induced, top-level-use, late-use; the top-level detector follows top-level calls through local functions and classes), and measures barrels, what a consumer loads through an internal barrel versus directly, `export *` chains, namespace imports by use, and the `import type` and lazy edges that already keep cycles out of runtime. It also runs Oxlint and checks that the graph predicts every `import/no-cycle` report. |
| `import-cycles-linters.cjs` | `--calibration` runs `calibration/import-cycles/` (one directory per case) through Oxlint (core + react, and with js-plugins), ESLint (core, and core + react) and Biome (core + type-aware, and core), with every message, help text and note. `--autofix` records what each fix pass does to the cases and whether cycle reports change. `--corpus` runs ESLint's import rules on each clone in a fresh process started in the clone root, and Biome's on a copy of every file the graph loaded, then matches every cycle report against a model of that linter: a step-by-step simulation of `import-x/no-cycle`, and Biome's edge rules. It also runs `oxlint --fix` on a copy of each repo and recounts the cycle reports, applies `unicorn/prefer-export-from`'s dangerous fix alone and compares every file's exported names, and runs the ESLint process-state experiment. |
| `import-cycles-history.cjs` | For each confirmed bug in `history.json`, downloads the cycle's files at the fix's parent commit with `gh api` (or `raw.githubusercontent.com`) and lints them with all three cycle rules. |
| `import-cycles-sample.cjs` | `--worksheet` draws the seeded sample of Oxlint reports (frozen in `sample.json`) and writes a worksheet without the automatic labels; `--print` writes the blind subset for the second rater; `--compute` writes `classifications.json` with both raters, agreement and κ, including against the automatic labels. |
| `import-cycles-examples.cjs` | Lints the agent-experiment subjects in `examples/import-cycles/` with all three linters and `tsc`, and checks the behaviour their headers claim by running transpiled copies of the subjects (never a clone): subject A's import-order TDZ, and which modules subject B's importers load through the barrel and directly. |
| `import-cycles-tables.cjs` | Generates `results/import-cycles/tables.md`. |
| `import-cycles-run-all.cjs` | Runs all of the above in order. |

```sh
bash research/corpus/scripts/clone.sh
node research/corpus/scripts/import-cycles-run-all.cjs   # ~6 min; --skip-history skips the gh downloads
```

- **The graph predicts the linters exactly.** Oxlint's 996 `import/no-cycle` reports match the graph's Oxlint edge model one for one. ESLint's 545 match the import-x simulation, and Biome's 1,168 match its model except for 45 edges Biome doesn't resolve (tsconfig path aliases and `..` imports). If a rerun disagrees, a tool version or the resolution changed.
- **Run ESLint's cycle rule in a fresh process per project.** In one process, linting another repo first lowers Excalidraw's count from 241 to 222 (`eslintState` in `linters.json`). Run it from the project root, too: when `eslint-import-resolver-typescript` can't be found from the linted directory, the rule reports nothing and prints no warning.
- **Biome's project rules need its config at the root of the linted files**, and Ultracite's Biome preset ignores `**/out`. So Biome lints copies under the system temp directory (`ultracite-research-import-cycles/`). ESLint's copies stay under the gitignored `out/import-cycles/`, because its resolver packages are looked up from the project directory.
- **Raw mode undercounts the module-graph rules.** The census's raw mirror holds only the corpus files, without tsconfig, package.json or other files, so its `import/no-cycle` count (953) is lower than reported (996) for resolution reasons. The corpus has no disable comment naming these rules.
- **Hand inputs.** The rater labels go to `out/import-cycles/labels-*.json` (gitignored), and `classifications.json` keeps both raters. `history.json` and `decision-history.json` are hand inputs too.

The method, findings and caveats are in `corpus/results/import-cycles/REPORT.md`.

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

### Dead code (fifth post)

Subjects are `dc1`, `dc2` and `dc3`, from `corpus/examples/dead-code/`:

- **dc1.** VS Code's `McpRegistry.resolveConnection` at the parent of microsoft/vscode#247184. A dead initializer, `let launch = definition.launch`, is the symptom of a bug: the extension resolver's `launch` is computed, then discarded, because substitution runs on `definition.launch`. Only ESLint's `no-useless-assignment` reports it. The right fix uses the value.
- **dc2.** Vite's `serveStaticMiddleware`. `fileUrl` is a refactor leftover, reported by `no-useless-assignment` and `sonarjs/no-dead-store`. The right fix deletes it.
- **dc3.** tRPC's `filterIgnored` (corpus sample u036). `stderr` is a leftover local that Oxlint's default `no-unused-vars` reports: "Variable 'stderr' is assigned a value but never used. Unused variables should start with a '_'.", help "Did you mean to use this variable?". The right fix deletes it.

`subjects.json` (`selection`) says why dc3 was chosen. In the corpus, every one of Oxlint's 75 "declared but never used" variable hits is a rest-sibling omit or a type parameter, so no real leftover gets the "Consider removing this declaration." help. u036 is the only hand-classified leftover local that Oxlint reports.

- **Lint.** The handoff is what Ultracite's adapter for the subject's linter produces (`packages/cli/src/agent-fix/linters.ts`), filtered to the corpus inventory's dead-code rules (`corpus/results/dead-code/inventory.json`, every category except duplication).
  - **dc1 and dc2 go through ESLint.** Ultracite's ESLint core preset, unchanged.
  - **dc3 goes through Oxlint.** The root config `ultracite init` writes, run from the file's directory as `ultracite fix` runs it from the project root, so the filename is relative. It's parsed with a copy of `parseOxlintDiagnostics`, whose source hash the topic checks against `linters.ts`.
  - **Only diagnostics that survive the safe fix pass** (`eslint --fix`, `oxlint --fix`) are handed over, because `ultracite fix` runs it first. This drops dc2's `no-useless-return`.
- **Re-lint.** Each result is re-linted with:
  - the same lint, honoring and ignoring inline config;
  - Oxlint core + react and core + react + js-plugins (the root config `ultracite init` writes);
  - ESLint core;
  - Biome's core preset;
  - `tsc` with `noUnusedLocals` and `noUnusedParameters`;
  - every rule of those presets, recording the rules that fire more after the edit.

  "Cleared" in a view means no dead-code diagnostic names the dead binding (`_`-prefixed included). The configs go in the gitignored `lint-configs/dead-code/`.

- **Oracle.** `scripts/topics/dead-code-behavior.ts` imports one file per process and prints a trace per scenario. The topic compares the traces.
  - **dc1: 1,920 scenarios** with stub services. It crosses collection, delegates, eight trust states, five resolver behaviors, substitution and origin. The verdict is "bug fixed" (identical to the #247184 fix), "bug kept" (identical to the original) or "broken".
  - **dc2: 448 scenarios.** Seven alias configurations × 64 request URLs, comparing `next()`, the `req.url` rewrite, what reaches `serve`, and 403s.
  - **dc3: 66 scenarios.** execa results and rejections, `VERBOSE`, and file lists, from a fixed cwd, comparing execa calls, log calls and return values.
- **Extra measurements.**
  - A scan of the dead binding (declared, renamed, read, written, `void`), suppressions and subject markers.
  - What each linter's fix pass does to the pristine subjects (`aggregate`).
  - A matrix of 22 hand-made mutants through every linter.
  - Ultracite's own re-lint partition (cleared, still, new: `diff.ts`).
  - A typecheck with the corpus examples' tsconfig.
  - The 5-minute timeout replay from the security topic. No run needed it.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=dead-code
node scripts/prepare-subjects.cjs        # subjects/dead-code/ (examples.json stripFields removed, plus "the parent of the fix")
node scripts/test-behavior-harness.cjs   # oracle self-test, 23 cases -> results/dead-code/oracle-self-test.json
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs dc1:claude:1 dc1:codex:1 dc2:claude:1 dc2:codex:1 dc3:claude:1 dc3:codex:1   # ...4 of each
node scripts/aggregate.cjs               # results.json, with the fix pass and the mutant matrix (~2 min)
node scripts/report-tables.cjs > results/dead-code/tables.md
```

Pass each spec as its own argument. A spec string with spaces in it becomes one run with a strange id: that happened once here (see REPORT.md).

**Cost and time.** In this post's runs, Claude Code cost $0.21–0.32 a run (median $0.26, $3.22 in all) and Codex used 15.3k–31.2k tokens. Runs took 10–81 s, and measuring one takes about 10 s.

**Locks.** While an agent runs, these are locked as well:

- the corpus's dead-code examples, results, calibration and output;
- the `dead-code-*.cjs` corpus scripts;
- `research/bibliography/dead-code.md`;
- any post draft or page whose name contains "dead" or "duplicat";
- `plans/` and `lint-configs/`;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`, the outside-repo paths:
  - the orchestrating session's scratch files about this topic, including its post-draft folder;
  - `plans/issues.md` in the main checkout;
  - the batch log.

The method, numbers and caveats are in `agent-experiment/results/dead-code/REPORT.md`.

Harness changes made with this topic, all backwards-compatible:

- `run-one.mjs` uses a topic's optional `toDiagnostics(lintResult)` hook, falling back to the ESLint adapter's shape.
- `run-one.mjs` resolves a relative diagnostics path from the run directory, as Ultracite resolves Oxlint's relative filenames from the project root. ESLint's absolute paths are unaffected.
- `run-one.mjs` locks the paths in `AGENT_EXPERIMENT_EXTRA_LOCKS` (colon-separated) for every topic. The security topic's `SECURITY_RULES_EXTRA_LOCKS` still works.
- `topics.cjs` documents both changes, and the `.gitignore` comment for `lint-configs/` names this topic.
- **Earlier topics, re-measured and re-aggregated from their committed runs:**
  - cognitive-complexity and floating-promises reproduce exactly, apart from `generatedAt`;
  - security-rules reproduces, except Biome's full-preset counts for the s2 runs and three mutants. Commit c9b606af enabled `noUndeclaredDependencies` in Biome core after those runs were measured, and it fires on the staged files' `react` and `json5` imports. The same difference appears without this topic's harness changes, and the committed files were left as they were.

### Import cycles and barrel files (sixth post)

Ultracite's agent prompt says "Edit only the file above. Do not create, delete, or modify any other file." The right fix for both subjects needs other files: for a cycle, the shared module that Oxlint's help suggests; for a barrel, edits to its importers. The experiment measures what agents do instead.

Subjects are multi-file, from `corpus/examples/import-cycles/`:

- **ica.** Astro's dev-toolbar `settings.ts` ↔ `ui-library/window.ts` (with a stub), a two-file cycle with a value read during module evaluation: importing `window.ts` first with a placement configured throws "Cannot access 'placements' before initialization".
  - **Handoff:** Oxlint's default `import/no-cycle` reports both files, so `ultracite fix` hands over both, one agent run each, in the order Oxlint first prints them. That order varies between runs (Oxlint lints in parallel): `settings.ts` first in 64 of 100 lints. Every run used `settings.ts` → `window.ts`.
  - **The second run gets stale diagnostics.** Ultracite collects every file's diagnostics once, before the first agent runs (`packages/cli/src/agent-fix/index.ts`), so `window.ts` is handed a cycle that step 1 may already have broken.
- **icb.** Astro's internal `core/cookies/index.ts` barrel, with `cookies.ts`, `response.ts`, two of its nine importers and stubs.
  - **Handoff:** Biome core's `noBarrelFile`, through Ultracite's Biome adapter. Oxlint's default presets report nothing; ESLint's `unicorn/no-barrel-files` reports the same file (recorded in `results.json`, not run).

**Lint.** The handoff is what Ultracite's adapter for the subject's linter produces, from the root config `ultracite init` writes, run from the project root over the whole subject. It's filtered to the corpus inventory's import-graph rules (`corpus/results/import-cycles/inventory.json`) that survive the linter's safe fix pass. The Oxlint and Biome parsers and `groupByFile` are copies, hash-checked against `packages/cli/src/agent-fix/` on every handoff.

**Measurement.** Each run is measured on the whole subject directory after each step and at the end:

- the cycle and barrel rules, and every other import-graph rule, in Oxlint core + react, Oxlint + js-plugins, ESLint core and Biome core + type-aware, honoring and ignoring inline config;
- every rule of those presets and `tsc`, recording the rules that fire more after the edit;
- a type-check of a stand-in for the subject's importers that aren't in it;
- Ultracite's own re-lint of each handed-over file (cleared, still, new);
- a static scan of the import graph and suppressions;
- every file created, changed or deleted in each step (`run-one.mjs`).

**Oracle.** `scripts/topics/import-cycles-behavior.mjs` transpiles the directory, marks each module's evaluation, and runs every scenario in a fresh Node process.

- **ica: 12 scenarios.** Import order × configured placement × saved settings. The verdict is "hazard removed", "hazard kept" or "changed".
- **icb.** Which modules each importer evaluates, the barrel's exports and whether they're the same objects, and a functional probe of the importers' functions.
- **Self-test.** 19 cases (the originals and 17 hand-made mutants in `harness-tests/import-cycles/`), all as expected.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=import-cycles
node scripts/prepare-subjects.cjs        # subjects/import-cycles/ (stripFields and three phrases naming the analysis removed)
node scripts/test-behavior-harness.cjs   # oracle self-test, 19 cases -> results/import-cycles/oracle-self-test.json
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs ica:claude:1 icb:codex:1 ica:codex:1 icb:claude:1   # ...4 of each
node scripts/aggregate.cjs               # results.json, with the handoff by linter, the fix pass and the mutant matrix (~3 min)
node scripts/report-tables.cjs > results/import-cycles/tables.md
```

Oxlint and Biome print diagnostics in an order that varies between runs, so every list of hits is sorted. The handoff-order frequency (which file Oxlint prints first, over 100 lints) is random by nature: it's kept in `results/import-cycles/oxlint-order.json`, and `aggregate` measures it again only when that file is missing.

**Cost and time.** In this post's runs:

- Claude Code cost $0.34–1.02 a run (median $0.74, $5.90 for 8 runs). An ica run is two agent sessions.
- Codex used 40.0k–71.6k tokens a run.
- Runs took 31–169 s, and measuring one takes about 30–45 s.

**Locks.** While an agent runs, these are locked as well:

- the corpus's import-cycles examples, results, calibration and output;
- the `import-cycles-*.cjs` corpus scripts;
- `research/bibliography/import-cycles.md`;
- any post draft or page whose name contains "cycle", "barrel" or "import";
- `plans/` and `lint-configs/`;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`, 130 outside-repo paths: the orchestrating session's post-draft folder, literature notes and other scratch files about this topic and earlier ones, this experiment's notes, `plans/issues.md` in the main checkout, and the batch log.

The method, numbers and caveats are in `agent-experiment/results/import-cycles/REPORT.md`.

Harness changes made with this topic, all backwards-compatible:

- **Multi-file subjects.** `run-one.mjs` supports subjects whose manifest entry lists `files`:
  - the whole subject is copied into the run dir, keeping its folders;
  - the topic's `handoff(subject, runDir, { runId })` hook returns the files Ultracite would hand over, in order, with their diagnostics;
  - each file gets its own agent run in the same directory, with its diagnostics JSON written just before it, as Ultracite does;
  - every file's creation, change or deletion is recorded per step;
  - artifacts are laid out as `before/`, `after/`, `diff.patch` and `step<k>/` (prompt, per-step diff, and the intermediate tree).

  Single-file subjects take the same code path as before; the lock and agent-process code moved into functions without changing what they do.

- **Session logs.** The finders skip a log an earlier step already claimed.
- **`.gitignore`** also ignores `step*/` session logs, stdout and stderr.
- **`topics.cjs`** documents the multi-file hooks.
- **Measurement copies** for this topic are staged under the run root's real path. On macOS `$TMPDIR` is under `/var`, a symlink to `/private/var`, and eslint-plugin-import-x's `no-cycle` reports nothing when files are linted through a symlinked path.
- **Earlier topics, re-measured and re-aggregated from their committed runs:**
  - cognitive-complexity and floating-promises reproduce exactly, apart from `generatedAt`;
  - security-rules and dead-code: see `REPORT.md`, "Reproduce".
