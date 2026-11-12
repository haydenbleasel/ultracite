// Medians of `ultracite check` from the repo's benchmark harness
// (`BENCH_FIXTURE_COPIES=6|60 BENCH_SAMPLES=5 BENCH_WARMUP=1
// BENCH_COMMANDS=check bun ./benchmark/index.ts`) on an Apple M1 Pro with
// Ultracite 8.2.0 (packed on 2026-11-11 from main at 2bd7aaad plus the preset
// changes it releases, before it was published), Biome, ESLint and Oxlint
// measured in the same session. Re-run them all when a version below or a core
// preset moves, so the engines stay comparable.
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
    ms: { biome: 260.4, bun: 362.5, eslint: 3390.4, oxlint: 332.5 },
  },
  {
    files: 420,
    ms: { biome: 340.7, bun: 370.1, eslint: 10_912.4, oxlint: 341.8 },
  },
];

// Two more ESLint timings from the same session, invoked as the harness does
// (`node node_modules/ultracite/dist/index.js check ...`): the median of ten
// checks of the ESLint page's components/button.tsx on its own, and the
// median of five checks of the 420-file project with ultracite/eslint/
// type-aware added (interleaved with five without it).
export const eslintSingleFileMs = 2150.9;
export const eslintTypeAwareMs = 16_526.9;

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
  biome: "Biome 2.6.4",
  bun: "Bun 1.4.4-canary.1",
  eslint: "ESLint 10.14.0, Prettier 3.9.10 and Stylelint 17.16.0",
  oxlint: "Oxlint 1.90.0 and Oxfmt 0.75.0",
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
