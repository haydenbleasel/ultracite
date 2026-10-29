import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "benchmark", "results");

const positiveIntegerFromEnv = (
  name: string,
  fallback: number,
  minimum: number
): number => {
  const raw = process.env[name];

  if (raw === undefined) {
    return fallback;
  }

  if (!/^\d+$/u.test(raw)) {
    throw new Error(
      `${name} must be an integer greater than or equal to ${minimum}`
    );
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(
      `${name} must be an integer greater than or equal to ${minimum}`
    );
  }

  return value;
};

const WARMUPS = positiveIntegerFromEnv("TYPECHECK_WARMUPS", 2, 0);
const SAMPLES = positiveIntegerFromEnv("TYPECHECK_SAMPLES", 7, 1);
const COMPILERS = ["tsgo", "tsrs"] as const;

interface CompilerResult {
  medianMs: number;
  name: string;
  samplesMs: number[];
  version: string;
}

const median = (values: number[]): number => {
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];

  if (upper === undefined) {
    throw new Error("Cannot compute the median of an empty sample");
  }

  if (sorted.length % 2 !== 0) {
    return upper;
  }

  const lower = sorted[middle - 1] ?? upper;

  return (lower + upper) / 2;
};

const run = (compiler: (typeof COMPILERS)[number]): number => {
  const start = performance.now();

  const result = Bun.spawnSync(
    ["bun", "run", "--cwd", "packages/cli", compiler, "--noEmit"],
    {
      cwd: ROOT,
      env: process.env,
      stderr: "pipe",
      stdout: "pipe",
    }
  );

  if (result.exitCode !== 0) {
    const stderr = new TextDecoder().decode(result.stderr).trim();
    const stdout = new TextDecoder().decode(result.stdout).trim();
    throw new Error(
      `${compiler} --noEmit failed with exit code ${result.exitCode}${stderr || stdout ? `:\n${stderr || stdout}` : ""}`
    );
  }

  return performance.now() - start;
};

const version = (compiler: (typeof COMPILERS)[number]): string => {
  const result = Bun.spawnSync(
    ["bun", "run", "--cwd", "packages/cli", compiler, "--version"],
    { cwd: ROOT, stderr: "pipe", stdout: "pipe" }
  );

  if (result.exitCode !== 0) {
    const stderr = new TextDecoder().decode(result.stderr).trim();
    throw new Error(
      `${compiler} --version failed with exit code ${result.exitCode}${stderr ? `:\n${stderr}` : ""}`
    );
  }

  return new TextDecoder().decode(result.stdout).trim();
};

for (let index = 0; index < WARMUPS; index += 1) {
  for (const compiler of COMPILERS) {
    run(compiler);
  }
}

const samples = new Map<(typeof COMPILERS)[number], number[]>([
  ["tsgo", []],
  ["tsrs", []],
]);

for (let index = 0; index < SAMPLES; index += 1) {
  const order = index % 2 === 0 ? COMPILERS : [...COMPILERS].toReversed();

  for (const compiler of order) {
    const compilerSamples = samples.get(compiler);

    if (!compilerSamples) {
      throw new Error(`Missing sample bucket for ${compiler}`);
    }

    compilerSamples.push(run(compiler));
  }
}

const results: CompilerResult[] = COMPILERS.map((name) => {
  const samplesMs = samples.get(name);

  if (!samplesMs) {
    throw new Error(`Missing samples for ${name}`);
  }

  return {
    medianMs: median(samplesMs),
    name,
    samplesMs,
    version: version(name),
  };
});

const [before, after] = results;

if (!before || !after) {
  throw new Error("Expected benchmark results for tsgo and tsrs");
}

const speedup = before.medianMs / after.medianMs;

const report = {
  after,
  before,
  environment: {
    arch: process.arch,
    bunVersion: Bun.version,
    platform: process.platform,
  },
  generatedAt: new Date().toISOString(),
  method: `${WARMUPS} warmups, ${SAMPLES} measured runs per compiler, alternating run order. Each run executes the CLI package's --noEmit check without Turbo caching.`,
  speedup,
};

mkdirSync(OUTPUT_DIR, { recursive: true });

writeFileSync(
  `${OUTPUT_DIR}/typecheck.json`,
  `${JSON.stringify(report, null, 2)}\n`
);

const beforeSeconds = (before.medianMs / 1000).toFixed(2);
const afterSeconds = (after.medianMs / 1000).toFixed(2);
const fastestDuration = 3.2;

const tsgoDuration =
  fastestDuration * Math.max(1, before.medianMs / after.medianMs);

