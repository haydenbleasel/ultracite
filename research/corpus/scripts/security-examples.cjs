// Lints the security agent-experiment subjects in examples/security-rules/ with each linter as
// Ultracite configures it, and writes what fires to examples/security-rules/examples.json, so
// the headers' "rules it hits" lines are measured rather than claimed.
//
// Usage (from the repo root):
//   node research/corpus/scripts/security-examples.cjs
"use strict";

const { readFileSync, readdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./security-lib.cjs");
const {
  runBiome,
  runEslint,
  runOxlint,
  securityNames,
} = require("./security-linters.cjs");

const DIR = join(lib.HERE, "examples", "security-rules");

const SUBJECTS = {
  "s1-vite-eval-value.ts": {
    behaviourOracle:
      "Call evalValue on option-object sources from real import.meta.glob/new Worker calls, e.g. `{ eager: true }`, `{ query: '?raw', import: 'default' }`, `{ as: 'url', eager: true, }`, `{ type: 'module', name: 'w' }`, `['./a/*.ts', '!./a/b.ts']`, `{ query: { foo: 'bar', n: 1 } }`; compare results with the original (deep equality) and check that invalid input (`{ eager: }`) still throws. Also check `typeof process`/`typeof require` inside the expression stay `undefined`.",
    classification: "trusted-dev (vite:015)",
    repo: "vitejs/vite",
    rule: "no-new-func",
    sinkId: "vite:015",
  },
  "s2-next-before-interactive-script.tsx": {
    behaviourOracle:
      "Render <BeforeInteractiveScript> with react-dom/server renderToStaticMarkup for props with and without src, with dangerouslySetInnerHTML or children, and with strings containing </script>, <!--, &, U+2028 and quotes; compare the HTML byte for byte with the original.",
    classification: "escaped (next.js:040, next.js:041)",
    repo: "vercel/next.js",
    rule: "react/no-danger",
    sinkId: "next.js:040, next.js:041",
  },
};

const main = async () => {
  const names = securityNames();
  const files = readdirSync(DIR)
    .filter((f) => /\.tsx?$/.test(f))
    .sort();
  const runs = {
    biome: runBiome({ cwd: DIR, files, mode: "ultracite" }),
    eslint: await runEslint({ cwd: DIR, files, securityOnly: false }),
    oxlint: runOxlint({ cwd: DIR, files, presets: ["core", "react"] }),
    "oxlint +js-plugins": runOxlint({ cwd: DIR, files }),
  };
  const out = [];
  for (const file of files) {
    const row = {
      file,
      ...SUBJECTS[file],
      lines: readFileSync(join(DIR, file), "utf8").split("\n").length,
      security: {},
      otherRules: {},
    };
    for (const [tool, diags] of Object.entries(runs)) {
      const isSecurity = tool.startsWith("biome")
        ? (r) => names.biome.has(r.split("/").at(-1))
        : (r) => names[tool.split(" ")[0]].has(r);
      for (const d of diags.filter((x) => x.file === file)) {
        const bucket = isSecurity(d.rule) ? "security" : "otherRules";
        row[bucket][tool] ??= [];
        row[bucket][tool].push(`${d.rule}:${d.line}`);
      }
    }
    for (const bucket of ["security", "otherRules"]) {
      for (const list of Object.values(row[bucket])) {
        list.sort(
          (a, b) =>
            Number(a.split(":").at(-1)) - Number(b.split(":").at(-1)) ||
            a.localeCompare(b)
        );
      }
    }
    out.push(row);
    console.log(file, JSON.stringify(row.security));
  }
  writeFileSync(
    join(DIR, "examples.json"),
    `${JSON.stringify({ generated: new Date().toISOString().slice(0, 10), note: "Measured by scripts/security-examples.cjs. react-doctor skips files under an examples/ directory, so react-doctor/no-eval, which fires on s1's code in the corpus and in a temp directory, is missing here. `security` lists security-rule hits (rule:line) per configuration; `otherRules` lists every other rule that fires, which an agent fixing the file would also see. Oxlint = core + react (Ultracite's default), then with the opt-in js-plugins preset; ESLint = Ultracite's core + react presets, untyped; Biome = Ultracite's core + react presets.", subjects: out }, null, 2)}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
