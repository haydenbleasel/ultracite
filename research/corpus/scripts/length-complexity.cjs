// Length and cognitive complexity, function by function (source files only; tests apart): the rank
// correlations between lines, statements and cognitive complexity (SonarJS's score, as the
// cognitive-complexity topic measured it), the overlap between "over a length limit" and "over
// Ultracite's cognitive complexity threshold" (read from packages/cli/config), how many long
// functions are flat and how many complex functions are short, and the clearest examples of each,
// with permalinks at the pinned commits.
//
// Usage: node research/corpus/scripts/length-complexity.cjs
// Needs out/length-limits/census. Writes results/length-limits/complexity.json.
"use strict";

const { join } = require("node:path");

const lib = require("./length-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");

// Ultracite's threshold, from the presets (ESLint core's sonarjs rules and Oxlint js-plugins).
const threshold = () => {
  const text = lib.readFileSync(
    join(lib.CLI, "config/eslint/core/rules/sonarjs.mjs"),
    "utf8"
  );
  const m = /"sonarjs\/cognitive-complexity":\s*\["error",\s*(\d+)\]/.exec(
    text
  );
  const ox = lib.readFileSync(
    join(lib.CLI, "config/oxlint/js-plugins/index.mjs"),
    "utf8"
  );
  const m2 = /"sonarjs\/cognitive-complexity":\s*\["error",\s*(\d+)\]/.exec(ox);
  const biome = lib.readFileSync(
    join(lib.CLI, "config/biome/core/biome.jsonc"),
    "utf8"
  );
  const m3 =
    /"noExcessiveCognitiveComplexity":\s*\{[^}]*"maxAllowedComplexity":\s*(\d+)/s.exec(
      biome
    );
  return {
    biome: m3 ? Number(m3[1]) : null,
    eslint: m ? Number(m[1]) : null,
    oxlintJsPlugins: m2 ? Number(m2[1]) : null,
  };
};

const pick = (f) => ({
  cognitive: f.cognitive,
  subtreeCognitive: f.subtreeCognitive,
  cyclomatic: f.cyclomatic,
  file: f.file,
  jsxLines: f.jsxLines,
  kind: f.kind,
  lines: f.lines,
  name: f.name,
  nestedLines: f.nestedLines,
  permalink: lib.permalink(f.repo, f.file, f.startLine, f.endLine),
  repo: f.repo,
  statements: f.statements,
  switchCasesMax: f.own.switchCasesMax,
  dataLines: f.dataLines,
});

// SonarJS scores every function on its own (a callback's score never counts for its parent), but
// the line limits count a nested function's lines in every function around it. `subtree` is a
// function's own score plus all its nested functions' scores.
const addSubtree = (fns) => {
  const byFile = new Map();
  for (const f of fns) {
    if (!byFile.has(f.file)) {
      byFile.set(f.file, []);
    }
    byFile.get(f.file).push(f);
  }
  for (const list of byFile.values()) {
    const byIndex = new Map(list.map((f) => [f.index, f]));
    for (const f of list) {
      f.subtreeCognitive = f.cognitive;
    }
    // children come after their parent in document order: add from the end
    for (const f of [...list].sort((a, b) => b.index - a.index)) {
      if (f.parentIndex !== null && byIndex.has(f.parentIndex)) {
        byIndex.get(f.parentIndex).subtreeCognitive += f.subtreeCognitive;
      }
    }
  }
  return fns;
};

