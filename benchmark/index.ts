import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";

import {
  ACTIVE_COMMANDS,
  ACTIVE_PROVIDERS,
  ALPHA,
  REGRESSION_RATIO,
  SAMPLE_RUNS,
  WARMUP_RUNS,
} from "./config";
import type { Command, Provider } from "./config";
import { prepareProject, resetSrc } from "./setup";
import type { PreparedProject } from "./setup";
import { mannWhitneyU, mean, median, stdev } from "./stats";

const WORK_ROOT = path.join(import.meta.dirname, ".work");

interface CliArgs {
  base?: string;
  head: string;
}

const parseArgs = (argv: readonly string[]): CliArgs => {
  let base: string | undefined;
  let head: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base") {
      base = argv[(index += 1)];
    } else if (arg === "--head") {
      head = argv[(index += 1)];
    }
  }
  if (!head) {
    throw new Error(
      "Usage: bun benchmark/index.ts --head <tarball> [--base <tarball>]"
    );
  }
  return { base, head };
};

interface RunOutcome {
  durationMs: number;
  status: number;
  stderr: string;
}

const runCommand = (project: PreparedProject, command: Command): RunOutcome => {
  const ultraciteBin = path.join(
    project.dir,
    "node_modules",
    "ultracite",
    "dist",
    "index.js"
  );
  const start = performance.now();
  const result = spawnSync("node", [ultraciteBin, command, "src"], {
    cwd: project.dir,
    encoding: "utf-8",
    env: {
      ...process.env,
      // Prepend the project's tool binaries so the CLI resolves them.
      PATH: `${project.binPath}${path.delimiter}${process.env.PATH ?? ""}`,
    },
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "ignore", "pipe"],
  });
  return {
    durationMs: performance.now() - start,
    status: result.status ?? 1,
    stderr: result.stderr ?? "",
  };
};

// A run that couldn't even start the linter (missing config, unresolved
// binary) returns near-instantly and would poison the numbers, so treat these
// as setup failures rather than fast results.
const FATAL_PATTERNS = [
  "No linter configuration found",
  "Failed to run",
  "command not found",
  "Could not find",
  "Cannot find",
];

const assertRunnable = (project: PreparedProject, command: Command): void => {
  const outcome = runCommand(project, command);
  const fatal = FATAL_PATTERNS.find((pattern) =>
    outcome.stderr.includes(pattern)
  );
  if (fatal) {
    throw new Error(
      `${project.buildLabel}/${project.provider} ${command} could not run (${fatal}):\n${outcome.stderr}`
    );
  }
};

interface Sample {
  provider: Provider;
  command: Command;
  base?: number[];
  head: number[];
}

const collectSamples = (
  projects: { base?: PreparedProject; head: PreparedProject },
  provider: Provider,
  command: Command
): Sample => {
  const builds: { label: "base" | "head"; project: PreparedProject }[] = [
    { label: "head", project: projects.head },
  ];
  if (projects.base) {
    builds.unshift({ label: "base", project: projects.base });
  }

  const samples: Record<"base" | "head", number[]> = { base: [], head: [] };

  const runOnce = (project: PreparedProject): number => {
    if (command === "fix") {
      resetSrc(project);
    }
    return runCommand(project, command).durationMs;
  };

  // Warmup — untimed, per build.
  for (const { project } of builds) {
    for (let warm = 0; warm < WARMUP_RUNS; warm += 1) {
      runOnce(project);
    }
  }

  // Measured — interleaved between builds, alternating which build leads each
  // round so a transient slow period hits both roughly equally.
  for (let sample = 0; sample < SAMPLE_RUNS; sample += 1) {
    const order = sample % 2 === 0 ? builds : [...builds].toReversed();
    for (const { label, project } of order) {
      samples[label].push(runOnce(project));
    }
  }

  return {
    base: projects.base ? samples.base : undefined,
    command,
    head: samples.head,
    provider,
  };
};

const fmt = (ms: number): string => `${ms.toFixed(1)}ms`;

interface Regression {
  provider: Provider;
  command: Command;
  ratio: number;
  pValue: number;
}

