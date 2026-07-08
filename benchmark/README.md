# Ultracite performance benchmarks

Guards against performance regressions in `ultracite check` / `ultracite fix` across all three providers — **oxlint**, **biome**, and **eslint**. It exists because [#741](https://github.com/haydenbleasel/ultracite/issues/741) shipped a ~40x oxlint slowdown (JS plugins folded into the core preset) that no automated check caught.

## How it works

For each provider the harness builds a self-contained project, installs the provider's real tools, runs `ultracite init` to generate the actual config, and copies in a fixed fixture tree (`fixtures/`). It then times the real `ultracite check` / `ultracite fix` command many times and reports the median.

Only the lint invocations are timed — all setup (installs, `init`, fixture copies) happens up front and is excluded.

### The regression gate (CI)

Wall-clock timings on CI runners are noisy, so the gate does **not** compare against committed numbers. Instead, on every PR it builds both the PR (`head`) and the PR's base (`main`) and benchmarks them **interleaved on the same runner**, which cancels out machine speed.

A provider/command is flagged as a regression only when it clears **both** bars:

- **effect size** — head/base median ratio `> BENCH_REGRESSION_RATIO` (default `1.25`, i.e. 25% slower), and
- **significance** — a one-sided [Mann–Whitney U](./stats.ts) test with `p < BENCH_ALPHA` (default `0.05`).

Requiring both means normal run-to-run noise passes while a real slowdown (like the #741 blow-up) fails the job. The results are also written to the GitHub Step Summary.

## Running locally

```bash
# Build + pack the current working tree, then benchmark it (absolute numbers).
bun run build --filter ultracite
cd packages/cli && npm pack && cd -
bun ./benchmark/index.ts --head packages/cli/ultracite-*.tgz

# Compare two packed builds (the CI gate). Pack a base build the same way.
bun ./benchmark/index.ts --base base.tgz --head head.tgz
```

## Tuning (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `BENCH_WARMUP` | `2` | Warmup runs discarded per build |
| `BENCH_SAMPLES` | `10` | Measured runs per build |
| `BENCH_FIXTURE_COPIES` | `6` | Times the fixture tree is duplicated (amplifies the signal) |
| `BENCH_REGRESSION_RATIO` | `1.25` | Head/base median ratio that counts as a regression |
| `BENCH_ALPHA` | `0.05` | Significance level for the U test |
| `BENCH_PROVIDERS` | `oxlint,biome,eslint` | Subset of providers to run |
| `BENCH_COMMANDS` | `check,fix` | Subset of commands to run |

Example — a quick oxlint-only smoke test:

```bash
BENCH_PROVIDERS=oxlint BENCH_COMMANDS=check BENCH_SAMPLES=5 \
  bun ./benchmark/index.ts --head packages/cli/ultracite-*.tgz
```

## Notes

- The ESLint project installs a few packages `ultracite init --linter eslint` does not currently record (the `stylelint-config-*` packages its stylelint config extends, and `storybook`, a required peer of `eslint-plugin-storybook`). See [`setup.ts`](./setup.ts). This is benchmark-only setup so the ESLint toolchain actually runs; it does not change what ultracite ships.
