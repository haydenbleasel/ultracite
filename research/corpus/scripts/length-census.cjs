// The inventory: every function and every file in the corpus, the React set and Ultracite's CLI,
// source and tests kept apart, measured the way each length rule counts (length-lib.cjs `measure`:
// the census rule's own counts, checked against the real ESLint and SonarJS rules at threshold 0
// function by function). Also cognitive and cyclomatic complexity, from the same rules the
// cognitive-complexity topic used, joined the same way.
//
// Per function: physical lines (from the method key, as max-lines-per-function counts), lines
// without blanks, without blanks and comments, SonarJS's lines of code, Biome's body lines,
// statements, parameters (with and without `this`, destructured, rest, defaults, parameter
// properties), block depth, SonarJS's nesting (which doesn't reset at function boundaries),
// callback depth, IIFEs and inline callbacks, React components and their JSX lines, test callbacks,
// switch and if-chain dispatchers, data-literal lines, nested-function lines, locals and free
// variables, and complexity. Per file: lines in each linter's count, classes, switches, unions.
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/length-census.cjs [--repos a,b]
// Writes out/length-limits/census/<repo>.functions.jsonl and .files.jsonl, and
// results/length-limits/census.json.
"use strict";

const { join } = require("node:path");

const lib = require("./length-lib.cjs");

const OUT = join(lib.OUT_DIR, "census");

// Thresholds the tables report: each rule's default and the common settings.
const T = {
  callbackDepth: [5, 10],
  classes: [1],
  depth: [3, 4],
  fileLines: [300, 500, 1000],
  lines: [50, 100, 200],
  params: [3, 4, 5, 7],
  statements: [10, 20, 30],
};
const LENGTH_BUCKETS = [
  [1, 10],
  [11, 25],
  [26, 50],
  [51, 100],
  [101, 200],
  [201, 500],
  [501, Infinity],
];
const bucketOf = (n) => {
  const b = LENGTH_BUCKETS.find(([lo, hi]) => n >= lo && n <= hi);
  return b ? (b[1] === Infinity ? `${b[0]}+` : `${b[0]}-${b[1]}`) : "0";
};

// A function's shape, by the share of its own lines (not counting nested functions' interiors):
const shapeOf = (f) => {
  const own = Math.max(1, f.lines - f.nestedLines);
  return {
    dataShare: f.dataLines / own,
    jsxShare: f.jsxLines / f.lines,
    nestedShare: f.nestedLines / f.lines,
    switchShare: f.switchLines / f.lines,
  };
};
const kindsOf = (f, test) => {
  const s = shapeOf(f);
  const kinds = [];
  if (test || f.inTest) {
    kinds.push("test");
  }
  if (f.component) {
    kinds.push("component");
  }
  if (
    f.own.switchCasesMax >= 8 ||
    (s.switchShare >= 0.5 && f.own.switchCasesMax >= 3)
  ) {
    kinds.push("switch");
  }
  if (f.own.ifChainMax >= 8) {
    kinds.push("if-chain");
  }
  if (s.dataShare >= 0.5) {
    kinds.push("data");
  }
  if (s.nestedShare >= 0.5) {
    kinds.push("mostly-nested");
  }
  if (f.iifeLoose) {
    kinds.push("iife");
  }
  if (f.callback) {
    kinds.push("callback");
  }
  return kinds;
};

