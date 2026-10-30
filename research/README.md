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

### Accessibility rules (seventh post)

Only three of the eight corpus repos have JSX (Excalidraw, Next.js, tRPC: about 100,000 lines), so this topic extends the corpus for itself. `scripts/repos-accessibility.json` adds four React codebases, cloned shallow and sparse by `scripts/a11y-clone.sh` at pinned SHAs:

| Repo | What it is | Measured | License |
| --- | --- | --- | --- |
| shadcn-ui/ui | the copy-paste component registry | `apps/v4/registry/new-york-v4/{ui,blocks}` | MIT |
| radix-ui/primitives | accessibility-focused primitives | `packages/react` | MIT |
| adobe/react-spectrum | React Aria Components (hooks and spread props) | `packages/react-aria-components/src` | Apache-2.0 |
| supabase/supabase | Supabase Studio, an app on a shadcn-derived design system | `apps/studio/{components,pages}` | Apache-2.0 |

`repos.json` and every earlier topic's numbers are unchanged. The extra list is loaded only when `CORPUS_REPO_LISTS=repos-accessibility.json` is set (`a11y-lib.cjs` sets it). Two backwards-compatible changes make the shared scripts work with it:

- `collect-files.cjs` appends the repos of any list named in `CORPUS_REPO_LISTS` and exports the merged `config`.
- `rule-census.cjs` reads that `config` and takes `--files jsx`, which keeps only `.tsx`/`.jsx` files so that rates are per JSX line. No `.js`, `.mjs` or `.cjs` file in the corpus contains JSX (checked by parsing).

With the variable unset and no `--files`, both scripts produce identical results: an earlier topic's census was rerun with the old and new scripts on the same inputs, and only the order of per-hit rows differed, because Oxlint lints in parallel.

