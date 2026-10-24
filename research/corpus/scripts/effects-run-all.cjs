// Runs every React effects script in order (research/corpus/results/react-effects/REPORT.md §9).
//
// Usage: node research/corpus/scripts/effects-run-all.cjs [--skip-history] [--skip-census]
// Copies go to $EFFECTS_TMP (default: the system temp directory's ultracite-research-react-effects/).
"use strict";

const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const args = process.argv.slice(2);
const skip = (name) => args.includes(`--skip-${name}`);
const node = (script, argv = [], env = {}) => {
  const t0 = Date.now();
  execFileSync(
    process.execPath,
    ["--max-old-space-size=8192", join(__dirname, script), ...argv],
    { env: { ...process.env, ...env }, stdio: "inherit" }
  );
  console.log(
    `— ${script} ${argv.join(" ")} (${((Date.now() - t0) / 1000).toFixed(0)} s)`
  );
};

node("effects-inventory.cjs");
node("effects-census.cjs");
if (!skip("census")) {
  const focus = require("./effects-lib.cjs").OXLINT_HOOK_RULES.join(",");
  node(
    "rule-census.cjs",
    ["--topic", "react-effects", "--presets", "core,react", "--focus", focus],
    { CORPUS_REPO_LISTS: "repos-accessibility.json" }
  );
}
node("effects-linters.cjs");
node("effects-disagreements.cjs");
node("effects-fixes.cjs");
node("effects-markers.cjs");
node("effects-calibration.cjs");
if (!skip("history")) {
  node("effects-history.cjs", ["--disables", "--bugs", "--scale"]);
}
node("effects-sample.cjs", ["--worksheet", "--print"]);
node("effects-sample.cjs", ["--compute"]);
node("effects-agent-runs.cjs");
node("effects-examples.cjs");
node("effects-tables.cjs");
