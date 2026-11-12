// The inventory: every conditional expression in every repo (source and tests apart), the ternary
// trees they form, where each nested ternary sits, how its tests and branches look, every
// TypeScript conditional type, every if/else chain and guard chain, and the cognitive complexity
// of every function. The real ESLint rules run in the same pass (nested-ternaries-lib.cjs
// `inventory`), with inline config ignored (raw) and, for files with a disable directive, honoured
// (reported). The census checks that ESLint's no-nested-ternary reports exactly the conditionals
// the inventory predicts (a conditional whose consequent or alternate is a conditional), that
// unicorn/no-nested-ternary reports exactly its predicted leaves, and that sonarjs reports exactly
// the conditionals with an unbroken conditional ancestor.
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/nested-ternaries-census.cjs [--repos a,b]
// Writes out/nested-ternaries/census/<repo>.{trees,functions,files,eslint,ifs,indirect}.jsonl and
// results/nested-ternaries/census.json.
"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const DIRECTIVE = /\b(?:eslint|oxlint)-(?:disable|enable)|biome-ignore/;

const countBy = (xs, f) => {
  const out = {};
  for (const x of xs) {
    const k = f(x);
    if (k === null || k === undefined) {
      continue;
    }
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};

// What each rule should report, from the inventory alone.
const predictions = (inv) => {
  const byId = new Map(inv.conditionals.map((c) => [c.id, c]));
  const childrenOf = new Map();
  for (const c of inv.conditionals) {
    if (c.slot !== null) {
      const parent = c.ancestor;
      if (!childrenOf.has(parent)) {
        childrenOf.set(parent, []);
      }
      childrenOf.get(parent).push(c);
    }
  }
  const eslintNNT = [];
  const unicornNNT = [];
  const sonar = [];
  for (const c of inv.conditionals) {
    const kids = childrenOf.get(c.id) ?? [];
    if (kids.some((k) => k.slot === "consequent" || k.slot === "alternate")) {
      eslintNNT.push(`${c.line}:${c.column}`);
    }
    if (kids.length === 0) {
      // the number of consecutive conditional parents
      let level = 0;
      const chain = [];
      for (let x = c; x.slot !== null; x = byId.get(x.ancestor)) {
        level++;
        chain.push(byId.get(x.ancestor));
      }
      if (level === 1 && !c.parenthesized) {
        unicornNNT.push(`${c.line}:${c.column}:paren`);
      } else if (level > 1) {
        const node = level > 2 ? chain[level - 3] : c;
        unicornNNT.push(`${node.line}:${node.column}:deep`);
      }
    }
    if (c.sonarNested) {
      sonar.push(`${c.line}:${c.column}`);
    }
  }
  return { eslintNNT, sonar, unicornNNT };
};

const measureRepo = (name) => {
  const repo = lib.getRepo(name);
  const files = lib.filesOf(name);
  const trees = [];
  const fnRows = [];
  const fileRows = [];
  const eslintRows = [];
  const ifRows = [];
  const indirect = [];
  const errors = [];
  const check = { eslintNNT: [0, 0], sonar: [0, 0], unicornNNT: [0, 0] };
  const mismatches = [];
  for (const { rel, test } of files) {
    const text = readFileSync(join(repo.root, rel), "utf8");
    const r = lib.inventory(text, rel);
    if (r.error) {
      errors.push({ error: r.error, file: rel });
      continue;
    }
    let reported = null;
    if (DIRECTIVE.test(text)) {
      const r2 = lib.inventory(text, rel, { inline: true });
      reported = r2.error ? null : r2.eslint;
    }
    // prediction checks (raw)
    const pred = predictions(r);
    const actual = {
      eslintNNT: r.eslint
        .filter((m) => m.rule === "no-nested-ternary")
        .map((m) => `${m.line}:${m.column}`),
      sonar: r.eslint
        .filter((m) => m.rule === "sonarjs/no-nested-conditional")
        .map((m) => `${m.line}:${m.column}`),
      unicornNNT: r.eslint
        .filter((m) => m.rule === "unicorn/no-nested-ternary")
        .map(
          (m) =>
            `${m.line}:${m.column}:${m.messageId === "too-deep" ? "deep" : "paren"}`
        ),
    };
    for (const k of Object.keys(check)) {
      const a = [...actual[k]].sort();
      const p = [...pred[k]].sort();
      check[k][0] += a.length;
      check[k][1] += p.length;
      if (JSON.stringify(a) !== JSON.stringify(p)) {
        mismatches.push({ actual: a, file: rel, predicted: p, rule: k });
      }
    }
    const nestedFns = new Set(r.trees.map((t) => t.fn));
    for (const t of r.trees) {
      const fn = t.fn === null ? null : r.functions[t.fn];
      trees.push({
        file: rel,
        test,
        ...t,
        fnCognitive: fn ? fn.cognitive : (r.fileCognitive ?? 0),
        fnLines: fn ? fn.endLine - fn.line + 1 : null,
        fnName: fn ? fn.name : null,
      });
    }
    for (const f of r.functions) {
      // keep every function with a nested ternary, an if/else chain, or a guard chain
      const hasIf = r.ifChains.some((i) => i.fn === f.index && i.length >= 2);
      const hasGuard = r.guards.some((g) => g.fn === f.index);
      const ownConds = r.conditionals.filter((c) => c.fn === f.index).length;
      fnRows.push({
        cognitive: f.cognitive,
        conditionals: ownConds,
        file: rel,
        guardChains: hasGuard,
        ifChains: hasIf,
        index: f.index,
        lines: f.endLine - f.line + 1,
        line: f.line,
        name: f.name,
        nestedTernaries: r.trees.filter((t) => t.fn === f.index).length,
        test,
      });
    }
    for (const i of r.ifChains) {
      ifRows.push({ file: rel, test, ...i });
    }
    // conditionals nested through other expressions (not tree members)
    for (const c of r.conditionals) {
      if (c.slot === null && c.ancestor !== null) {
        indirect.push({
          ancestorSlot: c.ancestorSlot,
          file: rel,
          line: c.line,
          path: c.path,
          sonarNested: c.sonarNested,
          test,
          viaFunction: c.viaFunction,
        });
      }
    }
    fileRows.push({
      conditionals: r.conditionals.length,
      condTypes: r.condTypes.length,
      condTypesNested: r.condTypes.filter((t) => t.nestedIn).length,
      condTypesNestedIn: countBy(r.condTypes, (t) => t.nestedIn),
      directive: DIRECTIVE.test(text),
      file: rel,
      guardChains: r.guards.length,
      guardChainsLong: r.guards.filter((g) => g.guards >= 2).length,
      ifChains: r.ifChains.length,
      ifChainsElseIf: r.ifChains.filter((i) => i.length >= 2).length,
      ifChainsTernaryShaped: r.ifChains.filter((i) => i.ternaryShaped).length,
      jsx: /\.[jt]sx$/.test(rel),
      lines: r.lines,
      nestedFunctions: nestedFns.size,
      test,
      trees: r.trees.length,
    });
    for (const m of r.eslint) {
      eslintRows.push({ file: rel, mode: "raw", test, ...m });
    }
    for (const m of reported ?? r.eslint) {
      eslintRows.push({ file: rel, mode: "reported", test, ...m });
    }
  }
  return {
    check,
    errors,
    eslintRows,
    fileRows,
    fnRows,
    ifRows,
    indirect,
    mismatches,
    trees,
  };
};

// ── summaries ──────────────────────────────────────────────────────────
const distribution = (values) => {
  if (values.length === 0) {
    return null;
  }
  const s = [...values].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return {
    max: s.at(-1),
    mean: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 100) / 100,
    median: q(0.5),
    n: s.length,
    p90: q(0.9),
  };
};
const summarise = ({
  trees,
  fileRows,
  fnRows,
  ifRows,
  indirect,
  eslintRows,
}) => {
  const lines = lib.sum(fileRows, (f) => f.lines);
  const conditionals = lib.sum(fileRows, (f) => f.conditionals);
  const jsxLines = lib.sum(
    fileRows.filter((f) => f.jsx),
    (f) => f.lines
  );
  const inNested = lib.sum(trees, (t) => t.members);
  const reportedTrees = trees.filter(
    (t) => t.slots.consequent + t.slots.alternate > 0
  );
  const byPos = countBy(trees, (t) => t.position);
  const rewriteOf = countBy(trees, (t) => t.rewrite);
  const lookup = trees.filter((t) => t.tests.shape === "lookup");
  const sw = trees.filter((t) => t.tests.shape === "switch");
  const leafRisks = trees.flatMap((t) => t.leafRisks);
  const anyEffect = (t) =>
    t.leafRisks.some((r) => r === "effects" || r === "await" || r === "throws");
  const anyRead = (t) => t.leafRisks.includes("reads");
  const dispatch = [...lookup, ...sw];
  return {
    conditionals,
    conditionalsPer10k: lib.per10k(conditionals, lines),
    conditionalTypes: lib.sum(fileRows, (f) => f.condTypes),
    conditionalTypesNested: lib.sum(fileRows, (f) => f.condTypesNested),
    conditionalTypesNestedIn: fileRows.reduce((o, f) => {
      for (const [k, v] of Object.entries(f.condTypesNestedIn)) {
        o[k] = (o[k] ?? 0) + v;
      }
      return o;
    }, {}),
    eslint: Object.fromEntries(
      ["raw", "reported"].map((mode) => [
        mode,
        countBy(
          eslintRows.filter((m) => m.mode === mode),
          (m) => m.rule
        ),
      ])
    ),
    files: fileRows.length,
    filesWithNested: fileRows.filter((f) => f.trees > 0).length,
    functions: {
      // functions that hold a nested ternary (own code), and their cognitive complexity
      total: fnRows.length,
      withNested: fnRows.filter((f) => f.nestedTernaries > 0).length,
      withNestedCognitive: distribution(
        fnRows.filter((f) => f.nestedTernaries > 0).map((f) => f.cognitive)
      ),
      withNestedOver20: fnRows.filter(
        (f) => f.nestedTernaries > 0 && f.cognitive > 20
      ).length,
      withoutNestedCognitive: distribution(
        fnRows
          .filter((f) => f.nestedTernaries === 0 && f.conditionals > 0)
          .map((f) => f.cognitive)
      ),
    },
    guardChains: lib.sum(fileRows, (f) => f.guardChains),
    guardChainsTwoPlus: lib.sum(fileRows, (f) => f.guardChainsLong),
    ifChains: {
      elseIf: ifRows.filter((i) => i.length >= 2).length,
      elseIfTernaryShaped: ifRows.filter(
        (i) => i.length >= 2 && i.ternaryShaped
      ).length,
      elseIfTernaryShapedByKind: countBy(
        ifRows.filter((i) => i.length >= 2 && i.ternaryShaped),
        (i) => i.ternaryShapedKind
      ),
      lengths: countBy(
        ifRows.filter((i) => i.length >= 2),
        (i) => (i.length >= 5 ? "5+" : String(i.length))
      ),
      total: ifRows.length,
      ternaryShaped: ifRows.filter((i) => i.ternaryShaped).length,
    },
    indirect: {
      sonarNested: indirect.filter((i) => i.sonarNested).length,
      total: indirect.length,
      viaFunction: indirect.filter((i) => i.viaFunction).length,
    },
    jsxLines,
    lines,
    nested: {
      byDepth: countBy(trees, (t) => (t.depth >= 5 ? "5+" : String(t.depth))),
      byPosition: byPos,
      byRewrite: rewriteOf,
      byShape: countBy(trees, (t) => t.shape),
      conditionalsInNested: inNested,
      conditionalsInNestedShare: lib.pct(inNested, conditionals),
      dispatch: {
        allPure: dispatch.filter((t) =>
          t.leafRisks.every((r) => r === "pure" || r === "jsx")
        ).length,
        discriminantKinds: countBy(dispatch, (t) => t.tests.discriminantKind),
        finalDefault: countBy(dispatch, (t) => t.finalDefault),
        lookup: lookup.length,
        looseEquality: dispatch.filter((t) => t.tests.looseEquality).length,
        multiValue: dispatch.filter((t) => t.tests.multiValue).length,
        readsOnly: dispatch.filter((t) => anyRead(t) && !anyEffect(t)).length,
        switch: sw.length,
        withEffects: dispatch.filter(anyEffect).length,
      },
      earlyReturnPossible: rewriteOf["early-return"] ?? 0,
      extractionOnly: rewriteOf.extraction ?? 0,
      inJsx: trees.filter((t) => t.inJsx).length,
      jsxLeaves: trees.filter((t) => t.jsxLeaves > 0).length,
      leafKinds: countBy(
        trees.flatMap((t) => t.leafKinds),
        (k) => k
      ),
      leafRisks: countBy(leafRisks, (k) => k),
      lines: distribution(trees.map((t) => t.lines)),
      multiline: trees.filter((t) => t.lines > 1).length,
      parenthesized: {
        all: trees.filter(
          (t) =>
            t.parenthesizedInner.length > 0 &&
            t.parenthesizedInner.every(Boolean)
        ).length,
        none: trees.filter((t) => !t.parenthesizedInner.some(Boolean)).length,
        some: trees.filter(
          (t) =>
            t.parenthesizedInner.some(Boolean) &&
            !t.parenthesizedInner.every(Boolean)
        ).length,
      },
      reportedByEslint: reportedTrees.length,
      statementInPlace:
        (rewriteOf["let-if"] ?? 0) + (rewriteOf["if-statement"] ?? 0),
      testShapes: countBy(trees, (t) => t.tests.shape),
      total: trees.length,
      treesWithEffects: trees.filter(anyEffect).length,
      wrapped: trees.filter((t) => t.wraps > 0).length,
    },
    nestedPer10k: lib.per10k(trees.length, lines),
    nestedPer10kJsx: lib.per10k(
      trees.filter((t) => /\.[jt]sx$/.test(t.file)).length,
      jsxLines
    ),
  };
};

