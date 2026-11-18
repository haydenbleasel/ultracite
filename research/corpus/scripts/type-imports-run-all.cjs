// Runs every type-imports script in order, and the shared rule census.
//
// Usage (from the repo root):
//   TYPE_IMPORTS_TMP=<scratch dir> node research/corpus/scripts/type-imports-run-all.cjs [--skip-history] [--skip-census] [--skip-fixes]
// About two and a half hours, most of it history (the pickaxe searches over Next.js's window take over an
// hour); the fix passes and fix-bugs about 30 minutes.
"use strict";

const { existsSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./type-imports-lib.cjs");

const node = (script, args = [], heap = 16_384) => {
  const t0 = Date.now();
  const r = lib.spawnSync(
    process.execPath,
    [`--max-old-space-size=${heap}`, join(__dirname, script), ...args],
    {
      env: process.env,
      stdio: "inherit",
    }
  );
  if (r.status !== 0) {
    throw new Error(`${script} ${args.join(" ")} failed (${r.status})`);
  }
  console.log(
    `-- ${script} ${args.join(" ")}: ${Math.round((Date.now() - t0) / 1000)} s`
  );
};

const main = () => {
  node("type-imports-rules.cjs");
  node("type-imports-census.cjs");
  node("type-imports-compilers.cjs", ["--calibration", "--corpus"]);
  node("type-imports-linters.cjs");
  if (!lib.flag("skip-census")) {
    lib.spawnSync(
      process.execPath,
      [
        join(__dirname, "rule-census.cjs"),
        "--topic",
        lib.TOPIC,
        "--presets",
        "core,react,js-plugins",
        "--focus",
        "typescript/consistent-type-imports,typescript/no-import-type-side-effects,import/consistent-type-specifier-style,import/no-duplicates,no-duplicate-imports,typescript/consistent-type-exports",
      ],
      {
        env: { ...process.env, CORPUS_REPO_LISTS: "repos-accessibility.json" },
        stdio: "inherit",
      }
    );
    // the census writes its Oxlint config under out/; no oxlint.config.* is left under research/
    const cfg = join(lib.HERE, "out", "rule-census", lib.TOPIC);
    for (const f of [
      "oxlint.config.mjs",
      "oxlint.config.ts",
      ".oxlintrc.json",
    ]) {
      if (existsSync(join(cfg, f))) {
        rmSync(join(cfg, f));
      }
    }
  }
  if (!lib.flag("skip-fixes")) {
    node("type-imports-fixes.cjs");
    node("type-imports-fix-bugs.cjs");
  }
  node("type-imports-calibration.cjs");
  node("type-imports-markers.cjs");
  if (!lib.flag("skip-history")) {
    node("type-imports-history.cjs", ["--churn", "--adoption", "--keywords"]);
  }
  node("type-imports-agent-runs.cjs");
  node("type-imports-sample.cjs", ["--worksheet", "--print", "--compute"]);
  node("type-imports-examples.cjs");
  node("type-imports-tables.cjs");
};

main();
