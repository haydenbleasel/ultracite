// Medians of `ultracite check` from the repo's benchmark harness
// (`BENCH_FIXTURE_COPIES=6|60 BENCH_SAMPLES=5 BENCH_WARMUP=1
// BENCH_COMMANDS=check bun ./benchmark/index.ts`) on an Apple M1 Pro with
// Ultracite 8.3.1 (packed on 2026-11-18 from main at 09156707, before it was
// published), every engine measured in the same session with the 1-minute
// load average under 3. Re-run them all when a version below or a core preset
// moves, so the engines stay comparable. A figure is replaced when it falls
// outside the range of the new runs and kept when it is inside. Ranges on
// 2026-11-18, 42 files: Oxlint 318.4 to 322.4, Biome 251.1 to 272.7 (median
// 254.0, so the 2026-11-11 figure stands), ESLint 3099.2 to 3232.0. 420
// files: Oxlint 335.0 to 339.3, Biome 318.8 to 328.3, ESLint 10,227.7 to
// 10,384.3.
import type { ProviderId } from "./providers";

export interface BenchmarkRun {
  files: number;
  ms: Record<ProviderId, number>;
}

export const benchmarkRuns: BenchmarkRun[] = [
  { files: 42, ms: { biome: 260.4, eslint: 3122.6, oxlint: 321.8 } },
  { files: 420, ms: { biome: 323.3, eslint: 10_361, oxlint: 336 } },
];

// Two more ESLint timings from the same session, invoked as the harness does
// (`node node_modules/ultracite/dist/index.js check ...`): the median of ten
// checks of the ESLint page's components/button.tsx on its own, and the
// median of five checks of the 420-file project with ultracite/eslint/
// type-aware added (interleaved with five without it). Ranges on 2026-11-18:
// 2044.6 to 2140.9 for the single file (the button as `fix` leaves it), and
// 15,065.1 to 15,187.6 with type-aware (10,208.6 to 10,381.0 without).
export const eslintSingleFileMs = 2058.8;
export const eslintTypeAwareMs = 15_113.2;

export const benchmarkMachine = "an Apple M1 Pro";

export const toolchainVersions: Record<ProviderId, string> = {
  biome: "Biome 2.6.8",
  eslint: "ESLint 10.15.0, Prettier 3.10.1 and Stylelint 18.0.0",
  oxlint: "Oxlint 1.94.0 and Oxfmt 0.79.0",
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
