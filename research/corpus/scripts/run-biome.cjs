// Runs Biome's noExcessiveCognitiveComplexity (maxAllowedComplexity: 1, the lowest allowed value)
// using ONLY the config in ../biome-config (root: true, VCS off).
//
// Biome 2 discovers nested biome.json(c) files inside the paths it lints (e.g. zod and astro ship
// their own), even with --config-path. To make sure no config from a cloned repo is ever read,
// the files to lint are first copied (source files only, same relative paths) into
// ../biome-input/<name>/, which contains no configuration files, and Biome lints that mirror.
//
// Usage: node run-biome.cjs <outName> <root> <file...>    -> out/<outName>.biome.json
"use strict";

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { biomeBin } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");

// Suppression comments are neutralised (same length, so every position is unchanged), mirroring
// ESLint's `noInlineConfig: true` on the sonarjs side: suppressed functions are still measured.
const SUPPRESSION = /biome-ignore/g;
const NEUTRAL = "biome_ignore";

function mirror(name, root, files) {
  const mirrorRoot = join(HERE, "biome-input", name);
  rmSync(mirrorRoot, { recursive: true, force: true });
  let suppressions = 0;
  for (const f of files) {
    const dest = join(mirrorRoot, f);
    mkdirSync(dirname(dest), { recursive: true });
    const text = readFileSync(join(root, f), "utf8");
    const hits = text.match(SUPPRESSION)?.length ?? 0;
    suppressions += hits;
    writeFileSync(dest, hits ? text.replace(SUPPRESSION, NEUTRAL) : text);
  }
  return { mirrorRoot, suppressions };
}

/** Returns { report, mirrorRoot }. Diagnostic paths are relative to HERE (inside mirrorRoot). */
function runBiome(name, root, files) {
  const { mirrorRoot, suppressions } = mirror(name, root, files);
  const args = [
    biomeBin,
    "lint",
    `--config-path=${join(HERE, "biome-config")}`,
    "--reporter=json",
    "--max-diagnostics=none",
    "--only=complexity/noExcessiveCognitiveComplexity",
    "--no-errors-on-unmatched",
    mirrorRoot,
  ];
  let stdout;
  try {
    stdout = execFileSync(process.execPath, args, {
      cwd: HERE,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 512,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    // Biome exits 1 when it emits error diagnostics; stdout still holds the report.
    stdout = error.stdout;
    if (!stdout) throw error;
  }
  return { report: JSON.parse(stdout), mirrorRoot, suppressions };
}

module.exports = { runBiome };

if (require.main === module) {
  const [name, root, ...files] = process.argv.slice(2);
  const { report } = runBiome(name, resolve(root), files);
  mkdirSync(join(HERE, "out"), { recursive: true });
  writeFileSync(
    join(HERE, "out", `${name}.biome.json`),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report.summary));
}