const analyze = (samples: readonly Sample[]): Regression[] => {
  const regressions: Regression[] = [];
  const lines: string[] = [];
  const summary: string[] = [];

  const compareMode = samples.every((sample) => sample.base);
  if (compareMode) {
    lines.push(
      "provider  command  base median  head median  ratio    p-value  verdict",
      "-".repeat(72)
    );
    summary.push(
      `| provider | command | base | head | ratio | p-value | verdict |`,
      `| --- | --- | ---: | ---: | ---: | ---: | :---: |`
    );
    for (const sample of samples) {
      const base = sample.base as number[];
      const baseMedian = median(base);
      const headMedian = median(sample.head);
      const ratio = headMedian / baseMedian;
      const { pValue } = mannWhitneyU(base, sample.head);
      const regressed = ratio > REGRESSION_RATIO && pValue < ALPHA;
      const verdict = regressed ? "REGRESSION" : "ok";
      if (regressed) {
        regressions.push({
          command: sample.command,
          pValue,
          provider: sample.provider,
          ratio,
        });
      }
      lines.push(
        `${sample.provider.padEnd(9)} ${sample.command.padEnd(7)} ${fmt(
          baseMedian
        ).padEnd(
          12
        )} ${fmt(headMedian).padEnd(12)} ${`${ratio.toFixed(2)}x`.padEnd(
          8
        )} ${pValue.toFixed(4).padEnd(8)} ${verdict}`
      );
      summary.push(
        `| ${sample.provider} | ${sample.command} | ${fmt(baseMedian)} | ${fmt(
          headMedian
        )} | ${ratio.toFixed(2)}x | ${pValue.toFixed(4)} | ${
          regressed ? "❌" : "✅"
        } |`
      );
    }
  } else {
    lines.push(
      "provider  command  median      mean        stdev",
      "-".repeat(52)
    );
    summary.push(
      `| provider | command | median | mean | stdev |`,
      `| --- | --- | ---: | ---: | ---: |`
    );
    for (const sample of samples) {
      lines.push(
        `${sample.provider.padEnd(9)} ${sample.command.padEnd(7)} ${fmt(
          median(sample.head)
        ).padEnd(12)} ${fmt(mean(sample.head)).padEnd(12)} ${fmt(
          stdev(sample.head)
        )}`
      );
      summary.push(
        `| ${sample.provider} | ${sample.command} | ${fmt(
          median(sample.head)
        )} | ${fmt(mean(sample.head))} | ${fmt(stdev(sample.head))} |`
      );
    }
  }

  console.log("");
  console.log(lines.join("\n"));
  console.log("");

  if (compareMode) {
    console.log(
      `Gate: fail when head/base ratio > ${REGRESSION_RATIO}x AND Mann-Whitney U p < ${ALPHA}`
    );
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const title = compareMode
      ? "## Ultracite performance benchmark (head vs base)"
      : "## Ultracite performance benchmark";
    let footer = "";
    if (compareMode) {
      footer =
        regressions.length > 0
          ? `\n**${regressions.length} regression(s) detected.**\n`
          : "\nNo statistically significant regressions.\n";
    }
    appendFileSync(
      summaryPath,
      `${title}\n\n${summary.join("\n")}\n${footer}\n`
    );
  }

  return regressions;
};

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  const compareMode = Boolean(args.base);

  console.log("Ultracite performance benchmark");
  console.log("=".repeat(72));
  console.log(`Providers:  ${ACTIVE_PROVIDERS.join(", ")}`);
  console.log(`Commands:   ${ACTIVE_COMMANDS.join(", ")}`);
  console.log(
    `Runs:       ${WARMUP_RUNS} warmup + ${SAMPLE_RUNS} measured per build`
  );
  console.log(
    `Mode:       ${compareMode ? "compare (head vs base)" : "single build"}`
  );

  rmSync(WORK_ROOT, { force: true, recursive: true });
  mkdirSync(WORK_ROOT, { recursive: true });

  const samples: Sample[] = [];

  for (const provider of ACTIVE_PROVIDERS) {
    console.log(`\nPreparing ${provider}...`);
    const head = prepareProject({
      buildLabel: "head",
      provider,
      tarball: args.head,
      workRoot: WORK_ROOT,
    });
    const base = args.base
      ? prepareProject({
          buildLabel: "base",
          provider,
          tarball: args.base,
          workRoot: WORK_ROOT,
        })
      : undefined;

    for (const command of ACTIVE_COMMANDS) {
      assertRunnable(head, command);
      if (base) {
        assertRunnable(base, command);
      }
      console.log(`  benchmarking ${provider} ${command}...`);
      samples.push(collectSamples({ base, head }, provider, command));
    }
  }

  const regressions = analyze(samples);

  if (regressions.length > 0) {
    console.error(`\n✗ ${regressions.length} performance regression(s):`);
    for (const regression of regressions) {
      console.error(
        `  ${regression.provider} ${regression.command}: ${regression.ratio.toFixed(
          2
        )}x slower (p=${regression.pValue.toFixed(4)})`
      );
    }
    process.exit(1);
  }

  console.log(
    compareMode
      ? "\n✓ No statistically significant performance regressions"
      : "\n✓ Benchmark complete"
  );
};

main();
