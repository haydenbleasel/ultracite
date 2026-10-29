# Ultracite performance benchmarks

Guards against performance regressions in `ultracite check` / `ultracite fix` across all three providers — **oxlint**, **biome**, and **eslint**. It exists because [#741](https://github.com/haydenbleasel/ultracite/issues/741) shipped a ~40x oxlint slowdown (JS plugins folded into the core preset) that no automated check caught.

## Type-checker comparison

`bun benchmark/typecheck.ts` compares `tsgo --noEmit` with `tsrs --noEmit` for `packages/cli`, alternating the run order after warmups. It invokes each compiler binary directly, writes raw samples and compiler versions to `benchmark/results/typecheck.json`, and an animated race report to `benchmark/results/typecheck.html`. Timings exclude package-manager wrapper startup and do not use Turbo's cache. Both compilers are installed with the workspace, so a frozen install is enough to run the comparison. Local defaults are two warmups and seven measured runs; the PR workflow uses one warmup and five measured runs to keep the CI step short.

The PR benchmark workflow runs this comparison on each pull request and uploads the HTML and JSON reports as the `typecheck-benchmark` artifact. It also adds the medians and speedup to the workflow summary. This is a compiler-to-compiler measurement on the PR's sources; the separate lint benchmark below remains the base-versus-head regression gate. In GitHub Actions, a compiler failure is identified by compiler name and reported as a warning with details in the summary and JSON report; the informational comparison step exits successfully so the authoritative head build can run. That build still requires `tsrs`, so if `tsrs` rejects the code, the job fails after the report is uploaded. The upload step also runs after unexpected benchmark failures and uploads any report files already written. A formatter failure on the report is a warning too. Locally the script fails instead.

Set `TYPECHECK_WARMUPS` and `TYPECHECK_SAMPLES` to adjust the run counts. The committed HTML and JSON are one machine's dated measurement, not a CI performance gate.

## How it works

For each provider the harness builds a self-contained project in the OS temp directory (`ultracite-benchmark`, cleared at the start of each run), installs the provider's real tools, runs `ultracite init` to generate the actual config, and copies in a fixed fixture tree (`fixtures/`). It then times the real `ultracite check` / `ultracite fix` command many times and reports the median.

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
