// Formats copies of files with Oxfmt, using Ultracite's Oxfmt preset (packages/cli/config/oxfmt)
// with its ignore patterns dropped (they include `**/build`, which would skip Next.js's
// packages/next/src/build) and, optionally, another printWidth. The config is written as JSON
// under TMP (never under research/). Used by length-calibration.cjs and length-format.cjs.
"use strict";

const { copyFileSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./length-lib.cjs");

let preset = null;
// Ultracite's preset, read once (it's an ES module).
const loadPreset = () => {
  if (preset) {
    return preset;
  }
  const r = lib.spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const m = await import(${JSON.stringify(
        pathToFileURL(join(lib.CLI, "config/oxfmt/index.mjs")).href
      )}); process.stdout.write(JSON.stringify(m.default));`,
    ],
    { cwd: lib.CLI, encoding: "utf8" }
  );
  if (r.status !== 0) {
    throw new Error(`could not load the oxfmt preset: ${r.stderr}`);
  }
  preset = JSON.parse(r.stdout);
  return preset;
};

const configFor = (printWidth) => {
  const { ignorePatterns, ...rest } = loadPreset();
  void ignorePatterns;
  return printWidth ? { ...rest, printWidth } : rest;
};

// Copies `files` (relative to `root`) to TMP/format/<label>/ and formats them in place. Returns
// { dir, config, status, stderr }.
const formatCopies = ({ files, root, printWidth = null, label }) => {
  const dir = join(lib.TMP, "format", label);
  rmSync(dir, { force: true, recursive: true });
  for (const f of files) {
    const to = join(dir, f);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(root, f), to);
  }
  const configDir = join(lib.TMP, "configs");
  mkdirSync(configDir, { recursive: true });
  const config = join(configDir, `oxfmt.${label}.json`);
  writeFileSync(config, `${JSON.stringify(configFor(printWidth), null, 2)}\n`);
  const CHUNK = 500;
  let status = 0;
  let stderr = "";
  for (let i = 0; i < files.length; i += CHUNK) {
    const r = lib.spawnSync(
      process.execPath,
      [
        lib.oxfmtBin,
        `--config=${config}`,
        "--disable-nested-config",
        "--write",
        "--no-error-on-unmatched-pattern",
        ...files.slice(i, i + CHUNK),
      ],
      { cwd: dir, encoding: "utf8", maxBuffer: 1 << 30 }
    );
    status = Math.max(status, r.status ?? 1);
    stderr += r.stderr ?? "";
  }
  return { config: configFor(printWidth), dir, status, stderr };
};

module.exports = { configFor, formatCopies, loadPreset };