const tsrsDuration =
  fastestDuration * Math.max(1, after.medianMs / before.medianMs);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ultracite type-check race</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; padding: 40px 20px; background: #10151b; color: #f3f5f7; }
    main { max-width: 860px; margin: auto; }
    h1 { margin-bottom: 8px; font-size: clamp(2rem, 5vw, 3.5rem); letter-spacing: -.05em; }
    .summary { color: #a9b4bf; margin: 0 0 36px; }
    .race { position: relative; display: grid; gap: 28px; padding: 24px; border: 1px solid #303b46; border-radius: 18px; background: #171e26; overflow: hidden; }
    .lane { position: relative; height: 68px; display: flex; align-items: center; border-bottom: 2px dashed #364451; }
    .label { position: absolute; left: 0; top: -14px; color: #bdc7d1; font-size: 13px; }
    .ball { width: 42px; height: 42px; border-radius: 50%; position: absolute; left: 0; display: grid; place-items: center; font-size: 12px; font-weight: 800; box-shadow: 0 6px 20px #0008; animation-name: race; animation-timing-function: cubic-bezier(.12,.72,.17,1); animation-fill-mode: both; }
    .tsgo { background: #3178c6; color: white; animation-delay: .2s; animation-duration: ${tsgoDuration.toFixed(2)}s; }
    .tsrs { background: #df6a38; color: white; animation-delay: .2s; animation-duration: ${tsrsDuration.toFixed(2)}s; }
    .finish { position: absolute; top: 20px; bottom: 20px; right: 46px; border-left: 3px solid #e8edf2; opacity: .75; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
    .stat { padding: 18px; border-radius: 14px; background: #171e26; border: 1px solid #303b46; }
    .stat strong { display: block; margin-top: 5px; font-size: 1.45rem; }
    .caption { color: #a9b4bf; font-size: 13px; margin-top: 24px; line-height: 1.6; }
    @keyframes race { from { left: 0; transform: rotate(0); } to { left: calc(100% - 64px); transform: rotate(900deg); } }
    @media (max-width: 560px) { .stats { grid-template-columns: 1fr; } body { padding: 28px 14px; } }
    @media (prefers-reduced-motion: reduce) { .ball { animation-duration: .01ms; } }
  </style>
</head>
<body>
  <main>
    <h1>Type-check race</h1>
    <p class="summary">Ultracite CLI · ${new Date(report.generatedAt).toLocaleDateString()}</p>
    <section class="race" aria-label="Animated compiler speed comparison">
      <div class="finish" aria-hidden="true"></div>
      <div class="lane"><span class="label">TypeScript Go · ${beforeSeconds}s median</span><span class="ball tsgo" aria-label="tsgo">Go</span></div>
      <div class="lane"><span class="label">tsrs · ${afterSeconds}s median</span><span class="ball tsrs" aria-label="tsrs">rs</span></div>
    </section>
    <section class="stats" aria-label="Benchmark results">
      <div class="stat">tsgo median<strong>${beforeSeconds}s</strong></div>
      <div class="stat">tsrs median<strong>${afterSeconds}s</strong></div>
      <div class="stat">tsrs speed<strong>${speedup.toFixed(2)}×</strong></div>
    </section>
    <p class="caption">${SAMPLES} measured runs per compiler after ${WARMUPS} warmups. The order alternates to reduce order effects. Timings include the Bun CLI launch and skip Turbo caching. See typecheck.json for raw samples, compiler versions, and the run date.</p>
  </main>
</body>
</html>
`;

writeFileSync(`${OUTPUT_DIR}/typecheck.html`, html);

const formatted = Bun.spawnSync(
  [
    "bun",
    "run",
    "oxfmt",
    "--write",
    "benchmark/results/typecheck.html",
    "benchmark/results/typecheck.json",
  ],
  { cwd: ROOT, stderr: "inherit", stdout: "inherit" }
);

if (formatted.exitCode !== 0) {
  throw new Error(
    `Could not format benchmark report (exit ${formatted.exitCode})`
  );
}

console.log(
  `tsgo ${beforeSeconds}s → tsrs ${afterSeconds}s (${speedup.toFixed(2)}×); wrote benchmark/results/typecheck.html and typecheck.json`
);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\n## Type-checker benchmark\n\n| Compiler | Median |\n| --- | ---: |\n| ${before.name} (${before.version}) | ${before.medianMs.toFixed(0)} ms |\n| ${after.name} (${after.version}) | ${after.medianMs.toFixed(0)} ms |\n\n**${after.name} speedup: ${speedup.toFixed(2)}×.** The animated report and raw samples are available in the typecheck-benchmark workflow artifact.\n`
  );
}
