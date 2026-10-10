// Runs the whole floating-promises pipeline in order, from the clones to tables.md.
// The hand classifications (results/floating-promises/classifications.json), the detector
// review (detector-review.json) and the history search (history.json) are inputs, not outputs.
//
// Usage (from the repo root, after scripts/clone.sh):
//   node research/corpus/scripts/async-run-all.cjs
"use strict";

const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const TOPIC = "floating-promises";
const FOCUS = [
  "require-await",
  "no-await-in-loop",
  "no-async-promise-executor",
  "no-promise-executor-return",
  "prefer-promise-reject-errors",
  "no-void",
  "promise/prefer-await-to-then",
  "promise/prefer-await-to-callbacks",
  "promise/avoid-new",
  "promise/prefer-catch",
  "promise/no-nesting",
  "promise/no-callback-in-promise",
  "promise/no-promise-in-callback",
  "promise/no-multiple-resolved",
  "promise/no-new-statics",
  "promise/no-return-wrap",
  "promise/param-names",
  "promise/spec-only",
  "promise/valid-params",
  "unicorn/no-array-for-each",
  "unicorn/no-await-expression-member",
  "unicorn/no-await-in-promise-methods",
  "unicorn/no-single-promise-in-promise-methods",
  "unicorn/no-thenable",
  "unicorn/no-unnecessary-await",
  "unicorn/no-useless-promise-resolve-reject",
  "oxc/no-async-endpoint-handlers",
];

const steps = [
  ["async-rule-inventory.cjs"],
  ["rule-census.cjs", "--topic", TOPIC, "--focus", FOCUS.join(",")],
  ["async-census.cjs"],
  ["async-typed-census.cjs"],
  ["async-repo-configs.cjs"],
  ["async-linters.cjs", "--calibration", "--corpus"],
  ["async-detector-check.cjs"],
  ["async-sample.cjs"],
  ["async-agreement.cjs", "--compute"],
  ["async-examples.cjs"],
  ["async-tables.cjs"],
];

for (const [script, ...rest] of steps) {
  const started = Date.now();
  execFileSync(
    process.execPath,
    ["--max-old-space-size=12288", join(__dirname, script), ...rest],
    {
      env: { ...process.env, RESEARCH_TOPIC: TOPIC },
      stdio: ["ignore", "ignore", "inherit"],
    }
  );
  console.log(
    `${script} ${rest[0] ?? ""}: ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
}
