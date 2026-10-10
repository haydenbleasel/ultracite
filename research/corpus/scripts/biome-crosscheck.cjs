// Biome cross-check: runs Biome's noExcessiveCognitiveComplexity (maxAllowedComplexity: 1) on the
// same files analyze.cjs measured, maps each Biome diagnostic to a function from the census, and
// compares Biome's score with sonarjs's.
//
// Usage: node biome-crosscheck.cjs <name>     (requires out/<name>.functions.json from analyze.cjs)
// Output: out/<name>.biome-compare.json
//
// Biome only reports scores > maxAllowedComplexity, and 1 is the lowest allowed value, so a
// function Biome does not report scored 0 or 1 ("<=1").
"use strict";

const { readFileSync, writeFileSync } = require("node:fs");
const { join, relative, resolve } = require("node:path");
const { runBiome } = require("./run-biome.cjs");

const OUT = resolve(__dirname, "../out");
const name = process.argv[2];
const data = JSON.parse(
  readFileSync(join(OUT, `${name}.functions.json`), "utf8")
);
const root = data.root;

// Same files analyze.cjs linted (files with no functions cannot produce diagnostics).
const files = [...new Set(data.functions.map((f) => f.file))];
const { report, mirrorRoot, suppressions } = runBiome(name, root, files);

const cmp = (a, b) => a.line - b.line || a.column - b.column;
const byFile = new Map();
for (const fn of data.functions) {
  if (!byFile.has(fn.file)) byFile.set(fn.file, []);
  byFile.get(fn.file).push(fn);
}

const biomeOf = new Map(); // function object -> biome score
const unmatched = [];
const otherDiagnostics = [];
const parseErrorFiles = new Set(); // files Biome could not fully parse: excluded from comparison
const relOf = (d) =>
  relative(mirrorRoot, resolve(resolve(__dirname, ".."), d.location.path))
    .split("\\")
    .join("/");

// Biome's diagnostic range for a function that starts on a new line begins at the end of the
// previous line (it includes leading trivia). Move such positions to the next non-blank character.
const linesCache = new Map();
function normalize(file, pos) {
  if (!linesCache.has(file))
    linesCache.set(
      file,
      readFileSync(join(mirrorRoot, file), "utf8").split("\n")
    );
  const lines = linesCache.get(file);
  let { line, column } = pos;
  while (
    line <= lines.length &&
    column - 1 >= lines[line - 1].trimEnd().length
  ) {
    line++;
    column = (lines[line - 1]?.search(/\S/) ?? 0) + 1;
    if (column === 0) column = Number.POSITIVE_INFINITY; // blank line: keep advancing
  }
  if (line <= lines.length && column - 1 < lines[line - 1].search(/\S/)) {
    column = lines[line - 1].search(/\S/) + 1;
  }
  return { line, column };
}

for (const d of report.diagnostics) {
  if (d.category !== "lint/complexity/noExcessiveCognitiveComplexity") {
    otherDiagnostics.push({
      category: d.category,
      path: d.location?.path,
      message: d.message,
    });
    if (d.category === "parse" && d.location?.path)
      parseErrorFiles.add(relOf(d));
    continue;
  }
  const score = Number(/complexity of (\d+)/.exec(d.message)?.[1]);
  const file = relOf(d);
  const pos = normalize(file, d.location.start);
  // Innermost function whose head span [headStart, bodyStart) contains Biome's start position.
  const candidates = (byFile.get(file) ?? []).filter(
    (f) => cmp(f.headStart, pos) <= 0 && cmp(pos, f.bodyStart) < 0
  );
  candidates.sort((x, y) => cmp(y.headStart, x.headStart));
  const fn = candidates[0];
  if (!fn || Number.isNaN(score)) {
    unmatched.push({ file, pos, message: d.message });
    continue;
  }
  if (biomeOf.has(fn))
    unmatched.push({ file, pos, message: `${d.message} (duplicate match)` });
  biomeOf.set(fn, score);
}

const rows = data.functions
  .filter((f) => !parseErrorFiles.has(f.file))
  .map((f) => ({
    file: f.file,
    name: f.name,
    kind: f.kind,
    startLine: f.startLine,
    endLine: f.endLine,
    depth: f.depth,
    controlFlowAncestors: f.controlFlowAncestors,
    own: f.own,
    sonar: f.cognitive,
    biome: biomeOf.has(f) ? biomeOf.get(f) : null, // null => Biome score <= 1
    cyclomatic: f.cyclomatic,
  }));

// Comparable set: both tools reveal the exact score only when it is >= 2.
const visible = (r) => r.sonar >= 2 || r.biome !== null;
const comparable = rows.filter(visible);
const exact = comparable.filter((r) => r.biome !== null && r.sonar === r.biome);
const biomeHigher = comparable.filter((r) => (r.biome ?? 1) > r.sonar);
const biomeLower = comparable.filter(
  (r) => r.sonar >= 2 && (r.biome ?? 1) < r.sonar
);

