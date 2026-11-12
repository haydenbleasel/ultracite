// Medians of `ultracite check` from the repo's benchmark harness
// (`BENCH_FIXTURE_COPIES=6|60 BENCH_SAMPLES=5 BENCH_WARMUP=1
// BENCH_COMMANDS=check bun ./benchmark/index.ts`) on an Apple M1 Pro with
// Ultracite 8.2.0 (packed on 2026-11-11 from main at 2bd7aaad plus the preset
// changes it releases, before it was published), every engine measured in the
// same session. Re-run them all when a version below or a core preset moves,
// so the engines stay comparable.
import type { ProviderId } from "./providers";

export interface BenchmarkRun {
  files: number;
  ms: Record<ProviderId, number>;
}

export const benchmarkRuns: BenchmarkRun[] = [
  { files: 42, ms: { biome: 260.4, eslint: 3390.4, oxlint: 332.5 } },
  { files: 420, ms: { biome: 340.7, eslint: 10_912.4, oxlint: 341.8 } },
];

// Two more ESLint timings from the same session, invoked as the harness does
// (`node node_modules/ultracite/dist/index.js check ...`): the median of ten
// checks of the ESLint page's components/button.tsx on its own, and the
// median of five checks of the 420-file project with ultracite/eslint/
// type-aware added (interleaved with five without it).
export const eslintSingleFileMs = 2150.9;
export const eslintTypeAwareMs = 16_526.9;

export const benchmarkMachine = "an Apple M1 Pro";

export const toolchainVersions: Record<ProviderId, string> = {
  biome: "Biome 2.6.4",
  eslint: "ESLint 10.14.0, Prettier 3.9.10 and Stylelint 17.16.0",
  oxlint: "Oxlint 1.90.0 and Oxfmt 0.75.0",
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
