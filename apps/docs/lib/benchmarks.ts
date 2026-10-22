// Medians of `ultracite check` from the repo's benchmark harness
// (`BENCH_FIXTURE_COPIES=6|60 BENCH_SAMPLES=5 BENCH_WARMUP=1
// bun ./benchmark/index.ts`) on an Apple M1 Pro with Node 24.14.1 and
// Ultracite 8.0.1 packed from the working tree on main at 367d9085 with the
// Bun provider added, before it was published. Every number in this file
// comes from one session on the evening of 2026-10-14 (machine load average
// about 4 from other apps), with TMPDIR pointed at a near-empty directory:
// `bun lint` slows down under a parent directory with tens of thousands of
// entries, which macOS's own TMPDIR had. Re-run them all when a version below
// moves, so the engines stay comparable.
import type { ProviderId } from "./providers";

export interface BenchmarkRun {
  files: number;
  ms: Record<ProviderId, number>;
}

export const benchmarkRuns: BenchmarkRun[] = [
  { files: 42, ms: { biome: 334.1, bun: 362.5, eslint: 4296.9, oxlint: 424 } },
  {
    files: 420,
    ms: { biome: 456.8, bun: 370.1, eslint: 14_902.3, oxlint: 448.1 },
  },
];

// Two more ESLint timings from the same session, invoked as the harness does
// (`node node_modules/ultracite/dist/index.js check ...`): the median of ten
// checks of the ESLint page's components/button.tsx on its own, and the
// median of five checks of the 420-file project with ultracite/eslint/
// type-aware added (interleaved with five without it).
export const eslintSingleFileMs = 2248.7;
export const eslintTypeAwareMs = 19_523.2;

// The same 420-file project with `options: { typeAware: true }`, as
// `init --type-aware` writes it, in the same session: Oxlint with
// oxlint-tsgolint 7.0.2004 against Bun, interleaved, median of five. Both
// reported the same problems, rule for rule.
export const typeAware = {
  ms: { bun: 431.5, oxlint: 623.1 },
  problems: 2760,
};

// Oxlint and Oxfmt against `bun lint` and `bun fmt` through the same configs
// on the 420-file project, same session: the lint problems matched line for
// line, and the format checks flagged the same files.
export const bunParity = { lintProblems: 540, unformattedFiles: 240 };

// The linters and formatters on their own on the 420-file project, without
// Node or the CLI around them (median of ten runs after two warmups), and
// starting Node and the CLI alone (`ultracite --version`), same session.
export const toolOnlyMs = {
  bunFmt: 64.3,
  bunLint: 58.6,
  cliStartup: 230.3,
  oxfmt: 91.4,
  oxlint: 99.8,
};

export const benchmarkMachine = "an Apple M1 Pro";

export const toolchainVersions: Record<ProviderId, string> = {
  biome: "Biome 2.5.15",
  bun: "Bun 1.4.4-canary.1",
  eslint: "ESLint 10.12.0, Prettier 3.9.10 and Stylelint 17.16.0",
  oxlint: "Oxlint 1.88.0 and Oxfmt 0.71.0",
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
