// Runs every func-style step in order, so the outputs come from one run.
//
// Usage: FUNC_STYLE_TMP=<scratch dir> node research/corpus/scripts/func-style-run-all.cjs
//          [--skip-history] [--skip-census] [--skip-typecheck]
// About 12 minutes on the full corpus (the shared rule census, the conversion's type checks and the history are most of it).
"use strict";

const { rmSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const HERE = __dirname;
const ROOT = resolve(HERE, "../../..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const MEM = ["--max-old-space-size=24576"];

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

run("func-style-rules.cjs");
run("func-style-census.cjs");
if (!flag("skip-census")) {
  run(
    "rule-census.cjs",
    [
      "--topic",
      "func-style",
      "--presets",
      "core,react,js-plugins",
      "--focus",
      "func-style,no-use-before-define,func-names,func-name-matching,prefer-arrow-callback,arrow-body-style,unicorn/consistent-function-scoping,no-inner-declarations,no-func-assign,typescript/prefer-function-type,react/function-component-definition",
    ],
    { CORPUS_REPO_LISTS: "repos-accessibility.json" }
  );
  // the census writes Ultracite's Oxlint config under out/; remove it so no config file is left
  // under research/
  rmSync(
    join(HERE, "..", "out", "rule-census", "func-style", "oxlint.config.mjs"),
    { force: true }
  );
}
run("func-style-linters.cjs");
run("func-style-calibration.cjs");
run(
  "func-style-convert.cjs",
  flag("skip-typecheck") ? ["--skip-typecheck"] : []
);
run("func-style-cycles.cjs");
if (!flag("skip-history")) {
  run("func-style-history.cjs", [
    "--keywords",
    "--churn",
    "--track",
    "--analyse",
  ]);
}
run("func-style-markers.cjs");
run("func-style-sample.cjs", ["--worksheet", "--print", "--compute"]);
run("func-style-agent-runs.cjs");
run("func-style-examples.cjs");
run("func-style-tables.cjs");
