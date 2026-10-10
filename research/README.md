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

The subjects, the rule and its limit are cognitive-complexity specific: see `SUBJECTS` in `scripts/prepare-subjects.cjs`, `lintCognitive` and `AGENT_LIMIT` in `scripts/lib.cjs`, and `scripts/behavior.ts`. A new topic needs its own subjects, a behavior oracle for them, and the rule swapped in.
