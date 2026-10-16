// Runs every accessibility script in order. From the repo root, after clone.sh and a11y-clone.sh:
//   node research/corpus/scripts/a11y-run-all.cjs [--skip-history]
// --skip-history skips the gh downloads of pre-fix files (a11y-history.cjs).
// The hand inputs (history.json, history-verdicts.json, decision-history.json, barrier-match.json
// and the rater labels in out/accessibility/labels-*.json, kept in classifications.json) aren't
// regenerated. a11y-sample.cjs reuses the frozen sample.json unless --resample is passed to it.
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const skipHistory = process.argv.includes("--skip-history");
const node = (script, ...args) => {
  const started = Date.now();
  console.log(`\n── ${script} ${args.join(" ")}`);
  execFileSync(
    process.execPath,
    ["--max-old-space-size=8192", join(__dirname, script), ...args],
    {
      stdio: "inherit",
    }
  );
  console.log(`   (${Math.round((Date.now() - started) / 1000)} s)`);
};

node("a11y-inventory.cjs");
node("a11y-census.cjs");
node("a11y-linters.cjs", "--calibration", "--autofix", "--corpus");
node("a11y-disagreements.cjs");
node("a11y-markers.cjs");
node("a11y-jsx-census.cjs", "--lint");
node("a11y-sample.cjs", "--worksheet", "--print");
const labels = join(
  __dirname,
  "..",
  "out",
  "accessibility",
  "labels-r1-hit.json"
);
if (existsSync(labels)) {
  node("a11y-sample.cjs", "--compute");
} else {
  console.log(
    "\n── a11y-sample.cjs --compute skipped: no rater labels in out/accessibility/ (classifications.json is kept as committed)"
  );
}
if (!skipHistory) {
  node("a11y-history.cjs");
}
node("a11y-examples.cjs");
node("a11y-tables.cjs");
