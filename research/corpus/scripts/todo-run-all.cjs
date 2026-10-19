// Runs the TODO-comments measurements in order. Needs the corpus clones (clone.sh, a11y-clone.sh)
// and, for the history steps, the history clones (todo-history-clone.sh).
//
// Usage: node research/corpus/scripts/todo-run-all.cjs [--skip-history] [--skip-gh] [--skip-census]
//   --skip-history  skip blame, survival, removal classification and the removal worksheet
//   --skip-gh       reuse the cached issue states and Biome rules-sources page (no network)
//   --skip-census   skip the Oxlint rule census (rule-census.cjs, about 3 minutes)
"use strict";

const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const args = process.argv.slice(2);
const skip = (name) => args.includes(`--skip-${name}`);
const node = (script, ...rest) => {
  const started = Date.now();
  console.log(`\n== ${script} ${rest.join(" ")}`);
  execFileSync(
    process.execPath,
    ["--max-old-space-size=8192", join(__dirname, script), ...rest],
    { stdio: "inherit" }
  );
  console.log(`   (${Math.round((Date.now() - started) / 1000)}s)`);
};

node("todo-inventory.cjs", ...(skip("gh") ? [] : ["--fetch"]));
node("todo-census.cjs");
if (!skip("census")) {
  node("todo-rule-census.cjs");
}
node("todo-linters.cjs", "--calibration", "--autofix", "--corpus");
node("todo-markers.cjs");
node("todo-issues.cjs", ...(skip("gh") ? [] : ["--fetch"]));
if (!skip("history")) {
  node("todo-history.cjs", "--blame", "--survival", "--classify", "--sample");
}
node("todo-sample.cjs", "--worksheet", "--print");
node("todo-sample.cjs", "--compute");
node("todo-agent-runs.cjs");
node("todo-examples.cjs");
node("todo-tables.cjs");
