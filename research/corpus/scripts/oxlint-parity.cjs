// Side check: does oxlint's `complexity` rule (Ultracite's oxlint preset enables it at the default
// max of 20) produce the same per-function cyclomatic scores as ESLint core `complexity` (classic)?
// Runs oxlint with ONLY ../oxlint-config/.oxlintrc.json (complexity max 0) over the config-free
// mirror ../biome-input/<name>/ created by biome-crosscheck.cjs, and joins on function start/end line.
// Usage: node oxlint-parity.cjs <name>    -> out/<name>.oxlint-parity.json
//
// The mirror is gitignored, and oxlint skips gitignored directories even with --no-ignore, so
// it gets the mirror's files as an explicit list (in chunks, to stay under the argument limit).
"use strict";

const { execFileSync } = require("node:child_process");
const { readdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, relative, resolve } = require("node:path");

const HERE = resolve(__dirname, "..");
const OUT = join(HERE, "out");
const { ULTRACITE } = require("./tools.cjs");
const oxlintPkg = require.resolve("oxlint/package.json", {
  paths: [ULTRACITE],
});
const oxlintBin = join(oxlintPkg, "..", "bin", "oxlint");
const oxlintVersion = require(oxlintPkg).version;

const name = process.argv[2];
const mirrorRoot = join(HERE, "biome-input", name);
const data = JSON.parse(
  readFileSync(join(OUT, `${name}.functions.json`), "utf8")
);

const SOURCE_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const CHUNK = 400;

const mirrorFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (SOURCE_EXT.test(entry.name)) mirrorFiles.push(path);
  }
};
walk(mirrorRoot);
mirrorFiles.sort();

const runOxlint = (files) => {
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        oxlintBin,
        "-c",
        join(HERE, "oxlint-config/.oxlintrc.json"),
        "--no-ignore",
        "--format",
        "json",
        ...files,
      ],
      {
        cwd: HERE,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 512,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = error.stdout;
    if (!stdout) throw error;
  }
  return JSON.parse(stdout);
};

const report = { diagnostics: [] };
for (let i = 0; i < mirrorFiles.length; i += CHUNK) {
  report.diagnostics.push(
    ...runOxlint(mirrorFiles.slice(i, i + CHUNK)).diagnostics
  );
}

const lineStarts = new Map();
const lineOf = (file, offset) => {
  if (!lineStarts.has(file)) {
    const text = readFileSync(join(mirrorRoot, file), "utf8");
    const starts = [0];
    // oxlint offsets are UTF-8 byte offsets
    const buf = Buffer.from(text, "utf8");
    for (let i = 0; i < buf.length; i++) if (buf[i] === 10) starts.push(i + 1);
    lineStarts.set(file, starts);
  }
  const starts = lineStarts.get(file);
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
};

const byKey = new Map();
for (const f of data.functions) {
  const k = `${f.file}:${f.startLine}:${f.endLine}`;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(f);
}

const matched = [];
let unmatched = 0;
let ambiguous = 0;
let otherCodes = 0;
for (const d of report.diagnostics) {
  if (d.code !== "eslint(complexity)") {
    otherCodes++;
    continue;
  }
  const score = Number(/complexity of (\d+)/.exec(d.message)?.[1]);
  const file = relative(mirrorRoot, resolve(HERE, d.filename))
    .split("\\")
    .join("/");
  const span = d.labels[0].span;
  const startLine = lineOf(file, span.offset);
  const endLine = lineOf(file, span.offset + span.length);
  const cands = byKey.get(`${file}:${startLine}:${endLine}`) ?? [];
  if (cands.length === 0) {
    unmatched++;
    continue;
  }
  if (cands.length > 1) ambiguous++;
  matched.push({ fn: cands[0], oxlint: score });
}

const same = matched.filter((m) => m.fn.cyclomatic === m.oxlint).length;
const diffs = matched.filter((m) => m.fn.cyclomatic !== m.oxlint);
const eslintOver20 = data.functions.filter((f) => f.cyclomatic > 20).length;
const oxlintOver20 = matched.filter((m) => m.oxlint > 20).length;
const summary = {
  name,
  oxlintVersion,
  diagnostics: report.diagnostics.length,
  matched: matched.length,
  unmatched,
  ambiguousLineMatches: ambiguous,
  otherCodes,
  censusFunctions: data.functions.length,
  identical: same,
  identicalPct: Math.round((same / Math.max(1, matched.length)) * 10000) / 100,
  eslintOver20,
  oxlintOver20,
  sampleDiffs: diffs.slice(0, 15).map((m) => ({
    file: m.fn.file,
    line: m.fn.startLine,
    name: m.fn.name,
    eslint: m.fn.cyclomatic,
    oxlint: m.oxlint,
    own: m.fn.own,
  })),
};
writeFileSync(
  join(OUT, `${name}.oxlint-parity.json`),
  JSON.stringify(summary, null, 2)
);
console.log(
  `${name}: oxlint ${oxlintVersion} diags=${summary.diagnostics} matched=${summary.matched} unmatched=${unmatched} identical=${same} (${summary.identicalPct}%) eslint>20=${eslintOver20} oxlint>20=${oxlintOver20}`
);
