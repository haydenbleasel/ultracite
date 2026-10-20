// Runs the sort-keys topic's scripts in order.
//
// Usage: node research/corpus/scripts/sort-keys-run-all.cjs [--skip-history] [--skip-census]
//   needs the corpus clones (clone.sh, a11y-clone.sh) and the history clones (todo-history-clone.sh)
//   --skip-history  reuse out/sort-keys/history/ instead of walking the history clones again
//   --skip-census   skip the shared Oxlint rule census (rule-census.cjs)
// The hand classification (sort-keys-sample.cjs --compute) reads the rater labels in
// out/sort-keys/labels-rater{1,2}.json; without them it keeps the committed classifications.json.
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const node = (script, args = [], env = {}) => {
  const t0 = Date.now();
  console.log(`\n▶ ${script} ${args.join(" ")}`);
  execFileSync(
    process.execPath,
    ["--max-old-space-size=16000", join(__dirname, script), ...args],
    {
      env: { ...process.env, ...env },
      stdio: "inherit",
    }
  );
  console.log(`  ${script}: ${Math.round((Date.now() - t0) / 1000)} s`);
};

node("sort-keys-inventory.cjs");
node("sort-keys-census.cjs");
if (!lib.flag("skip-census")) {
  // The shared census pools the eight corpus repos, so the React set's list must not be loaded.
  const env = { ...process.env };
  delete env.CORPUS_REPO_LISTS;
  console.log(
    "\n▶ rule-census.cjs --topic sort-keys --focus sort-keys,sort-vars"
  );
  execFileSync(
    process.execPath,
    [
      join(__dirname, "rule-census.cjs"),
      "--topic",
      "sort-keys",
      "--focus",
      "sort-keys,sort-vars",
    ],
    { env, stdio: "inherit" }
  );
}
node("sort-keys-linters.cjs", ["--corpus"]);
node("sort-keys-calibration.cjs");
node("sort-keys-fixes.cjs");
node("sort-keys-markers.cjs");
node(
  "sort-keys-history.cjs",
  lib.flag("skip-history") ? ["--merge"] : ["--events", "--merge"]
);
node("sort-keys-sample.cjs", ["--worksheet"]);
if (existsSync(join(lib.OUT_DIR, "labels-rater1.json"))) {
  node("sort-keys-sample.cjs", ["--compute"]);
}
node("sort-keys-hand-checks.cjs");
node("sort-keys-agent-runs.cjs");
node("sort-keys-examples.cjs");
node("sort-keys-tables.cjs");
