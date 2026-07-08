import process from "node:process";

export const PROVIDERS = ["oxlint", "biome", "eslint"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const COMMANDS = ["check", "fix"] as const;
export type Command = (typeof COMMANDS)[number];

const intFromEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Math.trunc(Number(raw));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const floatFromEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Runs discarded before measurement to warm caches and JIT. */
export const WARMUP_RUNS = intFromEnv("BENCH_WARMUP", 2);

/** Measured runs per (build, provider, command). More runs = more statistical power. */
export const SAMPLE_RUNS = intFromEnv("BENCH_SAMPLES", 10);

/**
 * How many times the fixture tree is copied into each project so rule
 * execution (the part regressions affect) dominates fixed process startup
 * cost and the timing signal is stable.
 */
export const FIXTURE_COPIES = intFromEnv("BENCH_FIXTURE_COPIES", 6);

/**
 * A head/base median ratio above this counts as a regression — but only when
 * it is also statistically significant (see BENCH_ALPHA). 1.25 = 25% slower.
 */
export const REGRESSION_RATIO = floatFromEnv("BENCH_REGRESSION_RATIO", 1.25);

/** Significance level for the one-sided Mann-Whitney U test. */
export const ALPHA = floatFromEnv("BENCH_ALPHA", 0.05);

/** Commands to run; override with e.g. BENCH_COMMANDS=check to skip fix. */
export const ACTIVE_COMMANDS: readonly Command[] = (() => {
  const raw = process.env.BENCH_COMMANDS;
  if (!raw) {
    return COMMANDS;
  }
  const requested = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is Command =>
      (COMMANDS as readonly string[]).includes(value)
    );
  return requested.length > 0 ? requested : COMMANDS;
})();

/** Providers to run; override with e.g. BENCH_PROVIDERS=oxlint,biome. */
export const ACTIVE_PROVIDERS: readonly Provider[] = (() => {
  const raw = process.env.BENCH_PROVIDERS;
  if (!raw) {
    return PROVIDERS;
  }
  const requested = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is Provider =>
      (PROVIDERS as readonly string[]).includes(value)
    );
  return requested.length > 0 ? requested : PROVIDERS;
})();
