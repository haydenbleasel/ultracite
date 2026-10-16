// Runs rule-census.cjs with Ultracite's core, react and js-plugins Oxlint presets over the JSX files
// (.tsx, .jsx) of the seven repos with JSX (the three corpus repos plus repos-accessibility.json),
// focused on every accessibility rule those presets enable (a11y-lib.cjs decides which those are).
// Line counts and hits per 10,000 lines are per JSX line.
//
// Usage (from the repo root):
//   node research/corpus/scripts/a11y-census.cjs
// Writes results/accessibility/rule-census.json and .md, and out/rule-census/accessibility/.
"use strict";

const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const lib = require("./a11y-lib.cjs");

const focus = execFileSync(
  process.execPath,
  [join(__dirname, "a11y-inventory.cjs"), "--print-focus"],
  { encoding: "utf8" }
).trim();

execFileSync(
  process.execPath,
  [
    join(__dirname, "rule-census.cjs"),
    "--topic",
    lib.TOPIC,
    "--presets",
    "core,react,js-plugins",
    "--files",
    "jsx",
    "--repos",
    lib.REPOS.join(","),
    "--focus",
    focus,
  ],
  {
    env: { ...process.env, CORPUS_REPO_LISTS: "repos-accessibility.json" },
    stdio: "inherit",
  }
);
