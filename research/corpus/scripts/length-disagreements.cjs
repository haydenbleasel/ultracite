// What each limit reports, per linter and setting, and why the linters disagree. Reads the census
// (length-census.cjs) and every linter's joined diagnostics (length-linters.cjs) and writes, per
// repo and per set (corpus, React set, both; Ultracite apart), source and tests apart:
//
//   reports    diagnostics, functions (or files) flagged, their share and the rate per 10,000
//              lines, for every rule at its default and the common settings, in every linter
//   agreement  function by function: where two implementations of the same limit give different
//              counts or flags, the reason, from what each counts (verified against the census)
//   messages   the exact message and help text each linter gives (what an agent is handed)
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/length-disagreements.cjs
// Writes results/length-limits/corpus-lint.json.
"use strict";

const { join } = require("node:path");

const lib = require("./length-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const LINT = join(lib.OUT_DIR, "lint");

// [label, linter, how to read a function's flag, threshold]
const FN_VIEWS = [
  ["max-lines-per-function", "eslint", (f) => !f.iife && f.lines > 50, 50],
  ["max-lines-per-function", "eslint", (f) => !f.iife && f.lines > 100, 100],
  [
    "max-lines-per-function (skip blanks, comments)",
    "eslint",
    (f) => !f.iife && f.linesCode > 50,
    50,
  ],
  [
    "max-lines-per-function",
    "oxlint",
    (f, l) => l.ox["lines@50"] !== undefined,
    50,
  ],
  [
    "max-lines-per-function",
    "oxlint",
    (f, l) => l.ox["lines@100"] !== undefined,
    100,
  ],
  [
    "noExcessiveLinesPerFunction",
    "biome",
    (f, l) => l.bi["lines@50"] !== undefined,
    50,
  ],
  [
    "noExcessiveLinesPerFunction",
    "biome",
    (f, l) => l.bi["lines@100"] !== undefined,
    100,
  ],
  [
    "sonarjs/max-lines-per-function",
    "sonarjs",
    (f) => !f.iifeSonar && !f.sonarReactExempt && f.sonarLines > 200,
    200,
  ],
  ["max-statements", "eslint", (f) => f.statements > 10, 10],
  ["max-statements", "eslint", (f) => f.statements > 20, 20],
  ["max-statements", "eslint", (f) => f.statements > 30, 30],
  [
    "max-statements",
    "oxlint",
    (f, l) => l.ox["statements@10"] !== undefined,
    10,
  ],
  [
    "max-statements",
    "oxlint",
    (f, l) => l.ox["statements@20"] !== undefined,
    20,
  ],
  [
    "max-statements",
    "oxlint",
    (f, l) => l.ox["statements@30"] !== undefined,
    30,
  ],
  [
    "noExcessiveStatementsPerFunction",
    "biome",
    (f, l) => l.bi["statements@10"] !== undefined,
    10,
  ],
  [
    "noExcessiveStatementsPerFunction",
    "biome",
    (f, l) => l.bi["statements@20"] !== undefined,
    20,
  ],
  [
    "noExcessiveStatementsPerFunction",
    "biome",
    (f, l) => l.bi["statements@30"] !== undefined,
    30,
  ],
  ["max-params", "eslint", (f) => f.paramsEslint > 3, 3],
  ["max-params", "eslint", (f) => f.paramsEslint > 4, 4],
  ["max-params", "eslint", (f) => f.paramsEslint > 5, 5],
  ["max-params", "eslint", (f) => f.paramsEslint > 7, 7],
  ["max-params", "oxlint", (f, l) => l.ox["params@3"] !== undefined, 3],
  ["max-params", "oxlint", (f, l) => l.ox["params@4"] !== undefined, 4],
  ["max-params", "oxlint", (f, l) => l.ox["params@5"] !== undefined, 5],
  ["max-params", "oxlint", (f, l) => l.ox["params@7"] !== undefined, 7],
  ["useMaxParams", "biome", (f, l) => l.bi["params@3"] !== undefined, 3],
  ["useMaxParams", "biome", (f, l) => l.bi["params@4"] !== undefined, 4],
  ["useMaxParams", "biome", (f, l) => l.bi["params@5"] !== undefined, 5],
  ["useMaxParams", "biome", (f, l) => l.bi["params@7"] !== undefined, 7],
  ["max-depth", "eslint", (f) => f.maxDepth > 4, 4],
  ["max-depth", "oxlint", (f, l) => (l.ox["depth@4"] ?? 0) > 0, 4],
  ["sonarjs/nested-control-flow", "sonarjs", (f) => f.sonarNestMax > 3, 3],
  ["max-nested-callbacks", "eslint", (f) => (f.callbackDepth ?? 0) > 10, 10],
  [
    "max-nested-callbacks",
    "oxlint",
    (f, l) => l.ox["callbacks@10"] !== undefined,
    10,
  ],
  [
    "noExcessiveNestedCallbacks",
    "biome",
    (f, l) => l.bi["callbacks@5"] === true,
    5,
  ],
  [
    "noExcessiveNestedCallbacks",
    "biome",
    (f, l) => l.bi["callbacks@10"] === true,
    10,
  ],
  ["sonarjs/cognitive-complexity", "sonarjs", (f) => f.cognitive > 20, 20],
];
// Reports that aren't one per function: max-depth reports each block over the limit,
// max-nested-callbacks each callback.
const DIAGNOSTICS = {
  "eslint max-depth 4": (f, l) => l.es["depth@4"] ?? 0,
  "oxlint max-depth 4": (f, l) => l.ox["depth@4:reports"] ?? 0,
};
const FILE_VIEWS = [
  ["max-lines", "eslint", (fr) => fr.lines > 300, 300],
  ["max-lines", "eslint", (fr) => fr.lines > 500, 500],
  ["max-lines", "eslint", (fr) => fr.lines > 1000, 1000],
  ["max-lines", "oxlint", (fr, l) => l.ox["fileLines@300"] !== undefined, 300],
  ["max-lines", "oxlint", (fr, l) => l.ox["fileLines@500"] !== undefined, 500],
  [
    "max-lines",
    "oxlint",
    (fr, l) => l.ox["fileLines@1000"] !== undefined,
    1000,
  ],
  [
    "noExcessiveLinesPerFile",
    "biome",
    (fr, l) => l.bi["fileLines@300"] !== undefined,
    300,
  ],
  [
    "noExcessiveLinesPerFile",
    "biome",
    (fr, l) => l.bi["fileLines@500"] !== undefined,
    500,
  ],
  [
    "noExcessiveLinesPerFile",
    "biome",
    (fr, l) => l.bi["fileLines@1000"] !== undefined,
    1000,
  ],
  ["sonarjs/max-lines", "sonarjs", (fr) => fr.sonarLines > 1000, 1000],
  ["max-classes-per-file", "eslint", (fr) => fr.classes > 1, 1],
  [
    "max-classes-per-file",
    "oxlint",
    (fr, l) => l.ox["classes@1"] !== undefined,
    1,
  ],
  [
    "noExcessiveClassesPerFile",
    "biome",
    (fr, l) => l.bi["classes@1"] !== undefined,
    1,
  ],
  ["sonarjs/max-switch-cases", "sonarjs", (fr) => fr.switchesOver30 > 0, 30],
  ["sonarjs/max-union-size", "sonarjs", (fr) => fr.unionsOver3 > 0, 3],
];

const load = (name) => {
  const fns = lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`));
  const files = lib.readJsonl(join(CENSUS, `${name}.files.jsonl`));
  const lint = new Map(
    lib.readJsonl(join(LINT, `${name}.jsonl`)).map((r) => [r.id, r])
  );
  const flint = new Map(
    lib.readJsonl(join(LINT, `${name}.files.jsonl`)).map((r) => [r.file, r])
  );
  return { files, flint, fns, lint };
};

const reportsFor = (sets) => {
  const out = {};
  const lines = sets.files.reduce((s, f) => s + f.physicalLines, 0);
  for (const [label, linter, test, t] of FN_VIEWS) {
    const n = sets.fns.filter((f) => test(f, sets.lint.get(f.id))).length;
    out[`${linter} ${label} ${t}`] = {
      functions: n,
      pct: lib.pct(n, sets.fns.length),
      per10k: lib.per10k(n, lines),
    };
  }
  for (const [k, count] of Object.entries(DIAGNOSTICS)) {
    const n = sets.fns.reduce((s, f) => s + count(f, sets.lint.get(f.id)), 0);
    out[`${k} (diagnostics)`] = {
      diagnostics: n,
      per10k: lib.per10k(n, lines),
    };
  }
  // ESLint's max-depth at module level (outside any function)
  for (const [label, linter, test, t] of FILE_VIEWS) {
    const n = sets.files.filter((fr) =>
      test(fr, sets.flint.get(fr.file))
    ).length;
    out[`${linter} ${label} ${t}`] = {
      files: n,
      pct: lib.pct(n, sets.files.length),
      per10k: lib.per10k(n, lines),
    };
  }
  // type-level signatures max-params reports (not functions), at each linter's default
  const typeLevel = { biome: 0, eslint: 0, oxlint: 0 };
  for (const fr of sets.files) {
    const l = sets.flint.get(fr.file);
    typeLevel.eslint += l.typeLevel.eslint?.["params@3"] ?? 0;
    typeLevel.oxlint += l.typeLevel.oxlint?.["params@3"] ?? 0;
    typeLevel.biome += l.typeLevel.biome?.["params@4"] ?? 0;
  }
  out.typeLevelParams = typeLevel;
  out.lines = lines;
  out.functions = sets.fns.length;
  out.files = sets.files.length;
  return out;
};

// ── agreement ──────────────────────────────────────────────────────────
const agreement = (sets) => {
  const reasons = {};
  const add = (k, f) => {
    reasons[k] ??= { examples: [], n: 0 };
    reasons[k].n++;
    if (reasons[k].examples.length < 3) {
      reasons[k].examples.push({
        file: f.file,
        kind: f.kind,
        line: f.startLine,
        name: f.name,
        permalink: lib.permalink(f.repo, f.file, f.startLine),
        repo: f.repo,
      });
    }
  };
  let compared = 0;
  const biomeGap = {
    brace: 0,
    comment: 0,
    counted: 0,
    head: 0,
    jsxText: 0,
    string: 0,
  };
  const flaggedOnlyEslint = { accessor: 0, n: 0 };
  const onlyEslintGap = {
    brace: 0,
    comment: 0,
    counted: 0,
    head: 0,
    jsxText: 0,
    string: 0,
  };
  const dominant = {};
  for (const f of sets.fns) {
    const l = sets.lint.get(f.id);
    compared++;
    // lines: ESLint vs Oxlint
    const ox = l.ox["lines@0"];
    if (f.iifeLoose && !f.iife) {
      add("lines eslint/oxlint: an IIFE behind a cast (Oxlint skips it)", f);
    } else if (!f.iifeLoose && ox !== f.lines) {
      add(
        ox === f.linesFn
          ? "lines eslint/oxlint: Oxlint counts from the function node, ESLint from the method key"
          : "lines eslint/oxlint: other",
        f
      );
    }
    // lines: Biome, reimplementation must predict it
    const bi = l.bi["lines@1"];
    const expected = f.biomeLines > 1 ? f.biomeLines : undefined;
    if (bi !== expected) {
      add("lines biome: reimplementation differs", f);
    }
    if (f.biomeExplain) {
      for (const k of Object.keys(biomeGap)) {
        biomeGap[k] += f.biomeExplain[k];
      }
    }
    const eslintOver = !f.iife && f.lines > 50;
    const biomeOver = l.bi["lines@50"] !== undefined;
    if (eslintOver && !biomeOver) {
      flaggedOnlyEslint.n++;
      if (f.biomeLines === null) {
        flaggedOnlyEslint.accessor++;
        add(
          "lines over 50: ESLint only (Biome doesn't check getters and setters)",
          f
        );
      } else {
        const e = f.biomeExplain;
        for (const k of Object.keys(onlyEslintGap)) {
          onlyEslintGap[k] += e[k];
        }
        const parts = {
          brace: e.brace,
          comment: e.comment,
          head: e.head + 1,
          jsxText: e.jsxText,
          string: e.string,
        };
        const top = Object.entries(parts).sort((a, b) => b[1] - a[1])[0][0];
        dominant[top] = (dominant[top] ?? 0) + 1;
      }
    }
    if (!eslintOver && biomeOver) {
      add(
        f.iife
          ? "lines over 50: Biome only (an IIFE, which ESLint and Oxlint skip by default)"
          : "lines over 50: Biome only (other)",
        f
      );
    }
    // SonarJS at 200 vs ESLint at 200
    const sonarOver = !f.iifeSonar && !f.sonarReactExempt && f.sonarLines > 200;
    const es200 = !f.iife && f.lines > 200;
    if (es200 && !sonarOver) {
      add(
        f.sonarReactExempt
          ? "lines over 200: ESLint only (SonarJS exempts a function component)"
          : f.iifeSonar
            ? "lines over 200: ESLint only (an IIFE)"
            : "lines over 200: ESLint only (SonarJS counts only lines of code)",
        f
      );
    }
    if (!es200 && sonarOver) {
      add(
        f.iife
          ? "lines over 200: SonarJS only (an arrow IIFE, which SonarJS counts)"
          : "lines over 200: SonarJS only (other)",
        f
      );
    }
    // statements
    const oxs = l.ox["statements@0"] ?? 0;
    if (oxs !== f.statements) {
      add(
        oxs === f.statements - f.directives
          ? "statements eslint/oxlint: Oxlint doesn't count directives"
          : "statements eslint/oxlint: other",
        f
      );
    }
    const bis = l.bi["statements@0"] ?? 0;
    if (bis !== f.statements) {
      add("statements eslint/biome: other", f);
    }
    // params
    const oxp = l.ox["params@0"] ?? 0;
    if (oxp !== f.paramsEslint) {
      add("params eslint/oxlint: other", f);
    }
    const bip = l.bi["params@0"] ?? 0;
    if (bip !== f.paramsEslint) {
      const why = /^(?:set|object-set|get|object-get)$/.test(f.kind)
        ? "params eslint/biome: Biome doesn't check getters and setters"
        : f.thisVoid && bip === f.params
          ? "params eslint/biome: Biome counts a `this: void` parameter"
          : bip === 0 && f.kind === "declaration"
            ? "params eslint/biome: Biome doesn't check `export default function`"
            : "params eslint/biome: other";
      add(why, f);
    }
    // depth
    const oxd = l.ox["depth@0"] ?? 0;
    if (oxd !== f.maxDepth) {
      add(
        "depth eslint/oxlint: other (an `if` as another `if`'s brace-less body?)",
        f
      );
    }
    if (f.sonarNestMax > 3 !== f.maxDepth > 3) {
      add(
        f.sonarNestBase > 0 && f.sonarNestMax > 3 && f.maxDepth <= 3
          ? "nesting S134/max-depth at 3: S134 carries the enclosing function's nesting into a callback"
          : "nesting S134/max-depth at 3: other",
        f
      );
    }
    // callbacks
    const oxc = l.ox["callbacks@0"];
    if ((oxc ?? null) !== (f.callbackDepth ?? null)) {
      add(
        f.callbackDepth === null
          ? f.iifeLoose
            ? "callbacks eslint/oxlint: Oxlint counts an IIFE as a callback"
            : "callbacks eslint/oxlint: Oxlint counts a function behind a cast or `.call` as a callback"
          : "callbacks eslint/oxlint: Oxlint counts IIFE or cast ancestors as callback levels",
        f
      );
    }
  }
  return {
    biomeUncountedLineBreaks: biomeGap,
    compared,
    eslintOnlyOver50: {
      ...flaggedOnlyEslint,
      dominantReason: dominant,
      uncountedLineBreaks: onlyEslintGap,
    },
    reasons,
  };
};

const fileAgreement = (sets) => {
  const reasons = {};
  const add = (k, fr) => {
    reasons[k] ??= { examples: [], n: 0 };
    reasons[k].n++;
    if (reasons[k].examples.length < 3) {
      reasons[k].examples.push({ file: fr.file, repo: fr.repo });
    }
  };
  for (const fr of sets.files) {
    const l = sets.flint.get(fr.file);
    if ((l.ox["fileLines@0"] ?? 0) !== fr.oxlintLines) {
      add("file lines oxlint: differs from the census", fr);
    }
    if (fr.oxlintLines !== fr.lines) {
      add("file lines eslint/oxlint: line terminators other than \\n", fr);
    }
    if ((l.bi["fileLines@1"] ?? 1) !== fr.biomeLines) {
      add("file lines biome: reimplementation differs", fr);
    }
    const oxc = l.ox["classes@0"] ?? 0;
    if (oxc !== fr.classes && !(fr.classes === 0 && oxc === 0)) {
      add("classes eslint/oxlint: other", fr);
    }
    const bic = l.bi["classes@1"];
    if ((fr.classesBiome > 1 ? fr.classesBiome : undefined) !== bic) {
      add("classes biome: reimplementation differs", fr);
    }
    if (fr.classes > 1 && !(fr.classesBiome > 1)) {
      add(
        "classes over 1: ESLint and Oxlint only (Biome doesn't count `export default class`)",
        fr
      );
    }
  }
  return reasons;
};

const main = () => {
  const repos = lib.ALL;
  const data = {};
  for (const name of repos) {
    data[name] = load(name);
  }
  const subset = (names, test) => {
    const fns = [];
    const files = [];
    const lint = new Map();
    const flint = new Map();
    for (const n of names) {
      const d = data[n];
      for (const f of d.fns) {
        if (f.test === test) {
          fns.push(f);
          lint.set(f.id, d.lint.get(f.id));
        }
      }
      for (const fr of d.files) {
        if (fr.test === test) {
          files.push(fr);
          flint.set(fr.file, d.flint.get(fr.file));
        }
      }
    }
    // file keys must be unique across repos
    if (names.length > 1) {
      const fl = new Map();
      for (const n of names) {
        for (const fr of data[n].files) {
          if (fr.test === test) {
            fl.set(`${n}:${fr.file}`, data[n].flint.get(fr.file));
          }
        }
      }
      const files2 = files.map((fr) => ({
        ...fr,
        file: `${fr.repo}:${fr.file}`,
      }));
      return { files: files2, flint: fl, fns, lint };
    }
    return { files, flint, fns, lint };
  };
  const result = {
    generated: new Date().toISOString(),
    note: "Raw counts: in-file disable comments neutralised (Oxlint, Biome) or ignored (ESLint). One report per function for the per-function rules (max-depth reports each block over the limit; its diagnostics are counted apart). `typeLevelParams` are max-params reports on function types and declared functions, which aren't functions in the census. Per-10,000 rates are per physical line of the files in the set.",
    pooled: {},
    repos: {},
  };
  for (const name of repos) {
    result.repos[name] = {
      source: reportsFor(subset([name], false)),
      tests: data[name].files.some((f) => f.test)
        ? reportsFor(subset([name], true))
        : null,
    };
  }
  const SETS = {
    core: lib.CORE,
    dogfood: lib.DOGFOOD,
    external: [...lib.CORE, ...lib.REACT],
    react: lib.REACT,
  };
  for (const [set, names] of Object.entries(SETS)) {
    for (const test of [false, true]) {
      const s = subset(names, test);
      result.pooled[`${set}:${test ? "tests" : "source"}`] = {
        agreement: agreement(s),
        fileAgreement: fileAgreement(s),
        reports: reportsFor(s),
      };
    }
  }
  const runs = lib.readJson(join(LINT, "runs.json"));
  result.messages = runs.messages;
  result.linterChecks = runs.perRepo;
  result.runs = { biome: runs.biome, eslint: runs.eslint, oxlint: runs.oxlint };
  result.defaults = runs.defaults;
  result.tools = runs.tools;
  lib.writeJson(join(lib.RESULTS_DIR, "corpus-lint.json"), result);
  const p = result.pooled["external:source"];
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(p.agreement.reasons).map(([k, v]) => [k, v.n])
      ),
      null,
      1
    )
  );
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(p.fileAgreement).map(([k, v]) => [k, v.n])
      ),
      null,
      1
    )
  );
};

main();
