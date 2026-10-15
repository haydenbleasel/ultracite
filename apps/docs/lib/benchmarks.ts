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
//
// The Bun numbers (`bun` below, and typeAware, bunParity and toolOnlyMs) are
// older: Ultracite 8.0.1 packed from main at 367d9085 with the Bun provider
// added, on Bun 1.4.4-canary.1, from one session on the evening of
// 2026-10-14 (machine load average about 4 from other apps) with TMPDIR
// pointed at a near-empty directory, since `bun lint` slows down under a
// parent directory with tens of thousands of entries, which macOS's own
// TMPDIR had. Re-run all four engines in one session on the first stable Bun
// with `bun lint` before the Bun provider ships.
import type { ProviderId } from "./providers";

export interface BenchmarkRun {
  files: number;
  ms: Record<ProviderId, number>;
}

export const benchmarkRuns: BenchmarkRun[] = [
  {
    files: 42,
    ms: { biome: 260.4, bun: 362.5, eslint: 3122.6, oxlint: 321.8 },
  },
  {
    files: 420,
    ms: { biome: 323.3, bun: 370.1, eslint: 10_361, oxlint: 336 },
  },
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

// The same 420-file project with `options: { typeAware: true }`, as
// `init --type-aware` writes it, in the Bun session: Oxlint with
// oxlint-tsgolint 7.0.2004 against Bun, interleaved, median of five. Both
// reported the same problems, rule for rule.
export const typeAware = {
  ms: { bun: 431.5, oxlint: 623.1 },
  problems: 2760,
};

// Oxlint and Oxfmt against `bun lint` and `bun fmt` through the same configs
// on the 420-file project, Bun session: the lint problems matched line for
// line, and the format checks flagged the same files.
export const bunParity = { lintProblems: 540, unformattedFiles: 240 };

// The linters and formatters on their own on the 420-file project, without
// Node or the CLI around them (median of ten runs after two warmups), and
// starting Node and the CLI alone (`ultracite --version`), Bun session.
export const toolOnlyMs = {
  bunFmt: 64.3,
  bunLint: 58.6,
  cliStartup: 230.3,
  oxfmt: 91.4,
  oxlint: 99.8,
};

export const benchmarkMachine = "an Apple M1 Pro";

export const toolchainVersions: Record<ProviderId, string> = {
  biome: "Biome 2.6.8",
  bun: "Bun 1.4.4-canary.1",
  eslint: "ESLint 10.15.0, Prettier 3.10.1 and Stylelint 18.0.0",
  oxlint: "Oxlint 1.94.0 and Oxfmt 0.79.0",
};

export const toolchainNames: Record<ProviderId, string> = {
  biome: "Biome",
  bun: "Bun",
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
