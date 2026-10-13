// Runs rule-census.cjs for the dead-code topic with Ultracite's core, react and js-plugins Oxlint
// presets, focused on every dead-code and duplication rule those presets enable (from the
// inventory), in both modes (reported: in-file suppressions honoured; raw: every occurrence).
//
// Usage (from the repo root):
//   node research/corpus/scripts/dead-code-census.cjs [--repos zod,hono] [--modes reported,raw]
// Needs results/dead-code/inventory.json (dead-code-inventory.cjs).
"use strict";

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./dead-code-lib.cjs");

const inventory = JSON.parse(
  readFileSync(join(lib.RESULTS_DIR, "inventory.json"), "utf8")
);
const focus = inventory.oxlint
  .filter((r) => ["core", "react", "js-plugins"].some((p) => r.presets[p]?.on))
  .map((r) => r.rule);

const passThrough = ["repos", "modes"].flatMap((name) => {
  const value = lib.arg(name, null);
  return value ? [`--${name}`, value] : [];
});

execFileSync(
  process.execPath,
  [
    join(__dirname, "rule-census.cjs"),
    "--topic",
    lib.TOPIC,
    "--presets",
    "core,react,js-plugins",
    "--focus",
    focus.join(","),
    ...passThrough,
  ],
  { stdio: "inherit" }
);