const analyse = (fns, limit) => {
  const notIife = fns.filter((f) => !f.iife);
  const long = notIife.filter((f) => f.lines > 50);
  const complex = fns.filter((f) => f.cognitive > limit);
  const lines = fns.map((f) => f.lines);
  const statements = fns.map((f) => f.statements);
  const cognitive = fns.map((f) => f.cognitive);
  const positive = fns.filter((f) => f.cognitive > 0);
  return {
    complex: {
      atMost25Lines: complex.filter((f) => f.lines <= 25).length,
      atMost50Lines: complex.filter((f) => f.lines <= 50).length,
      n: complex.length,
      overLines50: complex.filter((f) => !f.iife && f.lines > 50).length,
      overLines100: complex.filter((f) => !f.iife && f.lines > 100).length,
      overStatements10: complex.filter((f) => f.statements > 10).length,
    },
    long: {
      // flat including nested functions
      subtreeAtMost5: long.filter((f) => f.subtreeCognitive <= 5).length,
      subtreeAtMostLimit: long.filter((f) => f.subtreeCognitive <= limit)
        .length,
      // under the limit on its own score, over it once its callbacks are counted
      hiddenInNested: long.filter(
        (f) => f.cognitive <= limit && f.subtreeCognitive > limit
      ).length,
      cognitive0: long.filter((f) => f.cognitive === 0).length,
      cognitiveAtMost5: long.filter((f) => f.cognitive <= 5).length,
      cognitiveAtMostLimit: long.filter((f) => f.cognitive <= limit).length,
      n: long.length,
      overLimit: long.filter((f) => f.cognitive > limit).length,
    },
    n: fns.length,
    spearman: {
      linesCognitive: lib.spearman(lines, cognitive),
      linesCognitivePositive: lib.spearman(
        positive.map((f) => f.lines),
        positive.map((f) => f.cognitive)
      ),
      linesStatements: lib.spearman(lines, statements),
      statementsCognitive: lib.spearman(statements, cognitive),
    },
  };
};

const main = () => {
  const limits = threshold();
  const limit = limits.eslint;
  const result = {
    generated: new Date().toISOString(),
    note: "Source functions only (tests in `tests`). `long` is max-lines-per-function's default (over 50 physical lines, IIFEs skipped); `complex` is over Ultracite's cognitive complexity threshold. Spearman's rho with average ranks; `linesCognitivePositive` leaves out the functions that score 0.",
    pooled: {},
    repos: {},
    threshold: limits,
  };
  const all = { core: [], external: [], react: [] };
  const tests = { core: [], external: [], react: [] };
  for (const name of lib.ALL) {
    const fns = addSubtree(
      lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`))
    );
    const src = fns.filter((f) => !f.test);
    result.repos[name] = analyse(src, limit);
    const set = lib.setOf(name);
    if (set !== "dogfood") {
      all[set].push(...src);
      all.external.push(...src);
      tests[set].push(...fns.filter((f) => f.test));
      tests.external.push(...fns.filter((f) => f.test));
    }
  }
  for (const [k, v] of Object.entries(all)) {
    result.pooled[`${k}:source`] = analyse(v, limit);
  }
  for (const [k, v] of Object.entries(tests)) {
    result.pooled[`${k}:tests`] = analyse(v, limit);
  }
  // examples (source, both sets): long and flat; short and complex
  const src = all.external;
  // flat all the way down: no score in the function or any function nested in it
  const longFlat = src
    .filter((f) => !f.iife && f.lines > 50 && f.subtreeCognitive === 0)
    .sort((a, b) => b.lines - a.lines);
  // the longest flat functions by kind of shape, so the examples aren't all one kind
  const byShape = {};
  for (const f of longFlat) {
    const own = Math.max(1, f.lines - f.nestedLines);
    const shape = f.component
      ? "component"
      : f.dataLines / own >= 0.5
        ? "data"
        : f.own.switchCasesMax >= 8
          ? "switch"
          : f.nestedLines / f.lines >= 0.5
            ? "mostly nested"
            : "sequence";
    byShape[shape] ??= [];
    if (byShape[shape].length < 5) {
      byShape[shape].push(pick(f));
    }
  }
  const shortComplex = src
    .filter((f) => f.cognitive > limit)
    .sort((a, b) => a.lines - b.lines || b.cognitive - a.cognitive)
    .slice(0, 12)
    .map(pick);
  result.examples = {
    longFlatByShape: byShape,
    longFlatCount: longFlat.length,
    shortComplex,
  };
  lib.writeJson(join(lib.RESULTS_DIR, "complexity.json"), result);
  const p = result.pooled["external:source"];
  console.log(JSON.stringify({ limit: limits, ...p }, null, 1));
};

main();
