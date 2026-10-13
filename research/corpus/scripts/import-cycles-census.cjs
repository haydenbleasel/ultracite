// Runs rule-census.cjs for the import-cycles topic with Ultracite's core, react and js-plugins
// Oxlint presets, focused on the import-graph rules those presets enable (cycles, self-imports,
// barrels, re-exports, namespace imports, restricted imports, type-only imports), in both modes.
//
// Usage (from the repo root):
//   node research/corpus/scripts/import-cycles-census.cjs [--repos zod,hono] [--modes reported,raw]
// Writes results/import-cycles/rule-census.{json,md} and out/rule-census/import-cycles/.
"use strict";

const { execFileSync } = require("node:child_process");

const ic = require("./import-cycles-lib.cjs");

const passThrough = ["repos", "modes"].flatMap((name) => {
  const value = ic.arg(name, null);
  return value ? [`--${name}`, value] : [];
});

const main = async () => {
  const enabled = await ic.oxlintEnabled(["core", "react", "js-plugins"]);
  const focus = ic.OXLINT_FOCUS.filter((rule) => enabled.has(rule));
  console.log(
    `focus (${focus.length}): ${focus.join(", ")}\nnot enabled: ${ic.OXLINT_FOCUS.filter((r) => !enabled.has(r)).join(", ")}`
  );
  execFileSync(
    process.execPath,
    [
      require.resolve("./rule-census.cjs"),
      "--topic",
      ic.TOPIC,
      "--presets",
      "core,react,js-plugins",
      "--focus",
      focus.join(","),
      ...passThrough,
    ],
    { stdio: "inherit" }
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