const row = (repo, rel, test, f, all) => {
  // inside a test callback (any ancestor)
  let inTest = false;
  for (let p = f.parentIndex; p !== null; p = all[p].parentIndex) {
    if (all[p].testCallback) {
      inTest = true;
      break;
    }
  }
  const r = {
    async: f.async,
    biomeLines: f.biomeLines,
    biomeLinesNoBlank: f.biomeLinesNoBlank,
    blankLines: f.blankLines,
    callback: f.callback,
    callbackBiome: f.callbackBiome,
    callbackDepth: f.callbackDepth,
    callbackOxlint: f.callbackOxlint,
    callee: f.callee,
    cognitive: f.cognitive,
    commentLines: f.commentLines,
    component: f.component,
    componentName: f.componentName,
    cyclomatic: f.cyclomatic,
    dataLines: f.dataLines,
    depth: f.depth,
    directives: f.directives,
    embedStartLine: f.embedStartLine,
    embedded: f.embedded,
    endLine: f.endLine,
    eslintKey: f.eslintKey,
    eslintName: f.eslintName,
    expressionBody: f.expressionBody,
    file: rel,
    freeEnclosing: f.freeEnclosing.length,
    freeGlobal: f.freeGlobal.slice(0, 30),
    freeModule: f.freeModule.length,
    generator: f.generator,
    id: lib.fnId(repo, rel, f),
    iife: f.iife,
    iifeLoose: f.iifeLoose,
    iifeSonar: f.iifeSonar,
    inTest,
    index: f.index,
    jsxLines: f.jsxLines,
    kind: f.kind,
    lines: f.lines,
    linesCode: f.linesCode,
    linesFn: f.linesFn,
    linesNoBlank: f.linesNoBlank,
    locals: f.locals,
    maxDepth: f.maxDepth,
    name: f.name,
    nestedFunctions: f.nestedFunctions,
    nestedLines: f.nestedLines,
    nodeType: f.nodeType,
    own: f.own,
    biomeExplain: f.biomeExplain,
    ownerStart: f.ownerStart,
    params: f.params,
    paramsStart: f.paramsStart,
    paramsDefault: f.paramsDefault,
    paramsDestructured: f.paramsDestructured,
    paramsEslint: f.paramsEslint,
    paramsNoThis: f.paramsNoThis,
    paramsProperties: f.paramsProperties,
    paramsRest: f.paramsRest,
    parentIndex: f.parentIndex,
    range: f.range,
    reassignedLocals: f.reassignedLocals,
    repo,
    returnsJsx: f.returnsJsx,
    sonarKey: f.sonarKey,
    sonarLines: f.sonarLines,
    sonarNestBase: f.sonarNestBase,
    sonarNestMax: f.sonarNestMax,
    sonarReactExempt: f.sonarReactExempt,
    startColumn: f.startColumn,
    startLine: f.startLine,
    statements: f.statements,
    switchLines: f.switchLines,
    templateLines: f.templateLines,
    test,
    testCallback: f.testCallback,
    thisParam: f.thisParam,
    thisVoid: f.thisVoid,
  };
  r.kinds = kindsOf({ ...f, inTest }, test);
  return r;
};

