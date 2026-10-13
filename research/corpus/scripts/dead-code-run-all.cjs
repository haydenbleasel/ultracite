// Runs the dead-code topic's scripts in order. The hand inputs (out/dead-code/labels-*.json,
// results/dead-code/history.json) are read, not regenerated; --skip-history skips the step that
// downloads the historical files with gh.
//
// Usage (from the repo root):
//   bash research/corpus/scripts/clone.sh
//   node research/corpus/scripts/dead-code-run-all.cjs [--skip-history]
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./dead-code-lib.cjs");

const step = (script, extra = [], heap = 8192) => {
  const started = Date.now();
  console.log(`\n▶ ${script} ${extra.join(" ")}`);
  execFileSync(
    process.execPath,
    [`--max-old-space-size=${heap}`, join(__dirname, script), ...extra],
    { stdio: "inherit" }
  );
  console.log(`  ${script}: ${Math.round((Date.now() - started) / 1000)}s`);
};

step("dead-code-inventory.cjs");
step("dead-code-census.cjs");
step(
  "dead-code-linters.cjs",
  ["--calibration", "--autofix", "--corpus"],
  12_288
);
step("dead-code-disagreements.cjs");
step("dead-code-typed.cjs", [], 12_288);
step("dead-code-exports.cjs", [], 16_384);
step("dead-code-clones.cjs", [], 16_384);
step("dead-code-markers.cjs");
step("dead-code-sample.cjs", ["--worksheet"]);
if (existsSync(join(lib.OUT_DIR, "labels-unused.json"))) {
  step("dead-code-merge-labels.cjs");
  step("dead-code-sample.cjs", ["--compute"]);
}
if (!lib.flag("skip-history")) {
  step("dead-code-history.cjs");
}
step("dead-code-examples.cjs");
step("dead-code-tables.cjs");