The scripts are prefixed `a11y-` and share `a11y-lib.cjs`. It defines the topic's accessibility rules: `jsx-a11y/*`, `astro/jsx-a11y/*`, Biome's `a11y` group, `github/a11y-*`, four sonarjs table/object rules, `react/button-has-type` (and Svelte's), the 102 rules react-doctor files under "Accessibility" in its own registry, and `svelte/valid-compile`. It also holds the concepts the linters share and runners for Ultracite's presets. The ESLint runner survives a rule crash: eslint-plugin-jsx-a11y's `prefer-tag-over-role` throws on one Supabase file.

| Script | What it does |
| --- | --- |
| `a11y-inventory.cjs` | Every accessibility rule per linter, preset and file type. Covers Oxlint's presets, ESLint resolved with `calculateConfigForFile` for `.tsx`, `.jsx`, `.js`, `.astro`, `.vue`, `.svelte`, Angular `.ts` and `.html`, and Biome's a11y group with `biome explain`. Records options, the concept table and the gaps. `--print-focus` lists the census's focus rules. |
| `a11y-census.cjs` | `rule-census.cjs` with core, react and js-plugins, `--files jsx`, over the seven repos with JSX. |
| `a11y-linters.cjs` | `--calibration`: `calibration/accessibility/cases.tsx` (87 cases and 42 cheap or right edits, each marked with its base case and whether it fixes the barrier), the same ten barriers in `.js`, `.jsx`, `.html`, `.vue`, `.svelte`, `.astro` and an Angular template, and the crash case. Each runs through Oxlint (init's root config, then with js-plugins), ESLint and Biome, with every message and the help the agent handoff carries. `--autofix`: what each fix pass does to each case, including Biome's unsafe-fix loop and a broken `<marquee>` fix. `--corpus`: ESLint and Biome on every JSX file, raw and reported. |
| `a11y-disagreements.cjs` | Maps every corpus report to its JSX element and describes the elements the linters disagree on: tag, role, spread, aria-hidden, labels. |
| `a11y-markers.cjs` | Suppression comments that name accessibility rules, with reasons, whether the rule still fires there, and each repo's own lint config lines. |
| `a11y-jsx-census.cjs` | What JSX rules can't see. Counts custom components against DOM elements, literal against dynamic accessibility props, spreads, and onClick on non-interactive elements and on components. Resolves interactive and labelled components to their definitions in the same repo. `--lint` runs two counterfactual lints: telling jsx-a11y what each component renders (`settings["jsx-a11y"].components`), and blanking spreads on DOM elements. |
| `a11y-sample.cjs` | The seeded sample (hit sites, counterfactual sites, every suppression), frozen in `sample.json`. `--worksheet`, `--print` (blind subset) and `--compute` (both raters, weighted shares, κ). |
| `a11y-history.cjs` | Downloads each confirmed fix's files at the parent commit (`gh api`, falling back to `raw.githubusercontent.com`) and lints them, raw and reported, with all three linters. |
| `a11y-examples.cjs` | Lints and type-checks the two agent-experiment subjects and runs their behaviour oracle on the subjects and on 20 hand-made variants (the evasion matrix on real code). The oracle uses React from the Bun store, a wrapped JSX runtime and synthetic key events; it needs no DOM. |
| `a11y-tables.cjs` | Generates `results/accessibility/tables.md`. |
| `a11y-run-all.cjs` | Runs all of the above in order. |

```sh
bash research/corpus/scripts/clone.sh && bash research/corpus/scripts/a11y-clone.sh
node research/corpus/scripts/a11y-run-all.cjs   # about 6 min; --skip-history skips the gh downloads
```

- **Copies outside `out/`.** Ultracite's Oxlint and Biome presets ignore `**/out`, so fix-pass and history copies are linted under the system temp directory (`ultracite-research-accessibility/`). Their Oxlint configs stay in the repo, so the js-plugins specifiers resolve.
- **Biome on the corpus** runs a dedicated config with exactly the a11y rules core sets, for the same reason. Calibration uses the presets themselves.
- **Astro.** eslint-plugin-astro loads eslint-plugin-jsx-a11y from `process.cwd()` when it is imported. The calibration loads the Astro preset from `packages/cli`, as it would load from a project where `ultracite init` installed it.
- **Biome's `--write --unsafe` can hang.** Biome 2.5.15 loops on `<div aria-activedescendant>`, so every Biome write takes a timeout, and the hang is recorded.
- **Hand inputs:** `history.json`, `history-verdicts.json`, `decision-history.json`, `barrier-match.json`, and the rater labels (`out/accessibility/labels-*.json`, kept in `classifications.json`).

The method, findings and caveats are in `corpus/results/accessibility/REPORT.md`.

### TODO comments and self-admitted technical debt (eighth post)

The TODO-comment scripts build on the rule census. They're prefixed `todo-` and share `todo-lib.cjs`, which holds the comment scanner (typescript-estree's `comments`, what ESLint's `getAllComments()` returns, so strings, template literals, identifiers and JSX text never count), what counts as a task marker and how each is written (owner, issue or PR, tracker key, date, version, condition), matchers that reimplement each rule from its source, and runners for Ultracite's presets that keep every message and help text.

The rules are `no-warning-comments` (Oxlint core, ESLint core), `sonarjs/todo-tag` and `sonarjs/fixme-tag` (Oxlint's opt-in js-plugins, ESLint core) and `unicorn/expiring-todo-comments` (ESLint core; Oxlint has no port). Biome has none: no rule in its schema or `biome explain` is about task markers, and its rules-sources page maps nothing to them.

The eight corpus repos are measured as in every topic, Ultracite's CLI separately, and the four React codebases from the accessibility post (`repos-accessibility.json`, all source files rather than only `.tsx`) as a separate set, because Supabase Studio is the only application code in either list.

| Script | What it does |
| --- | --- |
| `todo-census.cjs` | Every comment in every corpus file, and every occurrence of TODO, FIXME, XXX, HACK, BUG, NOTE, OPTIMIZE, REVIEW, TBD, "to do" and JSDoc `@todo`, classified as a marker, prose or embedded (`definitions` in the output). For each marker: where it sits in its comment, case, decoration, what follows it, the comment kind (line, block, JSDoc, JSX, trailing), and its format: `TODO(person)` against `TODO(topic)` (persons are commit authors in the history clone), `TODO@name`, issue and PR references, tracker keys, URLs, dates, versions, conditions (strict and loose), area tags such as `TODO-APP`, unicorn's `[conditions]`, and whether it's bare. |
| `todo-inventory.cjs` | The rules per linter and preset: every Oxlint preset (top level and overrides) and `oxlint --rules`; ESLint core, core + react and core + type-aware resolved with `calculateConfigForFile`, with each rule's meta; Biome's 565 schema rules and `biome explain`, and Biome's rules-sources page (fetched once with `gh api`, `--fetch`). |
| `todo-rule-census.cjs` | `rule-census.cjs` with core, react and js-plugins over the eight repos and Ultracite, focused on the three Oxlint rules and `no-inline-comments`. |
| `todo-linters.cjs` | `--calibration`: `calibration/todo-comments/cases.tsx` (77 cases, with a `package.json` that gives unicorn a version, a dependency and an engine) through Oxlint (init's root config, then with js-plugins), ESLint core + react (inline config ignored and honoured) and Biome core, with every message and the help the handoff carries. `--autofix`: what each fix pass does to the cases' comments. `--corpus`: the focus rules on every file of all thirteen repos, raw and reported, every diagnostic joined to its comment and marker, and the matchers checked against the real rules comment by comment. |
| `todo-markers.cjs` | Each repo's own lint configs at its pinned commit (lines naming these rules, and shared configs that would enable them implicitly), disable comments naming them, and markers inside or next to suppression comments. |
| `todo-issues.cjs` | The state of every GitHub issue or PR a marker references (`gh api`, read-only, cached with the fetch date), at the fetch date and at the pinned commit; candidate stale markers, joined to the hand verdicts in `stale-check.json`. |
| `todo-history-clone.sh` | Bare history clones under `repos/history/`: the six smaller repos without blobs over 1 MB; Next.js and VS Code with commits and trees only, then `git backfill --sparse` for the measured source directories. |
| `todo-history.cjs` | `--blame`: the age of every marker line at the pinned commit (`git blame -w -M`, with the repo's `.git-blame-ignore-revs`). `--survival`: every marker added or removed on the mainline in the measured package's source, in every layout it has had, tracked through moves, renames and rewordings, with Kaplan–Meier survival for markers added 2018–2024. `--classify`: what happened to the code around each removal, after Zampetti et al.: file deleted, enclosing function deleted, unchanged or changed. `--sample`: the stratified removal sample and its worksheet. |
| `todo-sample.cjs` | The two hand classifications: 102 markers at the pinned commits (type after Maldonado and Shihab, on hold after Maipradit et al., still valid, resolvable in its own file, changes behaviour, deleting it loses information) and the 89 removals (addressed, already done, dropped with the debt remaining, code deleted or moved, rewritten). `--worksheet`, `--print` (blind subsets of 36 and 30), `--compute` (both raters, weighted shares, κ). |
| `todo-agent-runs.cjs` | Marker lines added or removed in every committed agent-experiment run (net diff and each attempt's or step's own patch), per topic and agent. |
| `todo-oracle.cjs` | The behaviour oracle for the three subjects: transpiles a file, runs it in a fresh Node process against stubs, and returns a trace and a verdict. |
| `todo-examples.cjs` | Checks the subjects' verbatim blocks against their commits, lints and type-checks them, and runs the oracle on them and on 20 hand-made variants (the evasion matrix on real code). |
| `todo-tables.cjs` | Generates `results/todo-comments/tables.md`. |
| `todo-run-all.cjs` | Runs all of the above in order. |

```sh
bash research/corpus/scripts/clone.sh && bash research/corpus/scripts/a11y-clone.sh
bash research/corpus/scripts/todo-history-clone.sh     # about 3 min, 1.3 GB
node research/corpus/scripts/todo-run-all.cjs          # about 40 min, 33 of them history; --skip-history, --skip-gh, --skip-census
```

- **The matchers predict the rules exactly.** `todo-lib.cjs` reimplements `no-warning-comments` (ESLint 10.12.0's source; Oxlint documents the same options and defaults), `sonarjs/todo-tag` and `fixme-tag` (eslint-plugin-sonarjs 4.2.2) and the shape of comment unicorn can report. On the calibration and on every corpus comment they agree with ESLint and Oxlint; if a rerun disagrees, a tool version changed.
- **Raw mode and sonarjs.** The census's raw mirror rewrites `eslint-disable` to `xxxxxx-disable`, and sonarjs skips comments that start with `eslint-disable`, so Oxlint's raw sonarjs count includes four TODOs in disable reasons that no real run reports. ESLint's raw runs use `noInlineConfig` on the original files instead, and so does every per-marker table.
- **unicorn needs package.json.** `unicorn/expiring-todo-comments` reads the nearest `package.json`, so ESLint lints the clones in place (read only) rather than a mirror, whose nearest `package.json` would be this repo's.
- **The history step is slow on Next.js.** Blame and the removal classification follow files into older paths the backfill didn't cover, and git fetches those blobs one at a time (read-only).
- **History clones stay out of the corpus clones.** `todo-history-clone.sh` writes bare repos under `repos/history/`; `clone.sh` and every earlier topic's file lists are unchanged. Backfill needs cone-mode sparse patterns, which the script writes into each bare repo.
- **Hand inputs:** `stale-check.json` and `decision-history.json` (one rater), and the rater labels (`out/todo-comments/labels-*.json`, kept in `classifications.json`).
- **No shared script changed.** The topic only reads `collect-files.cjs`, `rule-census.cjs` (through `todo-rule-census.cjs`, with `CORPUS_REPO_LISTS` unset so the census pools the same eight repos) and `dead-code-lib.cjs`.

The method, findings and caveats are in `corpus/results/todo-comments/REPORT.md`.

### Sorting object keys (ninth post)

The sort-keys scripts are prefixed `sort-keys-` and share `sort-keys-lib.cjs`. It holds the topic's paths and repos, the three rules reimplemented from their sources (each linter's key names, comparator and grouping, Oxlint's fix conditions and the order each fix produces), the path-based matching that finds the same object before and after a fix, and runners for Ultracite's Oxlint, ESLint and Biome presets that keep every message and help text.

The rules are `sort-keys` (Oxlint core, with a fix that `oxlint --fix` applies; ESLint core, through `@eslint/js` `configs.all`, default options, no fix) and Biome's `useSortedKeys` (an assist source action that `biome check --write` applies). All three are off in the TanStack presets, and Biome's is off for `package.json`.

The eight corpus repos are measured as in every topic, Ultracite's CLI separately (it enforces the rule), and the four React codebases from the accessibility post (`repos-accessibility.json`) as a separate set. History and the merge simulation use the TODO post's history clones.

| Script | What it does |
| --- | --- |
| `sort-keys-inventory.cjs` | The rules per linter and preset: every Oxlint preset (and `oxlint --rules`, `configuration_schema.json`, `--print-config` of init's config), ESLint core, core + react, core + tanstack and core + type-aware resolved with `calculateConfigForFile`, Biome's core and tanstack assist actions with `biome explain`, this repo's own override, and the agent prompt's lines about behaviour and "Left for review". |
| `sort-keys-census.cjs` | Every object literal in every corpus file, through ESLint's own `Linter` and the TypeScript parser, with scope analysis: each key as each linter names it, key and value kinds, side effects, spreads, computed keys, comments and blank lines between keys; sorted under each comparator, ESLint's report count, Oxlint's fix blocker, the chance a random order is sorted; where the object goes (variables followed through their references, nested objects through the outermost literal) and every order-observing sink on the way; known order-sensitive shapes. Also counts object patterns, type literals, interfaces, enums and JSX attribute lists. |
| `sort-keys-linters.cjs` | `--corpus`: Oxlint's `sort-keys` alone, ESLint core filtered to `sort-keys` and Biome's `useSortedKeys` alone, on every file of all thirteen repos, raw and reported, every diagnostic joined to its object. The reimplementations must predict every raw report, object by object (they do), and every disagreement between linters is explained by names, grouping or comparator. |
| `sort-keys-calibration.cjs` | `calibration/sort-keys/` (80 cases: 55 shapes, 20 runnable behaviour cases and 5 inference cases) through Oxlint (init's config and `sort-keys` alone), ESLint core + react and Biome (core and the action alone), then through every fix pass and a hand sort by ESLint's grouping. Records key orders, where comments went and what's still reported, runs the behaviour cases in Node, type-checks the inference cases, and renders the style cases with React 19 and resolves them with Lightning CSS (both from the Bun store). |
| `sort-keys-fixes.cjs` | Both fixes on copies of every corpus file: objects rewritten, predicted against actual order, lines changed, objects skipped and why, convergence in one pass, where comments went (heading comments, commas), blank-line groups, keys across spreads, a parse of every fixed file, the static signs that the new order can change behaviour, and each repo type-checked with its own tsconfig before and after (an overlay; nothing installed). |
| `sort-keys-markers.cjs` | Each repo's lint and format configs at its pinned commit (`git show` on the history clones), sorting plugins in its `package.json` files, disable comments naming these rules, and each repo's sorted share. |
| `sort-keys-history.cjs` | `--events`: every mainline commit in the measured source, both versions of each modified file parsed with TypeScript, objects matched by an anchor of the names above them; where new keys went and whether the object was sorted before and after. `--merge`: for objects that gained keys in two commits, both insertions replayed as concurrent edits of the same base with `git merge-file`, at the authors' positions, at sorted positions and both appended, with and without trailing commas. Missing blobs are never fetched (`GIT_NO_LAZY_FETCH=1`). |
| `sort-keys-sample.cjs` | The hand classification: 100 objects ESLint reports, stratified by repo and flow (frozen in `sample.json`); `--worksheet`, then the blind subset of 36 for the second rater, `--compute` (both raters, weighted shares, κ). |
| `sort-keys-hand-checks.cjs` | Recomputes the populations of the one-rater checks kept in `iteration-check.json` (every rewritten object seen iterated) and `effect-order-check.json` (16 sampled side-effect swaps), fails if a verdict is missing, and writes `inference-check.json`. |
| `sort-keys-agent-runs.cjs` | Key order in every committed agent-experiment run: sort-keys reports before and after, object literals the agents wrote or moved and whether they're sorted, objects they reordered, and what the fix pass reordered after them. |
| `sort-keys-oracle.cjs` | The behaviour oracle for the three subjects: transpiles a file, runs it in a fresh Node process, and returns a trace that keeps key order and exact strings. |
| `sort-keys-examples.cjs` | Checks the subjects' verbatim blocks against their commits, lints and type-checks them, records what each fix pass does to them, and runs the oracle on them and on 14 hand-made variants. |
| `sort-keys-tables.cjs` | Generates `results/sort-keys/tables.md`. |
| `sort-keys-run-all.cjs` | Runs all of the above in order. |

```sh
bash research/corpus/scripts/clone.sh && bash research/corpus/scripts/a11y-clone.sh
bash research/corpus/scripts/todo-history-clone.sh     # if the history clones aren't there yet
node research/corpus/scripts/sort-keys-run-all.cjs      # about 15 min, 10 of them history; --skip-history, --skip-census
```

- **The reimplementations predict the rules exactly.** On all thirteen repos, every ESLint report (16,861 on the corpus), every Oxlint report and whether it has a fix, and every Biome report land on the object the reimplementation predicts, and nowhere else. The fixes' new key orders match the prediction for every rewritten object but one: Oxlint sorts with `sort_unstable_by`, which swapped a getter and setter pair in a 30-key Vite object.
- **Copies outside `out/`.** The fix passes, mirrors and the calibration run in `$SORT_KEYS_TMP` (default: the system temp directory's `ultracite-research-sort-keys/`), because Ultracite's presets ignore `**/out`.
- **Oxlint runs `sort-keys` alone** (every category off) for the corpus and the fixes, so no other rule's fix can apply. Core sets it to `"error"` with no options, so it's the same rule with the same options; the shared rule census (`rule-census.cjs`, core + react) is run too, and the calibration uses init's config.
- **Biome on the corpus** runs the action alone (`assist.actions.source.useSortedKeys: "on"`, linter and formatter off). The calibration uses the core preset too, which also turns on `useSortedInterfaceMembers` and `useSortedAttributes`.
- **The type-check overlay** builds one TypeScript program per repo from its own tsconfig and swaps in the fixed files through the compiler host. Only zod and hono resolve every import; elsewhere unresolved packages are `any`, so a broken inference can't show. Diagnostics are compared by file and code, because sorting changes the property order TypeScript prints in a message.
- **Hand inputs:** `decision-history.json`, `iteration-check.json` and `effect-order-check.json` (one rater), and the rater labels (`out/sort-keys/labels-*.json`, kept in `classifications.json`).
- **No shared script changed.** The topic reads `collect-files.cjs`, `dead-code-lib.cjs` and `tools.cjs`, and runs `rule-census.cjs` unchanged with `CORPUS_REPO_LISTS` unset.

The method, findings and caveats are in `corpus/results/sort-keys/REPORT.md`.

### React effects and dependency arrays (tenth post)

The effects scripts are prefixed `effects-` and share `effects-lib.cjs`. It holds the topic's paths and repos, the hook inventory (every hook call with a dependency array, parsed with ESLint's own `Linter`, the TypeScript parser and its scope analysis: what each dependency is, what the callback reads, and what an effect's body does), the rules per linter, runners for Ultracite's Oxlint, ESLint and Biome presets that keep every message, label, help text and suggestion, and the join from a diagnostic to its hook. `effects-runtime.cjs` runs real React 19 (react and react-dom/client from the repo's Bun store) on a minimal DOM written for it, with fake timers and a render cap that turns an update loop into a recorded loop.

The rules: `react-hooks/exhaustive-deps` and the rest of eslint-plugin-react-hooks 7 (ESLint react preset, every non-deprecated rule; scoped to `.jsx`/`.tsx`), Oxlint's `react/exhaustive-deps` (reported as `react-hooks(exhaustive-deps)`) and the 22 React Compiler rules of its react preset (`exhaustive-effect-dependencies`, `memo-dependencies`, `set-state-in-effect`, `rule-suppression`, …), Biome's `useExhaustiveDependencies` and `useHookAtTopLevel` (react preset), and react-doctor's effect rules (ESLint react preset, Oxlint's opt-in js-plugins).

The eight corpus repos are measured as in every topic, and the four React codebases from the accessibility post (`repos-accessibility.json`) as a separate set; Supabase Studio has two-thirds of all effects. History uses the TODO post's history clones (Excalidraw, Next.js, tRPC, Hono's `hono/jsx`); the React set has only shallow clones.

| Script | What it does |
| --- | --- |
| `effects-inventory.cjs` | The rules per linter and preset: Oxlint's react and js-plugins presets with `oxlint --rules` (category, fix kind) and `--print-config` of init's config; ESLint core + react resolved with `calculateConfigForFile` for `.tsx`, `.jsx`, `.ts`, `.js` and a test file, each react-hooks rule's meta, and the React Compiler options and feature flags the plugin runs with; Biome's react preset with `biome explain`; react-doctor's effect rules in each preset; the agent prompt's lines and the AGENTS.md template's lines about hooks. |
| `effects-census.cjs` | Every `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useCallback`, `useMemo`, `useImperativeHandle` and custom hook that takes a dependency array: the array's form and size, each dependency's kind (prop, state, setter, ref, `ref.current`, context, memo, a custom hook's value, a function or object built in render, a constant, an import, outer scope), what the callback reads from the component, and for effects the cleanup, setState (direct or in a callback), fetching, subscriptions, listeners, timers, observers, the DOM, refs, prop callbacks and async; then a mechanical reading in the categories of react.dev's "You Might Not Need an Effect". |
| `effects-linters.cjs` | Oxlint (core + react, extends only), ESLint (core + react, hook and react-doctor effect rules), the counterfactual ESLint run with the react block on every `.ts`/`.js` hook file, Biome (the two rules) and react-doctor through Oxlint's js-plugins, raw (disable comments neutralised) and reported, each diagnostic joined to its hook. |
| `effects-disagreements.cjs` | Per hook, every view's dependency-rule diagnostics, their kinds and the names they list; the overlap; and for every hook one implementation flags and another doesn't, the reason, from the file type, the hook name, and what each listed name is in the callback (a `.ts` file ESLint doesn't lint, `useInsertionEffect`, an unnecessary dependency in an effect, a member path, a function without captured values, a `useEffectEvent` from another module, …). |
| `effects-fixes.cjs` | On copies with disable comments neutralised: ESLint's suggestion applied to every flagged hook (once, and repeated until nothing changes), `oxlint --fix`, `--fix-dangerously`, `biome check --write` and `--write --unsafe`, each with the dependency rule alone. Per rewritten hook: dependencies added and removed by kind, and the signs that it now runs more often, loops, runs less often, or throws (a function or object built in render, a setState feedback, a removed reactive dependency, a dependency declared after the hook, an optional chain dropped); then ESLint's own "changes on every render" verdict on the result. |
| `effects-markers.cjs` | Every directive comment in every measured file (typescript-estree comments): rules named, reason, nearby comment, scope, the hook it covers and whether each linter still flags that hook raw and reported; the ranking of every rule the same repos suppress; the shared census's raw-minus-reported per rule; each repo's own lint config lines about hooks at the pinned commit. |
| `effects-calibration.cjs` | `calibration/react-effects/cases.tsx` (53 shapes) through Oxlint (init's config), react-doctor, ESLint (inline config ignored and honoured) and Biome (presets), with a custom-hook configuration for each, and through every fix pass; `behaviour/` (10 runnable cases, each with a hand-written right fix) rendered with React 19 as written, right and after each fix, one fresh process per version; and 10 validation cases checking the runtime against behaviour react.dev documents. |
| `effects-history.cjs` | `--disables`: every hook-rule disable comment added or removed on the mainline, paired into lives. `--bugs`: commits whose message points at an effect bug, each hook-bearing file linted at the parent and at the commit, and a worksheet for the hand reading. `--scale`: commits touching a one-line dependency array. Only `git log` and `git show`, with `GIT_NO_LAZY_FETCH=1`. |
| `effects-sample.cjs` | The hand classifications: 100 flagged hooks stratified by repo and by which linters flag them (frozen in `sample.json`), the blind subset of 36, every dependency-rule suppression (101) and its blind subset of 30; `--compute` writes both raters, weighted shares and κ to `classifications.json`. |
| `effects-agent-runs.cjs` | Hooks, effects and dependency-rule diagnostics in every committed agent-experiment run, before and after, and what the agents added, removed or changed. |
| `effects-oracle.cjs` | The behaviour oracle for the three subjects: loads a file into React 19 in a fresh process, drives the props, events and timers that matter, and returns a trace and a verdict. |
| `effects-examples.cjs` | Checks the subjects' verbatim blocks against their commits, type-checks them with React's types, lints them as committed and as prepared (upstream disable comments removed), runs every fix pass and the oracle, and does the same for hand-made variants. |
| `effects-tables.cjs` | Generates `results/react-effects/tables.md`. |
| `effects-run-all.cjs` | Runs all of the above in order. |

```sh
bash research/corpus/scripts/clone.sh && bash research/corpus/scripts/a11y-clone.sh
bash research/corpus/scripts/todo-history-clone.sh     # if the history clones aren't there yet
node research/corpus/scripts/effects-run-all.cjs        # about 10 min; --skip-history, --skip-census
```

- **The runtime is checked first.** Ten validation cases compare it with behaviour react.dev states (no array runs after every render, an empty array once, cleanup with the old values first, Strict Mode's extra cycle, the stale counter, the update loop, Effect Events reading the latest props, layout effects first, an object dependency re-running every render, a same-value setState bailing out). All pass.
- **Copies outside `out/`.** Mirrors, fix passes, calibration and history copies live under `$EFFECTS_TMP`, because Ultracite's presets ignore `**/out`.
- **ESLint's react block is scoped to `.jsx`/`.tsx`.** The `eslint` view is Ultracite as configured; `eslint-all` adds the same block on every `.ts`/`.js` file with a hook, the counterfactual the disagreements and fixes use.
- **Disable comments and the React Compiler.** Oxlint's compiler rules skip a component that contains a disable comment for `react-hooks/exhaustive-deps` or `rules-of-hooks` and report `react/rule-suppression` instead, so raw and reported differ for the compiler rules on the whole component. eslint-plugin-react-hooks 7.1.1 builds no suppression patterns with its defaults and doesn't skip.
- **The hand labels are Claude models.** Rater 1 labelled all 100 hooks and all 101 suppressions; rater 2, a separate subagent working blind, 36 hooks and 30 suppressions. The history reading (`history-labels.json`) and `decision-history.json` have one rater.
- **Hand inputs:** `history-labels.json`, `decision-history.json`, and the rater labels (`out/react-effects/labels-*.json`, kept in `classifications.json`).
- **No shared script changed.** The topic reads `collect-files.cjs`, `tools.cjs`, `dead-code-lib.cjs` and `sort-keys-lib.cjs`, and runs `rule-census.cjs` unchanged with `CORPUS_REPO_LISTS=repos-accessibility.json`, so its census pools all twelve repos (the tables split them).

- **Agent pull requests (AIDev).** `scripts/aidev/` (Python, standard library only) counts the `exhaustive-deps` suppressions agents added in the AIDev dataset's pull requests, read from the public Hugging Face datasets-server with no login. Its README has the steps; the aggregate outputs are in `results/react-effects/aidev/`, and the pulled rows aren't committed.

The method, findings and caveats are in `corpus/results/react-effects/REPORT.md`.

### Length limits (eleventh post)

The length scripts are prefixed `length-` and share `length-lib.cjs`. It holds the topic's paths and repos, the test-file collection (the files `collect-files.cjs` drops for being tests, plus the sibling test trees in the clones), the census rule (every function measured the way each rule counts it, reimplemented from each rule's source: max-lines-per-function and its options, Oxlint's span, SonarJS's lines of code and exemptions, Biome's body-token count, max-statements, max-params with and without `this`, max-depth, S134's nesting, max-nested-callbacks and Oxlint's and Biome's definitions of a callback), the real rules at threshold 0 under local aliases so every function reports its count, and runners for Oxlint and Biome with each rule alone that keep every message and help text.

The rules: ESLint's `max-lines`, `max-lines-per-function`, `max-statements`, `max-params` (and `@typescript-eslint/max-params`), `max-depth`, `max-nested-callbacks` and `max-classes-per-file`, Oxlint's ports, Biome's `noExcessiveLinesPerFunction`, `useMaxParams`, `noExcessiveNestedCallbacks`, `noExcessiveLinesPerFile`, `noExcessiveClassesPerFile` and the nursery `noExcessiveStatementsPerFunction`, and SonarJS's `max-lines`, `max-lines-per-function`, `max-switch-cases`, `max-union-size` and `nested-control-flow`. Ultracite turns the size limits off and keeps `max-nested-callbacks`, `max-classes-per-file` (not in Biome), `max-switch-cases`, `max-union-size` and cognitive complexity on.

The eight corpus repos are measured as in every topic, the four React codebases from the accessibility post (`repos-accessibility.json`) as a separate set, and Ultracite's CLI apart. Source and tests are kept apart throughout. History uses the TODO post's history clones (the eight corpus repos).

| Script | What it does |
| --- | --- |
| `length-rules.cjs` | The rules per linter and preset: every Oxlint preset and `oxlint --rules`, ESLint core resolved with `calculateConfigForFile` for `.ts`, `.tsx` and a test file, every Biome preset with `biome explain`, each rule's defaults from its source, SonarJS's rule meta, the agent prompt's lines, and the preset inconsistencies found. |
| `length-census.cjs` | Every function and file in every repo, source and tests: every count each rule makes, IIFEs, callbacks and their callee, components, test callbacks, dispatchers, data and nested lines, free variables, cognitive and cyclomatic complexity. Checks each count against the real rule's message (0 mismatches, 0 unmatched reports). |
| `length-linters.cjs` | Oxlint and Biome with each rule alone at its minimum, default and the common settings, and ESLint and SonarJS at the defaults and settings, on a mirror with disable directives neutralised; every diagnostic joined exactly to its function or file, and ESLint's flags checked against the census. |
| `length-disagreements.cjs` | Reports per repo and pool, linter and setting; every function two implementations count or flag differently, with the reason and an example; where every line break Biome doesn't count is; every linter's messages and help. |
| `length-calibration.cjs` | `calibration/length-limits/` (31 TypeScript cases, 5 JSX cases, 4 declaration cases, a four-class file and a printWidth case) through ESLint, SonarJS, Oxlint and Biome at each rule's minimum, with the option variants, and at the defaults. |
| `length-format.cjs`, `length-format-lib.cjs` | Copies of every file formatted with Oxfmt (Ultracite's preset minus its ignore patterns, then printWidth 100 and 120), parsed and measured again, functions matched to themselves. |
| `length-history.cjs` | `--track`: each function's line range followed back through three years of mainline commits (`git log -p -U0 -M -w --first-parent`), as `git log -L` does; changes and bug-fix commits attributed to the innermost function. `--analyse`: rates by length, logistic regressions with size controlled and file-clustered errors, partial Spearman. Missing blobs are never fetched (`GIT_NO_LAZY_FETCH=1`). |
| `length-history-check.cjs` | The hand check of the bug-fix heuristic: 60 commits it calls fixes and 40 it doesn't (seeded), a worksheet, and `--compute` (precision and miss rate). |
| `length-complexity.cjs` | Length against cognitive complexity: Spearman, the overlap with Ultracite's threshold, scores with nested functions included, and examples with permalinks. |
| `length-markers.cjs` | Each repo's lint configs at its pinned commit (`git show`) for these rules and the commit that added each line, and every disable comment naming one, with its reason and what it covers. |
| `length-sample.cjs` | The hand classification: 100 functions over 50 lines and 30 with five or more parameters, stratified (frozen in `sample.json`); `--worksheet`, the blind subsets of 30 and 10, `--compute` (both raters, weighted shares, κ). |
| `length-agent-runs.cjs` | Length, statements, parameters and depth in every committed agent-experiment run, before and after and attempt by attempt, and the functions the agents added. |
| `length-oracle.cjs` | The behaviour oracle for the three subjects: transpiles a file, runs it in a fresh Node process against generated scenarios through its public API, and returns a trace and a verdict; also measures what a split costs a reader (functions, helpers' parameters and call sites, call order). |
| `length-examples.cjs` | Checks the subjects' verbatim lines against their commits, type-checks them, lints them at the defaults before and after Oxfmt, and runs the oracle and the structure measure on 30 hand-made variants. |
| `length-tables.cjs` | Generates `results/length-limits/tables.md`. |
| `length-run-all.cjs` | Runs all of the above in order, and the shared rule census. |

```sh
bash research/corpus/scripts/clone.sh && bash research/corpus/scripts/a11y-clone.sh
bash research/corpus/scripts/todo-history-clone.sh     # if the history clones aren't there yet
LENGTH_TMP=<scratch dir> node research/corpus/scripts/length-run-all.cjs   # --skip-history, --skip-census, --skip-format
```

- **The reimplementations match the rules.** Over 111,243 functions, the census's counts equal the real ESLint and SonarJS rules' for every rule and option variant, and the Biome reimplementation predicts every count Biome reports at its minimum.
- **Copies outside `out/`.** Mirrors, formatted copies, calibration and oracle runs live under `$LENGTH_TMP` (default: the system temp directory's `ultracite-research-length-limits/`), because Ultracite's presets ignore `**/out`. The Oxfmt preset's ignore patterns are dropped because they include `**/build` (Next.js's `packages/next/src/build`).
- **Each rule runs alone.** Oxlint (every category off) and Biome (`recommended: false`) run one rule per pass, so the counts are each rule's; the shared rule census runs Ultracite's core, react and js-plugins presets unchanged for the structural rules.
- **The hand labels are Claude models.** Rater 1 labelled all 130 items; rater 2, a separate subagent working blind, 30 long functions and 10 parameter lists. The history check and `decision-history.json` have one rater.
- **Hand inputs:** `decision-history.json`, and the rater labels (`out/length-limits/labels-*.json`, kept in `classifications.json` and `history-check.json`; the compute steps leave those files alone when the labels aren't there).
- **No shared script changed.** The topic reads `collect-files.cjs`, `tools.cjs`, `dead-code-lib.cjs` and `sort-keys-lib.cjs`, and runs `rule-census.cjs` unchanged with `CORPUS_REPO_LISTS=repos-accessibility.json`.

The method, findings and caveats are in `corpus/results/length-limits/REPORT.md`.

### Function style and order (twelfth post)

The func-style scripts are prefixed `func-style-` and share `func-style-lib.cjs`. It holds the topic's paths, the inventory (one ESLint `Linter` pass per file with the TypeScript parser and its scope analysis: every function's form, scope, body, types and what converting it would need; every reference between module-level functions; every reference above its binding's definition, with what happens at runtime), and the real ESLint rules under local aliases for option variants, so their reports join to the inventory exactly.

The rules: `func-style` (Oxlint core and ESLint core, `["error", "expression", { allowArrowFunctions: true }]`), `no-use-before-define` (Oxlint core at its defaults; in ESLint the base rule on JS files and `@typescript-eslint/no-use-before-define` on TS files, both at their defaults; off for route files in the TanStack presets), and for context `func-names`, `prefer-arrow-callback`, `arrow-body-style`, `unicorn/consistent-function-scoping` and `react/function-component-definition`. Biome's preset has `useArrowFunction`, `noInvalidUseBeforeDeclaration` and `useConsistentArrowReturn`, and no function-style rule; its nursery `useConsistentFunctionStyle` is measured too.

The eight corpus repos are measured as in every topic, the four React codebases from the accessibility post (`repos-accessibility.json`) as a separate set, and Ultracite's CLI apart. Source and tests are kept apart (`length-lib.cjs`'s test collection). History uses the TODO post's history clones.

| Script | What it does |
| --- | --- |
| `func-style-rules.cjs` | The rules per linter and preset: every Oxlint preset and `oxlint --rules` (fix kinds), ESLint resolved with `calculateConfigForFile` for `.ts`, `.js`, `.tsx`, `.jsx`, a test file and a TanStack route file, each rule's meta, every Biome preset with `biome explain`, the agent prompt's lines and the AGENTS.md template's, and the preset inconsistencies found. |
| `func-style-census.cjs` | The inventory for every file of every repo: function forms (declarations, exported and default-exported; `const`/`let`/`var` arrows and function expressions, named or not; methods, class fields, object properties, callbacks, IIFEs), scope, components, concise and single-return bodies, `this`/`arguments`/`new.target`/`super`, generators, overloads, assertion and never-returning signatures, `new`/`instanceof`/`.prototype` in the file and by importers, types written inline or through the variable; file order (each reference between module-level functions up or down; top-down, bottom-up or mixed files; mutual recursion as strongly connected components); every use-before-define candidate and its runtime class. |
| `func-style-linters.cjs` | Oxlint and Biome with each rule alone (three passes of option variants), on a mirror with disable directives neutralised and one as written, plus the census's ESLint reports; every diagnostic joined to its function or candidate, and every item the implementations disagree on given a reason. |
| `func-style-calibration.cjs` | `calibration/func-style/` (44 cases) through Oxlint (each rule alone, and init's config), ESLint (the census pass and the core preset), Biome (each rule alone and the preset), `tsc` and Node (the case transpiled and imported in a fresh process), as written and converted; and what every linter's fix pass, and `ultracite fix` and `--unsafe` with the presets, do to each case. |
| `func-style-convert.cjs` | Converts every reported declaration on copies (arrow, or a named function expression where an arrow would change behaviour; overloads, default exports and namespace merges left), reruns the analysis and Oxlint, reorders every statement list so each binding is defined above its references (only statements with no effects move; Kahn's algorithm, fewest moved lines), and type-checks each corpus repo before, converted and reordered (an overlay; nothing installed). |
| `func-style-cycles.cjs` | The import-cycles topic's graph (`import-cycles-graph.cjs` `analyse`, unchanged): runtime cycles that are safe only because a function declaration is read at load time. |
| `func-style-history.cjs` | `--keywords`: mainline commits whose messages mention TDZ, hoisting, "before initialization", cycles and the like, for the hand reading in `history-labels.json`. `--churn`: conversions between declarations and `const` functions, and moved definitions, in the three-year window. `--track`, `--analyse`: `length-history.cjs`'s tracking of every named function, and bug fixes by form with size controlled. Only `git log`/`git show`, with `GIT_NO_LAZY_FETCH=1`. |
| `func-style-markers.cjs` | Each repo's lint configs at its pinned commit for these rules (with the commit that added each line), and disable comments naming them. |
| `func-style-sample.cjs` | The hand classification: 82 declarations and 80 use-before-define reports (frozen in `sample.json`); `--worksheet`, `--print` (blind subsets of 30 and 30), `--compute` (both raters, weighted shares, κ, and rater 1 against the automatic labels). |
| `func-style-agent-runs.cjs` | Functions agents added or rewrote in every committed agent-experiment run: form, whether it matches the file's style, helpers above or below their callers, func-style and no-use-before-define before and after, and the retry prompts these rules caused. |
| `func-style-oracle.cjs` | The behaviour oracle for the three subjects: transpiles a subject and its stub, imports it in a fresh Node process (an import-time TDZ crash shows up here), runs seeded scenarios through its exports, and compares traces. |
| `func-style-examples.cjs` | Checks the subjects' verbatim lines against their commits, lints them with Ultracite's Oxlint, ESLint and Biome presets, type-checks them, and runs the oracle and the order measure on 25 hand-made variants (right responses, tempting ones and gaming moves). |
| `func-style-tables.cjs` | Generates `results/func-style/tables.md`. |
| `func-style-run-all.cjs` | Runs all of the above in order, and the shared rule census. |

```sh
bash research/corpus/scripts/clone.sh && bash research/corpus/scripts/a11y-clone.sh
bash research/corpus/scripts/todo-history-clone.sh     # if the history clones aren't there yet
FUNC_STYLE_TMP=<scratch dir> node research/corpus/scripts/func-style-run-all.cjs   # about 12 min; --skip-history, --skip-census, --skip-typecheck
```

- **The inventory predicts the rules.** ESLint's `func-style` reports exactly the declarations the census predicts in every repo, and typescript-eslint's `no-use-before-define` exactly the non-type candidates. Every Oxlint and Biome report joins to an inventory item, and every disagreement between the three linters has a reason (`linters.json` `agreement`).
- **Runtime classes are checked by hand.** Every candidate the analysis called a crash was read and turned out to be deferred; the refined analysis (own-context calls only) calls none in shipping code, and the hand classification of 80 reports agrees with it on all 80.
- **Copies outside `out/`.** Mirrors, conversions, calibration, oracle and example runs live under `$FUNC_STYLE_TMP` (default: the system temp directory's `ultracite-research-func-style/`), because Ultracite's presets ignore `**/out`. Oxlint and Biome configs are written there too, never under `research/`. The shared rule census writes its Oxlint config under `out/rule-census/func-style/`, and `func-style-run-all.cjs` deletes it afterwards.
- **The calibration runs code.** Its cases are this repo's own files, transpiled and imported in a fresh Node process. Nothing from a clone runs; the subjects' oracle runs this repo's copies with stubs.
- **The hand labels are Claude models.** Rater 1 (the model that ran the measurements) labelled all 162 items from worksheets that show the automatic label; rater 2, a separate subagent working blind, 30 of each. `history-labels.json` has one rater.
- **Hand inputs:** `history-labels.json`, and the rater labels (`out/func-style/labels-rater{1,2}.json`, kept in `classifications.json`).
- **Two shared scripts changed, both backwards-compatible:**
  - `import-cycles-graph.cjs` exports `analyse` and runs `main` only when it's the script being run. Run as before, it does the same thing; its runtime cycle counts through `analyse` equal `results/import-cycles/graph.json` in all eight repos.
  - `length-history.cjs` exports `track` (with an optional list of functions to track instead of its own census rows), `logistic` and its constants. With no list, `track` reads the same rows as before.
  - Neither topic's results were regenerated here.

The method, findings and caveats are in `corpus/results/func-style/REPORT.md`.

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

### Accessibility (seventh post)

Ultracite re-lints a file after the agent's edit, and hands it back while anything is still reported. For accessibility that loop matters: the correct ARIA button pattern trips `jsx-a11y/prefer-tag-over-role` (Biome: `useSemanticElements`). So this topic runs every file through Ultracite's retry loop, not one attempt.

Subjects are two Excalidraw components from `corpus/examples/accessibility/`. Each arm is a subject entry:

- **a-ox:** `Stats/Collapsible`, a `<div onClick>` section header, handed over through Ultracite's Oxlint adapter (`click-events-have-key-events`, `no-static-element-interactions`).
- **b-ox:** `ColorPicker/TopPicks`, swatch buttons named only by a hex `title`, through Oxlint (`control-has-associated-label`).
- **a-bio:** subject A through Ultracite's Biome adapter (`useKeyWithClickEvents`, `noStaticElementInteractions`, `noNoninteractiveElementInteractions`).
- **a-rules:** subject A through Oxlint, with the `AGENTS.md` that `ultracite init` writes (the CLI's own `writeAgentFiles`, run under Bun). Both agents get `AGENTS.md` alone. Claude Code loads it when there's no `CLAUDE.md`, and every run's session log confirms it was loaded.

**Subjects.** `prepareSubjects` gets each subject ready:

- It removes the `stripFields` fields, and `TEXT_EDITS` rewrite a paragraph that named a rule and the "copied verbatim" claims.
- It checks every comment against 27 patterns that would name the analysis.
- It names the files in kebab-case (`collapsible.tsx`), because Ultracite's core preset reports `unicorn/filename-case`.
- It runs both linters' fix passes until nothing changes, so each subject lints clean apart from the barrier. Neither the handoff nor any re-lint is filtered.

The run dir also gets `tsconfig.json` and a `package.json` with React and what init adds.

**Retry loop.** `run-one.mjs`'s `runWithRetries` does for one file what `packages/cli/src/agent-fix/index.ts` does:

- `collect` runs the adapter's fix pass, formatter and lint on the project.
- The agent then gets `buildPrompt`, and `buildRetryPrompt` after the first attempt. Each attempt runs under Ultracite's 300 s timeout and 10 s kill grace.
- After each attempt, verify runs the fix pass, the formatter and the lint on the file in place. While anything is reported and the agent didn't time out, the agent gets another attempt, up to three in all.

The copied CLI code is in `scripts/ultracite-adapters.cjs`, hash-checked against the source. The self-test also runs Ultracite's real `linters.ts` adapters in a scratch project laid out as init leaves one, and compares them with the mirror: all 55 comparisons match.

After this topic's runs, Ultracite changed how it retries (`9f80955d`). The retry prompt now separates issues that are still reported from issues that are new since the edit. An issue the agent lists on a `Left for review:` line in its final message isn't retried. The mirror and `runWithRetries` follow the change, and each attempt in `meta.json` records its `retryIssues` and `leftForReview`. This topic's committed runs predate the change and re-measure unchanged.

Biome runs on a copy of the run dir with its config at the root. With `--config-path`, Biome looks for `package.json` next to the config, and `noUndeclaredDependencies` reports any `react` import.

**Measurement.** Each attempt is measured twice: as the agent left the file and as verify left it. Each measurement covers:

- Oxlint core + react (init's config) and with js-plugins, ESLint core + react and Biome core, honouring and ignoring inline config;
- `tsc`;
- the oracle;
- a scan of the control;
- Ultracite's partition, and verify run again, which reproduced every committed file;
- from the session log: tools, commands run or refused, project instructions loaded, the final message, and what the agent said about styling.

At the end it computes what Ultracite would print, from a copy of `fixFileGroup`'s tally.

**Oracle.** `scripts/topics/accessibility-behavior.cjs` is the corpus oracle moved here; `corpus/scripts/a11y-examples.cjs` imports it, and `examples.json` regenerates unchanged. It needs no DOM: it renders with React 19's `renderToStaticMarkup`, records host props, and calls handlers with synthetic click and key events (`currentTarget.click()` included).

- **Subject A.** It checks for a native control, or role + `tabIndex` + Enter and Space. It also checks that the control isn't hidden, its name, `aria-expanded`, and clicks and children, and flags keys or clicks that toggle twice and a heading inside the control.
- **Subject B.** It checks every swatch's name (hex, generic, palette name), whether it's hidden, and render errors per picker.
- **Self-test.** 55 cases (the corpus subjects and 20 variants, the two prepared subjects, 31 mutants in `harness-tests/accessibility/`), all as expected.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=accessibility
node scripts/prepare-subjects.cjs        # subjects/accessibility/ (stripped, normalised and checked; init's AGENTS.md; package.json per linter)
node scripts/test-behavior-harness.cjs   # oracle self-test (55) and the mirror against the CLI's adapters (55) -> results/accessibility/oracle-self-test.json
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a-ox:claude:1 b-ox:codex:1 a-bio:claude:1 a-rules:codex:1   # ...4 of each arm and agent
node scripts/aggregate.cjs               # results.json, with the mutant matrix (~4 min)
node scripts/report-tables.cjs > results/accessibility/tables.md
```

**Cost and time.** In this post's runs:

- Claude Code cost $0.08–0.63 a run (median $0.35, $5.89 for 16 runs).
- Codex used 18.3k–55.7k tokens a run (median 31.9k).
- Runs took 17–106 s (39 attempts in all), and measuring one takes about 25 s.
- The pilot and 17 superseded runs, made before the run dir had a `package.json` (and one with Biome's `--config-path`), are kept in `results/accessibility/superseded-runs/` and not aggregated.

**Locks.** While an agent runs, these are locked as well:

- the corpus's accessibility examples, results, calibration and output;
- every `a11y-*.cjs` corpus script;
- `research/bibliography/accessibility.md` and the bibliography README;
- any post draft or page whose name contains "a11y" or "accessib";
- `plans/` and `lint-configs/`;
- the corpus scripts' temp copies;
- during a retry, earlier attempts' staging, which holds their session logs;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`, the orchestrating session's scratchpad and the batch-log folder.

The method, numbers and caveats are in `agent-experiment/results/accessibility/REPORT.md`.

Harness changes made with this topic, all opt-in or behaviour-preserving:

- **`run-one.mjs`:**
  - `runWithRetries`, used only when a topic exports `verify`. Its artifacts: `handoff.json`, `before`/`after`, and `attempt<k>/` with the prompt, diagnostics JSON, the agent's file, the verified file, both patches and `verify.json`.
  - `runAgentProcess` takes an optional timeout and kill grace; the defaults are unchanged.
  - `lockAll(extra)` locks more paths for one agent run; other callers pass none.
- **`scripts/ultracite-adapters.cjs`** (new): the mirror of Ultracite's adapters, retry condition and tally, reusable by later topics.
- **`topics.cjs`** documents the `collect` and `verify` hooks.
- **`.gitignore`** ignores the per-attempt and superseded runs' session logs, stdout and stderr.
- **dead-code and import-cycles** record the parser hashes their runs were made with, instead of failing aggregation. 40d646a4 changed those parsers, so their aggregation already failed at HEAD. New runs of those topics still fail the check.
- **Earlier topics, re-measured and re-aggregated from their committed runs**, before and after these changes. Before and after match exactly for all five.
  - cognitive-complexity, floating-promises and import-cycles reproduce exactly, apart from `generatedAt`.
  - security-rules and dead-code differ from their committed files only where the presets changed after their runs: Biome's `noUndeclaredDependencies` (c9b606af), and Oxlint js-plugins' sonarjs rules (`sonarjs/void-use`, `sonarjs/regex-complexity`; 7984c6e9). See `REPORT.md`, "Harness changes".

### TODO comments (eighth post)

A TODO rule reports a word, and every edit that removes the word clears it: deleting the comment, rewording it to `Note:`, or moving the word off the start. Whether that's right depends on the TODO. So the subjects are three real TODOs that need three different responses, and every file goes through Ultracite's retry loop, with its `Left for review:` line.

Subjects are from `corpus/examples/todo-comments/`, each through two arms:

- **a:** Vite's `handleHMRUpdate` (`hmr.ts`), `// TODO auto restart server` above code that already restarts the server. Right: drop the marker.
- **b:** Vite's `HMRClient.prunePaths` (`hmr.ts`), `// TODO Trigger their dispose callbacks.`, a known bug fixed upstream with a runtime change and edits to two other files. Right: leave it for review.
- **c:** Excalidraw's `loadFromJSON` (`json.ts`), "Be over-permissive until WebKit bug 34442 gets resolved". Right: keep it and leave it for review.
- **`-ox`:** Oxlint's default presets, the root config `ultracite init` writes: `no-warning-comments` ("Remove or rephrase this comment").
- **`-js`:** the same with the js-plugins preset: also `sonarjs/todo-tag` ("Complete the task associated to this "TODO" comment.", with no help).

**Subjects.** `prepareSubjects` gets each subject ready:

- It removes the `stripFields` fields, and `TEXT_EDITS` rewrite the commit lines that named the fix or the corpus, the "verbatim" claims, and two STUB notes that named the behaviour check.
- It checks every comment but the marker against 17 patterns (rule names, SATD, stale, the history's commits and PRs, "Left for review", upstream, WebKit and others). Three upstream Vite comments are allowed by name.
- It uses the upstream file names, `hmr.ts` and `json.ts`.
- It runs both arms' `oxlint --fix` and `oxfmt` until nothing changes, as `ultracite fix` would before the handoff. Oxlint's `sort-keys` fix reorders keys that the code serialises (B's HMR messages, C's saved files). The oracle's traces differ from the corpus subject's only in that key order, which `prepareSubjects` checks, and the prepared subject is the reference.

The run dir also gets the examples' `tsconfig.json` and a `package.json` with what init adds (the plugin packages for `-js`).

**The handoff is filtered** in the collect and in every re-lint. The verbatim code still trips 11 to 57 other rules after the fix pass. So only the TODO-family rules are kept, plus any diagnostic that isn't the prepared subject's own (by rule and message, as `diff.ts` matches them). That models a project that lints clean apart from the TODO. It's a deviation from a real project, recorded in each `handoff.json`.

**Retry loop:** the accessibility topic's `runWithRetries` and `scripts/ultracite-adapters.cjs`, unchanged, including the `Left for review:` handling from 9f80955d. The self-test runs Ultracite's real Oxlint adapter in a scratch project with both configs, next to the mirror: all 70 comparisons match.

**Measurement.** Each attempt is measured as the agent left the file and as verify left it:

- the TODO-family rules and every rule in Oxlint default, Oxlint + js-plugins, ESLint core and Biome core, inline config honoured and ignored;
- `tsc`;
- the oracle;
- what the comment became (deleted, marker dropped with its text kept, another tag, rewritten, word moved, unchanged);
- whether its substance survived (A: the restart; B: the dispose gap; C: the bug link), and for B and C whether it still says what to wait for;
- Ultracite's partition and what it would print;
- from the session log: commands run or refused, the final message, sentences about behaviour, the TODO's meaning, keeping it and upstream history, and exposure in tool inputs.

The hand classification is in `classifications.json`.

**Oracle.** `corpus/scripts/todo-oracle.cjs`, imported as it is, so the corpus outputs are unchanged. The self-test has 35 cases (the prepared subjects and 32 mutants in `harness-tests/todo-comments/mutants.json`, 20 of them the corpus variants re-expressed, whose verdicts and rule results match `examples.json`), all as expected.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=todo-comments
node scripts/prepare-subjects.cjs        # subjects/todo-comments/ (stripped, checked, normalised; package.json per arm)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (35) and the mirror against the CLI (70) -> results/todo-comments/oracle-self-test.json (~8 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a-ox:claude:1 b-js:codex:1 c-ox:claude:1 ...   # 4 of each arm and agent
node scripts/aggregate.cjs               # results.json, with the mutant matrix (~4 min)
node scripts/report-tables.cjs > results/todo-comments/tables.md
```

**Cost and time.** In this post's runs:

- Claude Code cost $0.27–0.43 a run (median $0.32, $7.67 for 24 runs).
- Codex used 14.2k–31.6k tokens a run (median 17.8k).
- Runs took 13–53 s, one attempt each, and measuring one takes about 20 s.
- The pilot (one run per agent on `b-js`) is in `results/todo-comments/superseded-runs/` and not aggregated.

**Locks.** While an agent runs, these are locked as well:

- the corpus's todo-comments examples, results and calibration, every `todo-*` corpus script, and the whole corpus `out/` and `repos/` (Vite and Excalidraw at their 2026 commits, and the history clones);
- `plans/`, `lint-configs/` and the temp directory's `ultracite-research-*` folders;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`: every top-level item of the orchestrating session's scratchpad, the batch-log folder, and the other worktrees' corpus clones and outputs.

Left open on purpose: `research/bibliography/todo-comments.md` and the scratchpad's `todo-lit*` files, which a literature agent was writing during the runs; no session log names them. `node_modules` isn't locked either, though its installed Vite copies have the later `prunePaths`; reads of them are checked instead, and there were none.

The method, numbers and caveats are in `agent-experiment/results/todo-comments/REPORT.md`.

Harness changes made with this topic, all opt-in or behaviour-preserving:

- `scripts/topics/todo-comments.cjs` (new), which imports the corpus's `todo-oracle.cjs` and `todo-lib.cjs` unchanged.
- `test-behavior-harness.cjs` accepts a self-test that returns a promise; a number resolves the same way.
- `.gitignore` comments name the topic; the existing per-attempt patterns cover its logs.
- **Earlier topics, re-measured and re-aggregated from their committed runs** before and after these changes: before and after match exactly for all six. Against the committed files:
  - cognitive-complexity, floating-promises and import-cycles reproduce exactly, apart from `generatedAt`;
  - security-rules and dead-code differ only by the known preset drift;
  - accessibility differs only in `hasSessionLog`, because its gitignored session logs aren't in this worktree.

### Sorting object keys (ninth post)

Oxlint's `sort-keys` fix and Biome's `useSortedKeys` sort objects in `ultracite fix` before any agent sees them. ESLint's `sort-keys` has no fix, so only an ESLint user's agent is handed one. This topic hands three objects whose key order means different things to agents through Ultracite's ESLint adapter, and records what the other two linters do with them on their own.

Subjects are from `corpus/examples/sort-keys/`:

- **a:** Vite's `send()` (`send.ts`): an `alias` MIME map read only by key, and a `generateMap()` options bag. Right: sort both.
- **b:** Astro's JSON logger (`json.ts`): `JSON.stringify({ message, label, level })`, pretty and compact. Sorting changes every log line's bytes, which Astro's tests compare. Right: keep the bytes, by leaving it for review or restructuring without changing the output.
- **c:** Hono's `serveStatic` (`index.ts`): `ENCODINGS = { br, zstd, gzip }`, whose `Object.keys` order is the compression preference. Right: keep the order, by leaving it for review or making the order explicit.

**The run dir is what `ultracite init --linter eslint` leaves.** `prepareSubjects` runs the CLI's own `init` (under Bun, `--skip-install --yes`) in a scratch project and keeps its `eslint.config.mjs`, `prettier.config.mjs`, `stylelint.config.mjs` and `package.json`, with the subjects' `tsconfig.json` (`subjects/sort-keys/run-files/`). It runs init for Oxlint and Biome too (`subjects/sort-keys/init/`), for the deterministic paths. The harness lints with equivalent configs passed by `--config`, which import the presets by absolute URL. `prettier-plugin-tailwindcss` and the Stylelint preset's shared configs come from this repo's Bun store, by path.

**Subjects.** `prepareSubjects`:

- removes the `stripFields` fields, and `TEXT_EDITS` rewrite the "copied verbatim" sentence;
- checks every comment line against 16 patterns: sort, order, preference, observable, semantics, tests, bytes, the rule and linter names, the history's commits and PRs, the experiment's words, `JSON.stringify`, zstd and gzip. Nothing matches, and the same patterns match 14, 19 and 20 lines of the unstripped subjects;
- runs Ultracite's ESLint pass (`eslint --fix`, `stylelint --fix`, `prettier --write`) until nothing changes;
- checks that normalising kept every object's key order and the oracle's trace exactly, and that `tsc` is clean.

**The handoff is filtered** in the collect and in every re-lint, as in the todo-comments topic: `sort-keys`, plus any diagnostic that isn't the prepared project's own, by rule and message. That models a project that lints clean apart from the keys. A real one would hand over 25, 11 and 26 issues. No edit added a diagnostic, so the filter changed no decision.

**Retry loop:** `runWithRetries`, with the ESLint adapter added to `scripts/ultracite-adapters.cjs`: `parseEslintDiagnostics` and `runEslintPass` from `linters.ts`, and `toStylelintTargets` and `eslintIgnoredFileArgs` from `linter-args.ts`, hash-checked like the other slices. ESLint names files by absolute path, and the handoff keeps them that way, as Ultracite does. The self-test runs Ultracite's real ESLint adapter under Bun in a project with init's own config files and `node_modules` links, next to the mirror: all 27 comparisons match.

**Measurement.** Each attempt is measured as the agent left the file and as verify left it:

- `sort-keys` and every rule in ESLint core (init's config), Oxlint core (init's root config) and Biome core (`biome check`, so assists report), inline config honoured and ignored;
- `tsc`;
- the oracle;
- what the edit did to each object under test (found by its key set: original order, sorted, another order or gone), and the constructs added (a `Map`, `Object.fromEntries`, entries, a replacer, an order list, a `switch`);
- suppressions, config changes and other files;
- Ultracite's partition and what it would print;
- from the session log: commands run or refused, the agent's own check scripts, searches for tests, reads of an installed Hono, Astro or Vite, the final message, sentences about key order, and exposure.

The hand classification is in `classifications.json`.

**The deterministic paths.** `aggregate` runs `ultracite fix` with Oxlint and with Biome, no agent, on each subject, verbatim and as handed over. It uses the mirror and Ultracite's real adapters (which agree in all 12 cases) and records what was reordered, what's left and the oracle's verdict.

**Oracle:** `corpus/scripts/sort-keys-oracle.cjs`, imported unchanged. The self-test has 27 cases (the prepared subjects and 24 mutants in `harness-tests/sort-keys/mutants.json`, 15 of them the corpus variants re-expressed, whose verdicts and rule counts match `examples.json`), all as expected.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=sort-keys
node scripts/prepare-subjects.cjs        # subjects/sort-keys/ (runs ultracite init; stripped, checked, normalised; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (27) and the mirror against the CLI (27) -> results/sort-keys/oracle-self-test.json (~15 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths and the mutant matrix (~3 min)
node scripts/report-tables.cjs > results/sort-keys/tables.md
```

**Cost and time.** In this post's runs:

- Claude Code cost $0.28–0.42 a run (median $0.33, $4.06 for 12 runs).
- Codex used 19.8k–121.8k tokens a run (median 41.2k).
- Runs took 12.5–334 s (28 attempts in all), and measuring one takes about 30 s.
- The pilot (one run per agent on C) is in `results/sort-keys/superseded-runs/` and not aggregated.

**Locks.** While an agent runs, these are locked as well:

- the corpus's sort-keys examples, results and calibration, every `sort-keys-*` corpus script, and the whole corpus `out/` and `repos/`, history clones included;
- `research/bibliography/sort-keys.md` and the bibliography README;
- `plans/`, `lint-configs/`, the temp directory's `ultracite-research-*` folders and the other topics' run roots;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`: the orchestrating session's scratchpad, the batch-log folder, and the other worktrees' corpus `repos/` and `out/`.

`node_modules` isn't locked, though the main checkout's has Hono, Astro and Vite; reads were checked instead, and there were none.

The method, numbers and caveats are in `agent-experiment/results/sort-keys/REPORT.md`.

Harness changes made with this topic, all opt-in or behaviour-preserving:

- `scripts/topics/sort-keys.cjs` (new), which imports the corpus's `sort-keys-oracle.cjs` unchanged.
- `scripts/ultracite-adapters.cjs`: the ESLint adapter and three new hash-checked slices (the existing slices' hashes are unchanged). `verifySafely` uses `resolve` instead of `join`, which is the same for relative paths.
- `run-one.mjs`: `runWithRetries` checks the handoff by each file's path relative to the run dir when it's absolute (ESLint's). Relative paths are compared as before.
- `topics.cjs` documents absolute diagnostic paths, and the `.gitignore` comments name the topic.
- **Earlier topics, re-measured and re-aggregated from their committed runs** before and after these changes: before and after match exactly for all seven. Against the committed files:
  - cognitive-complexity, floating-promises and import-cycles reproduce exactly, apart from `generatedAt`;
  - security-rules and dead-code differ only by the known preset drift;
  - accessibility and todo-comments differ only in `hasSessionLog`, because their gitignored session logs aren't in this worktree.

### React effects (tenth post)

Oxlint's fix for a missing dependency is dangerous and Biome's is unsafe, so a default `ultracite fix` applies neither, and the dependency diagnostics reach the agent as they are. That makes this the first topic run through Ultracite's default path: Oxlint, with React selected.

Subjects are three effects whose warnings mean different things, from `corpus/examples/react-effects/`:

- **a:** Hono's `useSyncExternalStore` (`index.ts`) before honojs/hono#5166. The effect subscribes once, so a component that switches stores stays on the old one. Right: follow the new store, as the project's fix does, or leave it for review. Fixing it changes behaviour, which the prompt asks agents to preserve.
- **b:** Supabase Studio's `TimeInput` (`TimeInput.tsx`). Both effects call `validate`, declared below them. Adding it throws on the first render, and moving it up and listing everything makes typing revert. Right: keep when each effect runs (`useEffectEvent`, or validation that doesn't change every render), or leave it for review.
- **c:** Excalidraw's `useTTDChatStorage` (`useTTDChatStorage.ts`), two omissions suppressed upstream. `prepareSubjects` deletes the two disable comments. Adding `saveCurrentChat` saves the chat on every prompt keystroke. Right: `useEffectEvent`, a ref to the latest function, or leave both for review.

**The run dir is what `ultracite init --linter oxlint --frameworks react` leaves.** `prepareSubjects` runs the CLI's own `init` (under Bun, `--skip-install --yes`) in a scratch React project and keeps its `oxlint.config.ts`, `oxfmt.config.ts` and `package.json`, with a React `tsconfig.json` (`subjects/react-effects/run-files/`). It runs init for Biome and ESLint too (`subjects/react-effects/init/`), for the deterministic paths. Oxlint's two configs are stored with a `.txt` suffix, as in the sort-keys topic. The harness lints with equivalent configs passed by `-c`, which import the presets by absolute URL.

**Subjects.** `prepareSubjects`:

- removes the `stripFields` fields, and `TEXT_EDITS` rewrite:
  - "the parent of the fix";
  - the hook and component descriptions that named the rules or the behaviour the oracle checks;
  - the "copied verbatim" sentences;
  - B's license pointer into `research/` (now the standard Apache notice);
- deletes C's two `// eslint-disable-next-line react-hooks/exhaustive-deps` comments;
- checks every comment line, STUB notes included, against 19 patterns: effect, dependency, stale, loop, Strict Mode, `useEffectEvent`, resubscribe, keystroke, TDZ, deliberate, intentional, mount-only, once, the rule, linter and compiler names, the history's PRs and commits, and the experiment's words. Nothing matches, and the same patterns match 18, 21 and 30 lines of the unstripped subjects;
- runs Ultracite's Oxlint pass (`oxlint --fix`, `oxfmt --write`) until nothing changes;
- checks that normalising changed no effect's hook, array or callback, nor the oracle's trace (apart from hook line labels), and that `tsc` with React 19's types is clean.

**The handoff is filtered** in the collect and in every re-lint, as in the todo-comments and sort-keys topics. It keeps `react-hooks/exhaustive-deps` and `react/exhaustive-effect-dependencies`, plus any diagnostic that isn't the prepared project's own, by rule and message. That models a project that lints clean apart from the dependency arrays; a real one would hand over 10, 22 and 14 issues. Here the filter changed decisions: all 5 retries were for a rule outside the pair, reported once more than in the subject (`set-state-in-effect`, `rules-of-hooks`).

**Retry loop:** `runWithRetries` and `scripts/ultracite-adapters.cjs`, whose Oxlint and Biome passes now take an optional passthrough for `--unsafe` (the default commands are unchanged). The self-test runs Ultracite's real Oxlint adapter under Bun in a project with init's own config files and `node_modules` links, next to the mirror: all 25 comparisons match.

**Measurement.** Each attempt is measured as the agent left the file and as verify left it:

- the dependency rules and every rule in four views, inline config honoured and ignored:
  - Oxlint react (init's config);
  - ESLint react (init's; its react block skips `.ts` files);
  - ESLint react on every file (a counterfactual);
  - Biome react;
- React Doctor's rules counted apart: its licence restricts use as evaluation data, so no verdict depends on them, and on these subjects they're empty;
- `tsc` with React 19's types;
- the oracle in both of each subject's modes, with effect runs, subscriptions, loads and saves;
- what the edit did to each effect under test:
  - dependencies added (asked for or not), removed (triggers or not), extracted or replaced;
  - Effect Events, refs, memoising, updaters;
  - code moved into an effect or above it;
  - the effect restructured;
- suppressions, config changes and other files;
- Ultracite's partition and what it would print;
- from the session log: commands run or refused, reads of an installed Hono (the main checkout's 4.13.5 has the fix), React's sources and react.dev, the final message, and sentences about behaviour, stale values, loops, resubscribing, the TDZ, mount-only intent, `useEffectEvent`, React's docs and keystrokes.

The hand classification is in `classifications.json`.

**The deterministic paths.** `aggregate` runs `ultracite fix` and `ultracite fix --unsafe` with Oxlint, Biome and ESLint on each subject, as upstream wrote it and as handed over. It uses the mirror and Ultracite's real adapters, which agree in all 42 cases, and records what changed, what's still reported and the oracle's verdict.

**Oracle:** `corpus/scripts/effects-oracle.cjs` on `effects-runtime.cjs`, imported unchanged. The self-test has 25 cases, all as expected:

- the prepared subjects;
- 22 mutants in `harness-tests/react-effects/mutants.json`. 16 re-express the corpus variants, and their verdicts, dependency counts and `tsc` counts match `examples.json`.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=react-effects
node scripts/prepare-subjects.cjs        # subjects/react-effects/ (runs ultracite init --frameworks react; stripped, checked, normalised; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (25) and the mirror against the CLI (25) -> results/react-effects/oracle-self-test.json (~1 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths and the mutant matrix (~8 min)
node scripts/report-tables.cjs > results/react-effects/tables.md
```

**Cost and time.** In this post's runs:

- Claude Code cost $0.35–1.29 a run (median $0.73, $8.86 for 12 runs).
- Codex used 19.6k–102.4k tokens a run (median 48.1k).
- Runs took 31.6–293.2 s (29 attempts in all), and measuring one takes about 20 s.
- The pilot (one run per agent on C) is in `results/react-effects/superseded-runs/` and not aggregated.

**Locks.** While an agent runs, these are locked as well:

- the corpus's react-effects examples, results and calibration, every `effects-*` corpus script, and the whole corpus `out/` and `repos/`, history clones included;
- `research/bibliography/react-effects.md` and the bibliography README;
- `plans/`, `lint-configs/`, the temp directory's `ultracite-research-*` folders and the other topics' run roots;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`: the orchestrating session's scratchpad, the batch-log folder, and the other worktrees' corpus `repos/` and `out/`.

`node_modules` isn't locked, though the main checkout's has Hono 4.13.5 with the fix and React 19.3. Reads were checked instead: no run read either package's source.

The method, numbers and caveats are in `agent-experiment/results/react-effects/REPORT.md`.

Harness changes made with this topic, all opt-in or behaviour-preserving:

- `scripts/topics/react-effects.cjs` (new), which imports the corpus's `effects-oracle.cjs` and `effects-runtime.cjs` unchanged.
- `scripts/ultracite-adapters.cjs`: `oxlintPass` and `biomePass` take an optional `passthrough`, as `linters.ts` does. With `--unsafe`, Oxlint's `--fix` becomes `--fix-dangerously`, and Biome gets the flag. With none, the commands are the ones every earlier topic ran, and the hash-checked slices are unchanged.
- `.gitignore` comments name the topic; the per-attempt patterns cover its logs.
- **Earlier topics, re-measured and re-aggregated from their committed runs** before and after these changes: before and after match exactly for all eight. Against the committed files:
  - cognitive-complexity and import-cycles reproduce exactly, apart from `generatedAt`;
  - security-rules and dead-code differ only by the known preset drift;
  - accessibility, todo-comments and sort-keys differ in `hasSessionLog`, because their gitignored session logs aren't in this worktree;
  - floating-promises and todo-comments also show new drift from 947ca03e (`promise/prefer-await-to-then`, `github/no-then` and `unicorn/prefer-await` turned off after their runs).

### Length limits (eleventh post)

Ultracite turns the size limits off. A user who turns one on gets no autofix, so `ultracite fix --claude` or `--codex` hands the report to an agent. This topic asks whether the agent's refactor keeps behaviour, and whether it helps a reader or only satisfies the count. The user's project is what `ultracite init --linter oxlint` leaves, with `"max-lines-per-function": "error"` (its default, 50) added to `oxlint.config.ts`; every other rule is as the preset sets it.

Subjects are three long functions from `corpus/examples/length-limits/` that need three different responses:

- **a:** Vite's `createClientConfigValueReplacer` (`clientInjections.ts`, 72 lines), config building that reads top to bottom. Right: leave it for review and say why, or a change that keeps the output and isn't harder to follow.
- **b:** Next.js's `revalidateTags` (`revalidation-utils.ts`, 105 lines), two jobs one after the other. Right: extract the two jobs, keeping every call and rejection.
- **c:** VS Code's `guessIndentation` and `spacesDiff` (`indentationGuesser.ts`; 134 and 88 lines after Oxfmt, 117 and 73 as written). The loop's `continue`s skip state updates. Right: keep the guess and the API; leave it for review, or extract only what's safe.

**The run dir is what `ultracite init --linter oxlint` leaves, plus the user's limit.** `prepareSubjects` runs the CLI's own `init` (under Bun, `--skip-install --yes`) for Oxlint, Biome and ESLint in scratch projects. It keeps each linter's files (`subjects/length-limits/init/`), the same files with that linter's limit on (`user/`), and Oxlint's as the run files, formatted by the fix pass, with the subjects' `tsconfig.json` (`run-files/`). Oxlint's two configs and Biome's are stored with a `.txt` suffix.

**Subjects.** `prepareSubjects`:

- removes the `stripFields` fields; 16 `TEXT_EDITS` cut the `Function:` descriptions to an identification, rewrite "copied verbatim", write source ranges as `L21-153`, and drop the license lines that pointed into `research/`;
- checks every comment line against 15 patterns: length and its synonyms, splitting, readability, the rule and linter names, the trap's mechanics, the gaming moves, the history's PRs and commits, and the analysis. Six upstream comments in C about the text lines it reads are allowed by name, and the same patterns match 29, 21 and 34 lines of the unstripped subjects;
- runs Ultracite's Oxlint pass (`oxlint --fix`, `oxfmt --write`) until nothing changes, and checks that:
  - the oracle's trace equals the corpus subject's. A's differs only in the key order `sort-keys` gave an object it returns, and the prepared subject is the reference;
  - `tsc` is clean;
  - the handoff is exactly the length reports.

**The handoff is filtered** in the collect and in every re-lint, as in the todo-comments, sort-keys and react-effects topics: `max-lines-per-function`, plus any diagnostic that isn't the prepared project's own, by rule and message. A real project would hand over 29, 22 and 51 issues. Here the filter shaped the runs: 20 of 21 retries were for rules outside it (`func-style` on new helper declarations, complexity moving with the code), and a length-only filter would have retried one run.

**Retry loop:** `runWithRetries` and `scripts/ultracite-adapters.cjs`, unchanged. The self-test runs Ultracite's real Oxlint adapter under Bun in a project with init's config, the user's rule and `node_modules` links, next to the mirror: all 43 comparisons match.

**Measurement.** Each attempt is measured as the agent left the file, as Oxfmt alone would leave it, and as verify left it:

- the size and complexity rules, attributed to functions, in five views, inline config honoured and ignored:
  - the user's Oxlint;
  - Oxlint with `max-lines`, `max-params` and `max-statements` on too;
  - Oxlint with SonarJS's cognitive complexity;
  - ESLint core with its length rules on;
  - Biome core with its length rules on;
- `tsc`;
- the oracle, exactly and ignoring object key order, and its structure measure (functions, entry lines, helpers' parameters, lines and call sites, call order);
- what the edit did: helpers, single-use, parameters, closures and shared mutable state (scope analysis), table or loop rewrites, `continue`s, the gaming moves, suppressions and exports;
- Ultracite's partition and what it would print;
- from the session log: commands run or refused, the agent's own checks, searches for tests, reads of an installed Vite, Next.js or VS Code copy, the final message, sentences about the function, behaviour risks, review, where to split, and exposure.

The hand classification is in `classifications.json`. It includes a reader judgement (easier, about the same or harder to follow than the original) by two raters, made from a blind packet. Rater 1 is the model that ran the experiment; rater 2 is a separate subagent that saw only the code.

**The deterministic paths.** `aggregate` runs `ultracite fix` and `--unsafe` with Oxlint, Biome and ESLint, each with its limit on, on each subject as upstream wrote it and as handed over. It uses the mirror and Ultracite's real adapters, which agree in all 36 cases.

**Oracle:** `corpus/scripts/length-oracle.cjs`, imported unchanged. The self-test has 43 cases, all as expected:

- the prepared subjects;
- the corpus's 30 variants, read from `length-examples.cjs` without running it, applied to the cleaned subject and normalised. Their verdicts and flagged functions match `examples.json`;
- the corpus's strip and join moves on the prepared subjects, as written;
- four hand-made cases.

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=length-limits
node scripts/prepare-subjects.cjs        # subjects/length-limits/ (runs ultracite init for each linter and adds the limit; stripped, checked, normalised; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (43) and the mirror against the CLI (43) -> results/length-limits/oracle-self-test.json (~3 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths and the mutant matrix (~6 min)
node scripts/report-tables.cjs > results/length-limits/tables.md
```

The oracle's C inputs include 200 files from the corpus clones, read as text, so `corpus/repos/` must be cloned to re-measure.

**Cost and time.** In this post's runs:

- Claude Code cost $0.85–2.22 a run (median $1.18, $15.45 for 12 runs).
- Codex used 34.6k–95.2k tokens a run (median 81.7k).
- Runs took 72–433 s (45 attempts in all), and measuring one takes about a minute.
- Two of the twelve Claude runs (both on C), and the Claude pilot, hit Ultracite's 5-minute timeout.
- The pilot (one run per agent on C) is in `results/length-limits/superseded-runs/` and not aggregated.

**Locks.** While an agent runs, these are locked as well:

- the corpus's length-limits examples, results and calibration, every `length-*` corpus script, and the whole corpus `out/` and `repos/`, history clones included;
- `research/bibliography/length-limits.md` and the bibliography README;
- `plans/`, `lint-configs/`, the temp directory's `ultracite-research-*` folders (the oracle's inputs among them) and the other topics' run roots;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`: the orchestrating session's scratchpad, the batch-log folder, the main checkout's `research/agent-experiment/plans`, and the other worktrees' corpus `repos/` and `out/`.

`node_modules` isn't locked, though the main checkout's has Vite 8 (with a later version of A's function), the Bun cache has Next.js 16.x builds, and an npx cache has a copy of VS Code's indentation guesser. Reads were checked instead, and there were none.

The method, numbers and caveats are in `agent-experiment/results/length-limits/REPORT.md`.

Harness changes made with this topic, all opt-in or behaviour-preserving:

- `scripts/topics/length-limits.cjs` (new), which imports the corpus's `length-oracle.cjs` and `length-lib.cjs` unchanged and reads `length-examples.cjs`'s variants without running it.
- `harness-tests/length-limits/mutants.json` (new): 40 mutants.
- `.gitignore` comments name the topic and pilots; the per-attempt patterns cover its logs.
- **Earlier topics, re-measured and re-aggregated from their committed runs** before and after these changes: before and after match exactly for all nine. Against the committed files:
  - cognitive-complexity differs only in the tool versions in `results.json`;
  - floating-promises, security-rules, dead-code and todo-comments show the known drift;
  - accessibility, todo-comments, sort-keys and react-effects differ in `hasSessionLog`, because their gitignored session logs aren't in this worktree;
  - every topic also shows new drift from toolchain updates committed after the react-effects runs (1fa337e6 Oxlint 1.89, daf7b0ff Biome 2.6.3, 72890bec Unicorn 79 and the ESLint plugins). It's in rule counts, messages, line numbers and tool versions; no run's response, outcome or oracle verdict changes.

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