const summarise = (fns, files) => {
  const lines = files.reduce((s, f) => s + f.physicalLines, 0);
  const notIife = fns.filter((f) => !f.iife);
  const over = (xs, field, t) => xs.filter((f) => (f[field] ?? 0) > t).length;
  const share = (n, d) => ({
    n,
    pct: lib.pct(n, d),
    per10k: lib.per10k(n, lines),
  });
  const callbacks = fns.filter((f) => f.callback);
  const out = {
    callbacks: callbacks.length,
    components: fns.filter((f) => f.component).length,
    distributions: {
      biomeLines: lib.distribution(fns.map((f) => f.biomeLines)),
      callbackDepth: lib.distribution(callbacks.map((f) => f.callbackDepth)),
      cognitive: lib.distribution(fns.map((f) => f.cognitive)),
      fileClasses: lib.distribution(files.map((f) => f.classes)),
      fileLines: lib.distribution(files.map((f) => f.lines)),
      fileLinesCode: lib.distribution(files.map((f) => f.linesCode)),
      lines: lib.distribution(notIife.map((f) => f.lines)),
      linesCode: lib.distribution(notIife.map((f) => f.linesCode)),
      maxDepth: lib.distribution(fns.map((f) => f.maxDepth)),
      params: lib.distribution(fns.map((f) => f.paramsEslint)),
      sonarLines: lib.distribution(fns.map((f) => f.sonarLines)),
      statements: lib.distribution(fns.map((f) => f.statements)),
    },
    files: files.length,
    functions: fns.length,
    iifes: fns.filter((f) => f.iife).length,
    iifesLoose: fns.filter((f) => f.iifeLoose).length,
    kinds: lib.countBy(fns, (f) => f.kind),
    lengthBuckets: lib.countBy(notIife, (f) => bucketOf(f.lines)),
    lines,
    over: {},
    signatures: files.reduce((s, f) => s + f.signatures, 0),
    testCallbacks: fns.filter((f) => f.testCallback).length,
  };
  for (const t of T.lines) {
    out.over[`lines>${t}`] = share(over(notIife, "lines", t), fns.length);
    out.over[`linesCode>${t}`] = share(
      over(notIife, "linesCode", t),
      fns.length
    );
  }
  out.over["sonarLines>200"] = share(
    fns.filter((f) => !f.iifeSonar && !f.sonarReactExempt && f.sonarLines > 200)
      .length,
    fns.length
  );
  out.over["biomeLines>50"] = share(over(fns, "biomeLines", 50), fns.length);
  for (const t of T.statements) {
    out.over[`statements>${t}`] = share(over(fns, "statements", t), fns.length);
  }
  for (const t of T.params) {
    out.over[`params>${t}`] = share(over(fns, "paramsEslint", t), fns.length);
  }
  for (const t of T.depth) {
    out.over[`depth>${t}`] = share(over(fns, "maxDepth", t), fns.length);
  }
  out.over["sonarNest>3"] = share(over(fns, "sonarNestMax", 3), fns.length);
  for (const t of T.callbackDepth) {
    out.over[`callbackDepth>${t}`] = share(
      over(fns, "callbackDepth", t),
      fns.length
    );
  }
  for (const t of T.fileLines) {
    out.over[`fileLines>${t}`] = share(over(files, "lines", t), files.length);
  }
  out.over["fileSonarLines>1000"] = share(
    over(files, "sonarLines", 1000),
    files.length
  );
  out.over["fileClasses>1"] = share(over(files, "classes", 1), files.length);
  out.over["switchCases>30"] = share(
    files.reduce((s, f) => s + f.switchesOver30, 0),
    files.length
  );
  out.over["unions>3 (sonar)"] = share(
    files.reduce((s, f) => s + f.unionsOver3, 0),
    files.length
  );
  // what the functions over 50 lines are
  const long = notIife.filter((f) => f.lines > 50);
  out.long50 = {
    kinds: lib.countBy(
      long.flatMap((f) => (f.kinds.length ? f.kinds : ["other"])),
      (k) => k
    ),
    n: long.length,
    nested: lib.countBy(long, (f) => (f.depth === 0 ? "top-level" : "nested")),
    shareOfLinesInNested: lib.pct(
      long.reduce((s, f) => s + f.nestedLines, 0),
      long.reduce((s, f) => s + f.lines, 0)
    ),
  };
  return out;
};