// Explain disagreements with the mechanisms isolated in calibration/cases*.ts:
//  - nested function: Biome carries the enclosing nesting (+1 per function level); sonarjs resets
//  - || / ??: Biome counts them (+1 per sequence); sonarjs 4.x counts only &&
//  - JSX &&: Biome counts it; sonarjs exempts JSX short-circuits
//  - accessor: Biome does not report getters/setters at all
//  - nested else / else-if: Biome adds a nesting penalty to a nested `else if`, and loses one
//    nesting level for everything after a nested `if … else` in the same block
const MECHANISMS = [
  ["nested function", (r) => r.depth > 0],
  ["|| or ??", (r) => r.own.or + r.own.nullish > 0],
  ["JSX &&", (r) => r.own.jsxShortCircuit > 0],
  ["accessor", (r) => /^(?:get|set|object-get|object-set)$/.test(r.kind)],
  ["nested else/else-if", (r) => r.own.nestedElse + r.own.nestedElseIf > 0],
  ["finally", (r) => r.own.finally > 0],
  [
    "function as ternary branch (sonarjs leak)",
    (r) => r.own.ternaryFunctionBranch > 0,
  ],
];
const cause = (r) => {
  const c = MECHANISMS.filter(([, test]) => test(r)).map(([label]) => label);
  return c.length ? c.join(" + ") : "unexplained";
};
const disagreements = comparable.filter(
  (r) => (r.biome ?? 1) !== r.sonar && !(r.biome === null && r.sonar <= 1)
);
const causes = {};
for (const r of disagreements) causes[cause(r)] = (causes[cause(r)] ?? 0) + 1;
const primaryCauses = {}; // each mechanism counted once per disagreement it could explain
for (const r of disagreements) {
  for (const [label, test] of MECHANISMS)
    if (test(r)) primaryCauses[label] = (primaryCauses[label] ?? 0) + 1;
}

// "Clean" subset: functions with none of the mechanisms -> should agree exactly.
const clean = rows.filter(
  (r) => MECHANISMS.every(([, test]) => !test(r)) && visible(r)
);
const cleanAgree = clean.filter(
  (r) => r.biome === r.sonar || (r.biome === null && r.sonar <= 1)
);

const thresholdCounts = (key) => {
  const val = (r) => (key === "biome" ? (r.biome ?? 1) : r.sonar);
  return {
    over15: rows.filter((r) => val(r) > 15).length,
    over20: rows.filter((r) => val(r) > 20).length,
    over25: rows.filter((r) => val(r) > 25).length,
  };
};

const summary = {
  name,
  functions: rows.length,
  biomeDiagnostics: report.diagnostics.length,
  biomeMatched: biomeOf.size,
  unmatched,
  parseErrorFiles: [...parseErrorFiles],
  functionsExcludedForParseErrors: data.functions.filter((f) =>
    parseErrorFiles.has(f.file)
  ).length,
  otherDiagnostics: otherDiagnostics.length,
  biomeSummary: report.summary,
  comparable: comparable.length,
  exactAgreement: exact.length,
  biomeHigher: biomeHigher.length,
  biomeLower: biomeLower.length,
  disagreements: disagreements.length,
  disagreementCauses: causes,
  disagreementsByMechanism: primaryCauses,
  biomeSuppressionsNeutralised: suppressions,
  cleanSubset: { functions: clean.length, agree: cleanAgree.length },
  thresholds: {
    sonar: thresholdCounts("sonar"),
    biome: thresholdCounts("biome"),
  },
  meanDiffBiomeMinusSonar:
    comparable.reduce((s, r) => s + ((r.biome ?? 1) - r.sonar), 0) /
    Math.max(1, comparable.length),
};

summary.otherDiagnosticSamples = otherDiagnostics.slice(0, 10);
writeFileSync(
  join(OUT, `${name}.biome-compare.json`),
  JSON.stringify({ summary, rows }, null, 1)
);
const { unmatched: u, ...brief } = summary;
console.log(
  `${name}: biome diags=${summary.biomeDiagnostics} matched=${summary.biomeMatched} unmatched=${u.length} other=${summary.otherDiagnostics} ` +
    `comparable=${summary.comparable} exact=${summary.exactAgreement} biomeHigher=${summary.biomeHigher} biomeLower=${summary.biomeLower} ` +
    `clean=${summary.cleanSubset.agree}/${summary.cleanSubset.functions} unexplained=${causes.unexplained ?? 0}/${disagreements.length} suppressions=${suppressions} parseErrFiles=${parseErrorFiles.size} skipped=${summary.biomeSummary?.skipped}`
);
