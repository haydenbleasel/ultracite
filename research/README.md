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

The analysis is specific to complexity rules. Measuring a different rule across the same corpus means adding it to the ESLint run in `scripts/analyze.cjs` and its aggregation in `scripts/aggregate.cjs`. Making the rule a parameter is the obvious next step.

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
