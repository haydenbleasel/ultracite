// Medians of `ultracite check` from the repo's benchmark harness
// (`BENCH_FIXTURE_COPIES=6|60 BENCH_SAMPLES=5 BENCH_WARMUP=1
// bun ./benchmark/index.ts`) on an Apple M1 Pro with Ultracite 7.12.4, every
// engine measured in the same session. Re-run them all when a version below
// moves, so the engines stay comparable.
import type { ProviderId } from "./providers";

export interface BenchmarkRun {
  files: number;
  ms: Record<ProviderId, number>;
}

export const benchmarkRuns: BenchmarkRun[] = [
  { files: 42, ms: { biome: 270.5, eslint: 6398.3, oxlint: 353.4 } },
  { files: 420, ms: { biome: 379.1, eslint: 29_318.6, oxlint: 368.1 } },
];

export const benchmarkMachine = "an Apple M1 Pro";

export const toolchainVersions: Record<ProviderId, string> = {
  biome: "Biome 2.5.15",
  eslint: "ESLint 10.12.0, Prettier 3.9.10 and Stylelint 17.16.0",
  oxlint: "Oxlint 1.87.0 and Oxfmt 0.72.0",
};

export const toolchainNames: Record<ProviderId, string> = {
  biome: "Biome",
  eslint: "ESLint + Prettier + Stylelint",
  oxlint: "Oxlint + Oxfmt",
};

export const MS_PER_SECOND = 1000;
const TEN_SECONDS_MS = 10 * MS_PER_SECOND;

/** Seconds as shown: two decimals under ten seconds, one above. */
export const shownSeconds = (ms: number): number =>
  Number((ms / MS_PER_SECOND).toFixed(ms < TEN_SECONDS_MS ? 2 : 1));

/** "352 ms" under a second, "3.32 s" or "11.2 s" above. */
export const formatMs = (ms: number): string =>
  ms < MS_PER_SECOND ? `${Math.round(ms)} ms` : `${shownSeconds(ms)} s`;

/** A run by its file count. */
export const runFor = (files: number): BenchmarkRun => {
  const run = benchmarkRuns.find((candidate) => candidate.files === files);
  if (!run) {
    throw new Error(`No benchmark run for ${files} files`);
  }
  return run;
};