const main = () => {
  const names = lib.selectedRepos(lib.ALL);
  lib.checkPinned(names);
  const previous = lib.readJson(join(lib.RESULTS_DIR, "census.json"), {
    repos: {},
  });
  const out = {
    generated: new Date().toISOString(),
    note: "See the header of nested-ternaries-census.cjs and nested-ternaries-lib.cjs. A ternary tree is a maximal group of conditional expressions joined through a direct test, consequent or alternate (parentheses aren't nodes; a TypeScript wrapper ends the tree); `nested` counts trees with two or more conditionals. Shapes: chain (all nesting in the alternate), consequent, test, mixed. Positions are the root's parent once TypeScript wrappers are peeled. Rewrite classes: early-return (a return argument or an arrow's concise body), let-if (a variable initializer with an identifier), if-statement (an assignment or expression statement), extraction (anything else). Test shapes: lookup (one discriminant compared with string or number literals), switch (one discriminant, other constants), thresholds (one subject compared with < or >), unrelated. Leaf risks (for eager evaluation): pure, jsx, reads (member reads), effects (calls, new, assignments), await, throws (an IIFE that throws).",
    repos: { ...previous.repos },
    tools: lib.toolVersions(),
  };
  for (const name of names) {
    const t0 = Date.now();
    const m = measureRepo(name);
    for (const [k, rows] of Object.entries({
      eslint: m.eslintRows,
      files: m.fileRows,
      functions: m.fnRows,
      ifs: m.ifRows,
      indirect: m.indirect,
      trees: m.trees,
    })) {
      lib.writeJsonl(join(CENSUS, `${name}.${k}.jsonl`), rows);
    }
    const entry = {
      check: m.check,
      errors: m.errors,
      mismatches: m.mismatches.slice(0, 20),
      mismatchCount: m.mismatches.length,
      set: lib.setOf(name),
      sha: lib.shaOf(name),
    };
    for (const test of [false, true]) {
      const pick = (rows) => rows.filter((r) => r.test === test);
      entry[test ? "tests" : "source"] = summarise({
        eslintRows: pick(m.eslintRows),
        fileRows: pick(m.fileRows),
        fnRows: pick(m.fnRows),
        ifRows: pick(m.ifRows),
        indirect: pick(m.indirect),
        trees: pick(m.trees),
      });
    }
    entry.seconds = Math.round((Date.now() - t0) / 1000);
    out.repos[name] = entry;
    const s = entry.source;
    console.log(
      `${name}: ${s.files} files, ${s.lines} lines; ${s.conditionals} conditionals; nested ${s.nested.total} (${s.nestedPer10k}/10k), eslint nnt ${s.eslint.raw["no-nested-ternary"] ?? 0}; positions ${JSON.stringify(s.nested.byRewrite)}; check ${JSON.stringify(m.check)} mismatches ${m.mismatches.length}; errors ${m.errors.length} (${entry.seconds}s)`
    );
  }
  out.pooled = {};
  for (const [set, members] of Object.entries({
    corpus: lib.CORE,
    external: [...lib.CORE, ...lib.REACT],
    react: lib.REACT,
  })) {
    out.pooled[set] = {};
    for (const test of [false, true]) {
      const rows = {
        eslintRows: [],
        fileRows: [],
        fnRows: [],
        ifRows: [],
        indirect: [],
        trees: [],
      };
      const files = {
        eslintRows: "eslint",
        fileRows: "files",
        fnRows: "functions",
        ifRows: "ifs",
        indirect: "indirect",
        trees: "trees",
      };
      for (const name of members) {
        if (!out.repos[name]) {
          continue;
        }
        for (const [k, f] of Object.entries(files)) {
          for (const r of lib.readJsonl(join(CENSUS, `${name}.${f}.jsonl`))) {
            if (r.test === test) {
              rows[k].push(r);
            }
          }
        }
      }
      out.pooled[set][test ? "tests" : "source"] = summarise(rows);
    }
  }
  lib.writeJson(join(lib.RESULTS_DIR, "census.json"), out);
  const p = out.pooled.external.source;
  console.log(
    `external source: ${p.files} files, ${p.lines} lines, ${p.conditionals} conditionals, nested ${p.nested.total} (${p.nestedPer10k}/10k); ${JSON.stringify(p.nested.byRewrite)}`
  );
};

module.exports = { predictions };

if (require.main === module) {
  main();
}
