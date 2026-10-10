// Runs analyze.cjs for every repo in repos.json (in parallel, bounded), then biome-crosscheck.cjs
// for every repo. Usage: node run-all.cjs [--concurrency 4] [--only name,name]
"use strict";

const { spawn } = require("node:child_process");
const { join } = require("node:path");
const config = require("./repos.json");

const args = process.argv.slice(2);
const concurrency = Number(args[args.indexOf("--concurrency") + 1]) || 4;
const only = args.includes("--only")
  ? args[args.indexOf("--only") + 1].split(",")
  : null;
const names = config.repos
  .map((r) => r.name)
  .filter((n) => !only || only.includes(n));

function runScript(script, ...scriptArgs) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      ["--max-old-space-size=8192", join(__dirname, script), ...scriptArgs],
      {
        stdio: ["ignore", "inherit", "inherit"],
      }
    );
    child.on("exit", (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`${script} ${scriptArgs.join(" ")} exited ${code}`))
    );
  });
}

const CALIBRATION_FILES = [
  "cases.tsx",
  "cases2.tsx",
  "cases3.ts",
  "cases4.ts",
  "cases5.ts",
  "cases6.ts",
  "whatif-formatTimespan.ts",
];

async function pool(items, fn) {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    async () => {
      while (queue.length) await fn(queue.shift());
    }
  );
  await Promise.all(workers);
}

(async () => {
  // Largest first so the long pole starts early.
  const order = [...names].sort((a, b) =>
    a === "next.js" ? -1 : b === "next.js" ? 1 : 0
  );
  if (!args.includes("--biome-only"))
    await pool(order, (n) => runScript("analyze.cjs", n));
  if (!args.includes("--no-biome")) {
    await pool(names, (n) =>
      runScript("biome-crosscheck.cjs", n).catch((e) =>
        console.error(e.message)
      )
    );
    // oxlint parity reuses the config-free mirror that biome-crosscheck creates.
    await pool(names, (n) =>
      runScript("oxlint-parity.cjs", n).catch((e) => console.error(e.message))
    );
  }
  // Calibration cases (our own fixtures) through both implementations.
  await runScript(
    "analyze.cjs",
    "--files",
    "calibration",
    join(__dirname, "../calibration"),
    ...CALIBRATION_FILES
  );
  await runScript("biome-crosscheck.cjs", "calibration");
  await runScript("extract-examples.cjs");
  await runScript("aggregate.cjs");
  await runScript("report-tables.cjs");
  // biome-crosscheck prints a large summary; aggregate.cjs builds results.json afterwards.
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
