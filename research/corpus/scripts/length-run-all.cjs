// Runs every length-limits step in order. Pass --skip-history to skip the history tracking (the
// slowest step, which needs the history clones), --skip-census to skip the shared rule census, and
// --skip-format to skip the formatter experiment.
//
// Usage: node research/corpus/scripts/length-run-all.cjs [--skip-history] [--skip-census] [--skip-format]
"use strict";

const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const args = process.argv.slice(2);
const skip = (name) => args.includes(`--skip-${name}`);
const node = (script, extra = [], env = {}) => {
  const t0 = Date.now();
  const r = spawnSync(
    process.execPath,
    ["--max-old-space-size=12288", join(__dirname, script), ...extra],
    { env: { ...process.env, ...env }, stdio: "inherit" }
  );
  console.log(
    `${script} ${extra.join(" ")}: exit ${r.status}, ${((Date.now() - t0) / 1000).toFixed(0)}s`
  );
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
};

node("length-rules.cjs");
node("length-census.cjs");
if (!skip("census")) {
  node(
    "rule-census.cjs",
    [
      "--topic",
      "length-limits",
      "--presets",
      "core,react,js-plugins",
      "--focus",
      "max-classes-per-file,max-nested-callbacks,complexity,sonarjs/max-switch-cases,sonarjs/max-union-size,sonarjs/cognitive-complexity,sonarjs/no-nested-functions,sonarjs/expression-complexity",
    ],
    { CORPUS_REPO_LISTS: "repos-accessibility.json" }
  );
}
// rule-census.cjs leaves its generated Oxlint config in the gitignored out/; remove it so no
// config file sits under research/ between runs
require("node:fs").rmSync(
  join(__dirname, "../out/rule-census/length-limits/oxlint.config.mjs"),
  { force: true }
);
node("length-linters.cjs");
node("length-disagreements.cjs");
node("length-calibration.cjs");
if (!skip("format")) {
  node("length-format.cjs");
}
if (!skip("history")) {
  node("length-history.cjs", ["--track", "--analyse"]);
}
node("length-history-check.cjs", ["--compute"]);
node("length-complexity.cjs");
node("length-markers.cjs");
node("length-sample.cjs", ["--worksheet", "--print", "--compute"]);
node("length-agent-runs.cjs");
node("length-examples.cjs");
node("length-tables.cjs");
