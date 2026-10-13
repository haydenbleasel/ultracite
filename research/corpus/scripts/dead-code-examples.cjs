// Lints the dead-code agent-experiment subjects in examples/dead-code/ with each linter as Ultracite
// configures it, plus `tsc --noUnusedLocals --noUnusedParameters`, and writes what fires to
// examples/dead-code/examples.json, so the headers' "Rules it hits" lines are measured rather than
// claimed. The analysis that a later script must strip before an agent sees a subject (the bug, the
// behavior to preserve, the expected fix) is in each subject's `analysis` field here and in the
// header fields listed in STRIP_FIELDS.
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/dead-code-examples.cjs
"use strict";

const { readFileSync, readdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./dead-code-lib.cjs");

const DIR = lib.EXAMPLES_DIR;

// Header fields (lines starting " * <Field>:") that carry analysis and must be stripped before an
// agent sees the file. A field continues until a blank comment line or the next capitalised field.
const STRIP_FIELDS = [
  "Dead-code subject",
  "Rules it hits",
  "The bug",
  "Why it is dead",
  "Behaviour to preserve",
  "Expected fix",
  "Tempting fixes",
  "History",
];

const SUBJECTS = JSON.parse(readFileSync(join(DIR, "subjects.json"), "utf8"));

const main = async () => {
  const files = readdirSync(DIR)
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts"))
    .sort();
  const runs = {
    biome: lib.runBiome({
      cwd: DIR,
      files,
      mode: "ultracite",
      presets: ["core"],
    }),
    eslint: await lib.runEslint({ cwd: DIR, files, presets: ["core"] }),
    "eslint +type-aware": await lib.runEslint({
      cwd: DIR,
      files,
      presets: ["core"],
      typed: true,
    }),
    oxlint: lib.runOxlint({ cwd: DIR, files, presets: ["core", "react"] }),
    "oxlint +js-plugins": lib.runOxlint({
      cwd: DIR,
      files,
      presets: ["core", "react", "js-plugins"],
    }),
    tsc: lib.runTsc({ dir: DIR, files }),
  };
  const out = [];
  for (const file of files) {
    const meta = SUBJECTS[file] ?? {};
    const text = readFileSync(join(DIR, file), "utf8");
    const headerEnd = text.indexOf("*/");
    const header = text.slice(0, headerEnd);
    const row = {
      file,
      ...meta,
      deadCode: {},
      headerStripFieldsPresent: STRIP_FIELDS.filter((f) =>
        header.includes(` * ${f}`)
      ),
      lines: text.split("\n").length,
      otherRules: {},
    };
    for (const [tool, diags] of Object.entries(runs)) {
      for (const d of diags.filter((x) => x.file === file)) {
        const isDead =
          tool === "biome"
            ? lib.biomeCategoryOf(d.rule)
            : tool === "tsc"
              ? d.unused
              : lib.categoryOf(lib.toOxlintName(d.rule));
        const bucket = isDead ? "deadCode" : "otherRules";
        row[bucket][tool] ??= [];
        row[bucket][tool].push({
          line: d.line,
          message: d.message,
          rule: d.rule,
          ...(d.help ? { help: d.help } : {}),
        });
      }
    }
    for (const bucket of ["deadCode", "otherRules"]) {
      for (const list of Object.values(row[bucket])) {
        list.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
      }
    }
    out.push(row);
    console.log(
      file,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(row.deadCode).map(([t, l]) => [
            t,
            l.map((x) => `${x.rule}:${x.line}`),
          ])
        )
      )
    );
  }
  writeFileSync(
    join(DIR, "examples.json"),
    `${JSON.stringify(
      {
        generated: new Date().toISOString().slice(0, 10),
        note: "Measured by scripts/dead-code-examples.cjs. `deadCode` lists the dead-code and duplication rule hits (with message and Oxlint help) per configuration; `otherRules` lists every other rule that fires, which an agent fixing the file would also see. Oxlint = core + react as `ultracite init` writes it, then with js-plugins; ESLint = Ultracite's core preset, untyped and type-aware (examples/dead-code/tsconfig.json); Biome = Ultracite's core preset; tsc = noUnusedLocals, noUnusedParameters, allowUnreachableCode false. Header fields named in stripFields hold analysis and must be removed before an agent sees a subject.",
        stripFields: STRIP_FIELDS,
        subjects: out,
      },
      null,
      2
    )}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
