// Runs every nested-ternaries step in order, so the outputs come from one run.
//
// Usage: NESTED_TERNARIES_TMP=<scratch dir> node research/corpus/scripts/nested-ternaries-run-all.cjs
//          [--skip-history] [--skip-census] [--skip-rewrite]
// About 40 minutes on the full corpus (the history, the rewrites' ESLint passes and the shared rule
// census are most of it).
"use strict";

const { rmSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const HERE = __dirname;
const ROOT = resolve(HERE, "../../..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const MEM = ["--max-old-space-size=20000"];

const run = (script, argv = [], env = {}) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [...MEM, join(HERE, script), ...argv], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (r.status !== 0) {
    throw new Error(`${script} exited ${r.status}`);
  }
  console.log(
    `== ${script} ${argv.join(" ")} (${Math.round((Date.now() - t0) / 1000)} s)`
  );
};

run("nested-ternaries-rules.cjs");
run("nested-ternaries-census.cjs");
if (!flag("skip-census")) {
  run(
    "rule-census.cjs",
    [
      "--topic",
      "nested-ternaries",
      "--presets",
      "core,react,js-plugins",
      "--focus",
      "no-nested-ternary,sonarjs/no-nested-conditional,unicorn/prefer-ternary,unicorn/prefer-logical-operator-over-ternary,no-unneeded-ternary,no-negated-condition,unicorn/no-negated-condition,no-else-return,no-lonely-if,unicorn/no-lonely-if,curly,sonarjs/cognitive-complexity,complexity,react-doctor/rendering-conditional-render",
    ],
    { CORPUS_REPO_LISTS: "repos-accessibility.json" }
  );
  // the census writes Ultracite's Oxlint config under out/; remove it so no config file is left
  // under research/
  rmSync(
    join(
      HERE,
      "..",
      "out",
      "rule-census",
      "nested-ternaries",
      "oxlint.config.mjs"
    ),
    { force: true }
  );
}
run("nested-ternaries-linters.cjs");
run("nested-ternaries-calibration.cjs");
run("nested-ternaries-format.cjs");
if (!flag("skip-rewrite")) {
  run("nested-ternaries-rewrite.cjs");
}
run("nested-ternaries-fixes.cjs");
if (!flag("skip-history")) {
  run("nested-ternaries-history.cjs", [
    "--events",
    "--diffsize",
    "--keywords",
    "--formatters",
    "--track",
    "--analyse",
  ]);
}
run("nested-ternaries-markers.cjs");
run("nested-ternaries-sample.cjs", ["--worksheet", "--print", "--compute"]);
run("nested-ternaries-agent-runs.cjs");
run("nested-ternaries-examples.cjs");
run("nested-ternaries-tables.cjs");
