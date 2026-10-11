// Runs rule-census.cjs for the security-rules topic with Ultracite's core, react and js-plugins
// Oxlint presets, focused on every security rule those presets enable (from the inventory).
//
// Usage (from the repo root):
//   node research/corpus/scripts/security-census.cjs [--repos zod,hono] [--modes reported,raw]
// Needs results/security-rules/inventory.json (security-inventory.cjs).
"use strict";

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./security-lib.cjs");

const inventory = JSON.parse(
  readFileSync(join(lib.RESULTS_DIR, "inventory.json"), "utf8")
);
const focus = inventory.rules
  .filter((r) => !r.deprecated && r.oxlint.presets.length > 0)
  .map((r) => r.oxlint.name);

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
