import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";

import { intFromEnv } from "./config";
import { median } from "./stats";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "benchmark", "results");

const WARMUPS = intFromEnv("TYPECHECK_WARMUPS", 2, 0);
const SAMPLES = intFromEnv("TYPECHECK_SAMPLES", 7);
const COMPILERS = ["tsgo", "tsrs"] as const;

type Compiler = (typeof COMPILERS)[number];

const COMPILER_BINARIES: Record<Compiler, string> = {
  tsgo: path.join(
    ROOT,
    "node_modules",
    "@typescript",
    "native-preview",
    "bin",
    "tsgo"
  ),
  tsrs: path.join(ROOT, "node_modules", "tsrs", "bin", "tsrs"),
};

const decoder = new TextDecoder();

const decode = (output: Uint8Array): string => decoder.decode(output).trim();

const combineProcessOutput = (stderr: Uint8Array, stdout: Uint8Array): string =>
  [decode(stderr), decode(stdout)].filter(Boolean).join("\n");

// Alternate which compiler runs first to reduce order effects.
const orderFor = (index: number): readonly Compiler[] =>
  index % 2 === 0 ? COMPILERS : [...COMPILERS].toReversed();

interface CompilerResult {
  medianMs: number;
  name: string;
  samplesMs: number[];
  version: string;
}

class CompilerFailureError extends Error {
  compiler: Compiler;

  constructor(compiler: Compiler, message: string) {
    super(message);
    this.name = "CompilerFailureError";
    this.compiler = compiler;
  }
}

const invoke = (compiler: Compiler, args: string[]): string => {
  const result = Bun.spawnSync(
    [process.execPath, COMPILER_BINARIES[compiler], ...args],
    {
      cwd: path.join(ROOT, "packages", "cli"),
      env: process.env,
      stderr: "pipe",
      stdout: "pipe",
    }
  );

  if (result.exitCode !== 0) {
    const diagnostics = combineProcessOutput(result.stderr, result.stdout);

    throw new CompilerFailureError(
      compiler,
      `${compiler} ${args.join(" ")} failed with exit code ${result.exitCode}${diagnostics ? `:\n${diagnostics}` : ""}`
    );
  }

  return decode(result.stdout);
};

const run = (compiler: Compiler): number => {
  const start = performance.now();
  invoke(compiler, ["--noEmit"]);

  return performance.now() - start;
};

const version = (compiler: Compiler): string => invoke(compiler, ["--version"]);

const measure = (): CompilerResult[] => {
  for (let index = 0; index < WARMUPS; index += 1) {
    for (const compiler of orderFor(index)) {
      run(compiler);
    }
  }

  const samples: Record<Compiler, number[]> = { tsgo: [], tsrs: [] };

  for (let index = 0; index < SAMPLES; index += 1) {
    for (const compiler of orderFor(index)) {
      samples[compiler].push(run(compiler));
    }
  }

  return COMPILERS.map((name) => ({
    medianMs: median(samples[name]),
    name,
    samplesMs: samples[name],
    version: version(name),
  }));
};

const environment = {
  arch: process.arch,
  bunVersion: Bun.version,
  platform: process.platform,
};

const method = `${WARMUPS} warmups and ${SAMPLES} measured runs per compiler. Zero-based even indexes run tsgo first, and odd indexes run tsrs first, for both warmups and samples. Each run invokes the compiler binary directly on the CLI package's --noEmit check without package-manager wrappers or Turbo caching.`;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

// The comparison is informational, not a gate. In CI, compiler failures here
// are reported with the failing compiler so the diagnostic report can be
// uploaded. The subsequent head build still checks the code with tsrs and
// remains authoritative for whether the project builds.
const reportFailure = (message: string, failedCompiler?: Compiler): never => {
  const failureContext = failedCompiler
    ? `The ${failedCompiler} comparison failed.`
    : "The compiler comparison failed.";

  mkdirSync(OUTPUT_DIR, { recursive: true });

  writeFileSync(
    path.join(OUTPUT_DIR, "typecheck.json"),
    `${JSON.stringify({ environment, error: message, failedCompiler, generatedAt: new Date().toISOString(), method }, null, 2)}\n`
  );

  writeFileSync(
    path.join(OUTPUT_DIR, "typecheck.html"),
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Ultracite type-check comparison</title>
</head>
<body>
  <main>
    <h1>Type-check comparison failed</h1>
    <p>${failureContext} No timings were recorded. See the details below.</p>
    <pre>${escapeHtml(message)}</pre>
  </main>
</body>
</html>
`
  );

  console.error(message);
  console.log(
    `::warning title=Type-checker benchmark::${failureContext} No comparison timings were recorded.`
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n## Type-checker benchmark\n\n${failureContext} No comparison timings were recorded. The benchmark is informational, so CI continues to the authoritative build check.\n\n<pre>${escapeHtml(message)}</pre>\n`
    );
  }

  process.exit(0);
};

const measureOrReport = (): CompilerResult[] => {
  try {
    return measure();
  } catch (error) {
    if (process.env.GITHUB_ACTIONS !== "true") {
      throw error;
    }

    const failedCompiler =
      error instanceof CompilerFailureError ? error.compiler : undefined;

    const message = error instanceof Error ? error.message : String(error);

    return reportFailure(message, failedCompiler);
  }
};

const results = measureOrReport();

const [before, after] = results;

if (!before || !after) {
  throw new Error("Expected benchmark results for tsgo and tsrs");
}

const speedup = before.medianMs / after.medianMs;

const report = {
  after,
  before,
  environment,
  generatedAt: new Date().toISOString(),
  method,
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
    <p class="summary">Ultracite CLI · ${report.generatedAt.slice(0, 10)}</p>
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
    <p class="caption">${SAMPLES} measured runs per compiler after ${WARMUPS} warmups. The order alternates to reduce order effects. Each run invokes the compiler binary directly and skips Turbo caching. See typecheck.json for raw samples, compiler versions, and the run date.</p>
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

// Formatting only matters for the committed copies of the report, so in CI a
// formatter failure leaves the report unformatted instead of failing the step.
if (formatted.exitCode !== 0) {
  const message = `Could not format benchmark report (exit ${formatted.exitCode})`;

  if (process.env.GITHUB_ACTIONS !== "true") {
    throw new Error(message);
  }

  console.log(
    `::warning title=Type-checker benchmark::${message}. The report was written unformatted.`
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
