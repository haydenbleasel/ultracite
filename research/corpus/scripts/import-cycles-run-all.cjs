// Runs the import-cycles topic's scripts in order. The hand inputs (results/import-cycles/history.json,
// decision-history.json, out/import-cycles/labels-*.json) are read, not regenerated;
// --skip-history skips the step that downloads the historical files with gh.
//
// Usage (from the repo root):
//   bash research/corpus/scripts/clone.sh
//   node research/corpus/scripts/import-cycles-run-all.cjs [--skip-history]
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const ic = require("./import-cycles-lib.cjs");

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

step("import-cycles-inventory.cjs");
step("import-cycles-census.cjs");
step("import-cycles-graph.cjs", [], 16_384);
step(
  "import-cycles-linters.cjs",
  ["--calibration", "--autofix", "--corpus"],
  12_288
);
if (!ic.flag("skip-history")) {
  step("import-cycles-history.cjs");
}
step("import-cycles-examples.cjs");
step("import-cycles-sample.cjs", ["--worksheet", "--print"]);
if (existsSync(join(ic.OUT_DIR, "labels-rater1.json"))) {
  step("import-cycles-sample.cjs", ["--compute"]);
}
step("import-cycles-tables.cjs");