const main = () => {
  const repos = lib.selectedRepos();
  lib.checkPinned(repos);
  const result = {
    generated: new Date().toISOString(),
    lengthBuckets: LENGTH_BUCKETS.map(([a, b]) =>
      b === Infinity ? `${a}+` : `${a}-${b}`
    ),
    note: "Every function (ESLint's :function: declarations, expressions and arrows, including methods, accessors, constructors, class-field arrows, callbacks and IIFEs) and every file, source and tests apart. `lines` is max-lines-per-function's count (physical lines from the method key or function start to its end); `linesCode` skips blank and comment-only lines; `sonarLines` is sonarjs/max-lines-per-function's lines of code (from the function node, blank and full-line-comment lines skipped); `biomeLines` is noExcessiveLinesPerFunction's count (body only; see length-lib.cjs). `statements`, `params` (ESLint's count: `this` unless typed void), `maxDepth` and `callbackDepth` are max-statements', max-params', max-depth's and max-nested-callbacks' counts. Every count was checked against the real rule's message for every function (`checks`). Distributions of lines skip IIFEs, which max-lines-per-function skips by default. Per-10,000 rates are per physical line of the files in the set.",
    repos: {},
    thresholds: T,
    tools: lib.toolVersions(),
  };
  const pooled = {};
  const addPool = (key, fns, files) => {
    pooled[key] ??= { files: [], fns: [] };
    for (const f of fns) {
      pooled[key].fns.push(f);
    }
    for (const f of files) {
      pooled[key].files.push(f);
    }
  };
  const checks = {
    functions: 0,
    mismatches: [],
    parseErrors: [],
    unmatched: [],
  };
  for (const name of repos) {
    const repo = lib.getRepo(name);
    const list = lib.filesOf(name);
    const fnRows = [];
    const fileRows = [];
    const t0 = Date.now();
    for (const { rel, test } of list) {
      const text = lib.readFileSync(join(repo.root, rel), "utf8");
      const m = lib.measure(text, rel);
      if (m.error) {
        checks.parseErrors.push({ error: m.error, file: rel, repo: name });
        continue;
      }
      checks.functions += m.functions.length;
      for (const x of m.mismatches) {
        checks.mismatches.push({ ...x, file: rel, repo: name });
      }
      for (const x of m.unmatched) {
        checks.unmatched.push({ ...x, file: rel, repo: name });
      }
      for (const f of m.functions) {
        fnRows.push(row(name, rel, test, f, m.functions));
      }
      const sigsOver = m.signatures.filter((s) => s.params > 3);
      fileRows.push({
        biomeLines: m.file.biomeLines,
        classes: m.file.classes,
        classesBiome: m.file.classesBiome,
        depthTop: m.file.depthTop,
        file: rel,
        functions: m.file.functions,
        lines: m.file.lines,
        linesCode: m.file.linesCode,
        linesNoBlank: m.file.linesNoBlank,
        maxSwitchNonEmpty: Math.max(
          0,
          ...m.file.switches.map((s) => s.nonEmpty)
        ),
        oxlintLines: m.file.oxlintLines,
        physicalLines: m.file.physicalLines,
        repo: name,
        signatures: m.file.signatures,
        signaturesOver3: sigsOver.map((s) => ({
          line: s.line,
          params: s.params,
          thisParam: s.thisParam,
          type: s.type,
        })),
        sonarAtFour: m.file.sonarAtFour,
        sonarLines: m.file.sonarLines,
        switches: m.file.switches,
        switchesOver30: m.file.switches.filter((s) => s.nonEmpty > 30).length,
        test,
        unions: m.file.unions.filter((u) => u.size > 3),
        unionsOver3: m.file.unions.filter((u) => u.sonar && u.size > 3).length,
      });
    }
    lib.writeJsonl(join(OUT, `${name}.functions.jsonl`), fnRows);
    lib.writeJsonl(join(OUT, `${name}.files.jsonl`), fileRows);
    const src = fnRows.filter((f) => !f.test);
    const srcFiles = fileRows.filter((f) => !f.test);
    const tst = fnRows.filter((f) => f.test);
    const tstFiles = fileRows.filter((f) => f.test);
    result.repos[name] = {
      github: lib.repoMeta(name).github,
      set: lib.setOf(name),
      sha: lib.shaOf(name),
      source: summarise(src, srcFiles),
      tests: tstFiles.length ? summarise(tst, tstFiles) : null,
    };
    const set = lib.setOf(name);
    addPool(`${set}:source`, src, srcFiles);
    addPool(`${set}:tests`, tst, tstFiles);
    if (set !== "dogfood") {
      addPool("external:source", src, srcFiles);
      addPool("external:tests", tst, tstFiles);
    }
    console.log(
      `${name}: ${list.length} files, ${fnRows.length} functions (${src.length} source), ${((Date.now() - t0) / 1000).toFixed(1)}s`
    );
  }
  result.pooled = Object.fromEntries(
    Object.entries(pooled).map(([k, v]) => [k, summarise(v.fns, v.files)])
  );
  result.checks = {
    functions: checks.functions,
    mismatches: checks.mismatches.length,
    mismatchExamples: checks.mismatches.slice(0, 50),
    parseErrors: checks.parseErrors,
    unmatched: checks.unmatched.length,
    unmatchedExamples: checks.unmatched.slice(0, 20),
  };
  lib.writeJson(join(lib.RESULTS_DIR, "census.json"), result);
  console.log(
    `checks: ${checks.functions} functions, ${checks.mismatches.length} mismatches, ${checks.unmatched.length} unmatched reports, ${checks.parseErrors.length} parse errors`
  );
  if (checks.mismatches.length || checks.unmatched.length) {
    process.exitCode = 1;
  }
};

main();
