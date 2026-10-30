// The inventory: every function in every repo (source and tests apart), how it's written, where it
// sits, and what converting it would need; the order module-level functions are written in; and
// every reference that comes before its binding's definition, with what happens at runtime.
// The real ESLint rules run in the same pass (func-style-lib.cjs `inventory`), with inline config
// ignored (raw) and, for files with a disable directive, honoured (reported).
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/func-style-census.cjs [--repos a,b]
// Writes out/func-style/census/<repo>.{functions,files,ubd,eslint}.jsonl and
// results/func-style/census.json.
"use strict";

const { readFileSync } = require("node:fs");
const { dirname, join, normalize } = require("node:path");

const lib = require("./func-style-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const DIRECTIVE = /\b(?:eslint|oxlint)-(?:disable|enable)|biome-ignore/;
const ORDER_MIN_EDGES = 2;
const ORDER_SHARE = 0.75;

const classifyOrder = (up, down) => {
  const n = up + down;
  if (n === 0) {
    return "none";
  }
  if (n < ORDER_MIN_EDGES) {
    return "one-edge";
  }
  if (down / n >= ORDER_SHARE) {
    return "top-down";
  }
  if (up / n >= ORDER_SHARE) {
    return "bottom-up";
  }
  return "mixed";
};
const fileForm = (moduleFns) => {
  const d = moduleFns.filter((m) => m.kind === "declaration").length;
  const e = moduleFns.length - d;
  if (moduleFns.length === 0) {
    return "none";
  }
  if (e === 0) {
    return "declarations";
  }
  if (d === 0) {
    return "expressions";
  }
  return d >= e * 3
    ? "mostly-declarations"
    : e >= d * 3
      ? "mostly-expressions"
      : "mixed";
};

// Resolve a relative import specifier to a measured file.
const resolveSpec = (fromRel, spec, fileSet) => {
  if (!spec.startsWith(".")) {
    return null;
  }
  const base = normalize(join(dirname(fromRel), spec))
    .split("\\")
    .join("/");
  const stem = base.replace(/\.(?:[cm]?[jt]sx?)$/, "");
  for (const cand of [
    base,
    ...["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"].map(
      (e) => `${stem}.${e}`
    ),
    ...["ts", "tsx", "js", "jsx"].map((e) => `${base}/index.${e}`),
  ]) {
    if (fileSet.has(cand)) {
      return cand;
    }
  }
  return null;
};

const measureRepo = (name) => {
  const repo = lib.getRepo(name);
  const files = lib.filesOf(name);
  const fnRows = [];
  const fileRows = [];
  const ubdRows = [];
  const eslintRows = [];
  const errors = [];
  const importsNew = [];
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
    const up = r.edges.filter((e) => e.dir === "up").length;
    const down = r.edges.filter((e) => e.dir === "down").length;
    const upDecl = r.edges.filter(
      (e) =>
        e.dir === "up" &&
        r.moduleFns.find((m) => m.name === e.to)?.kind === "declaration"
    ).length;
    fileRows.push({
      edges: r.edges.length,
      evalCalls: r.evalCalls,
      file: rel,
      form: fileForm(r.moduleFns),
      lines: r.lines,
      moduleDeclarations: r.moduleFns.filter((m) => m.kind === "declaration")
        .length,
      moduleExpressions: r.moduleFns.filter((m) => m.kind === "expression")
        .length,
      order: classifyOrder(up, down),
      orderCalls: classifyOrder(
        r.edges.filter((e) => e.dir === "up" && e.call).length,
        r.edges.filter((e) => e.dir === "down" && e.call).length
      ),
      sccs: r.sccs,
      selfRecursive: r.selfRecursive,
      signatures: r.signatures.length,
      test,
      topRefs: {
        downModuleEval: r.topRefs.filter(
          (t) => t.dir === "down" && t.moduleEval
        ).length,
        total: r.topRefs.length,
        upModuleEval: r.topRefs.filter((t) => t.dir === "up" && t.moduleEval)
          .length,
      },
      up,
      upToDeclarations: upDecl,
      down,
    });
    for (const f of r.fns) {
      fnRows.push({ file: rel, test, ...f });
    }
    for (const u of r.ubd) {
      ubdRows.push({ file: rel, test, ...u });
    }
    for (const m of r.eslint) {
      eslintRows.push({ file: rel, mode: "raw", test, ...m });
    }
    for (const m of reported ?? r.eslint) {
      eslintRows.push({ file: rel, mode: "reported", test, ...m });
    }
    for (const im of r.imports) {
      importsNew.push({ file: rel, ...im });
    }
  }
  // cross-file: exported declarations constructed (`new`, `instanceof`, `.prototype`) by importers
  const fileSet = new Set(files.map((f) => f.rel));
  const byTarget = new Map();
  const byName = new Map();
  for (const im of importsNew) {
    const target = resolveSpec(im.file, im.source, fileSet);
    const key = `${target}|${im.imported}`;
    if (target) {
      byTarget.set(key, [...(byTarget.get(key) ?? []), im]);
    }
    byName.set(im.imported, [...(byName.get(im.imported) ?? []), im]);
  }
  for (const f of fnRows) {
    if (f.type !== "FunctionDeclaration" || !f.exported || !f.name) {
      continue;
    }
    const exportName =
      f.form === "export-default-declaration" ? "default" : f.name;
    const exact = byTarget.get(`${f.file}|${exportName}`) ?? [];
    const loose = (byName.get(exportName) ?? []).filter(
      (im) => !resolveSpec(im.file, im.source, fileSet)
    );
    const uses = [...exact, ...(exportName === "default" ? [] : loose)];
    f.crossFileNew = uses.reduce((s, u) => s + u.new, 0);
    f.crossFileInstanceof = uses.reduce((s, u) => s + u.instanceof, 0);
    f.crossFilePrototype = uses.reduce((s, u) => s + u.prototype, 0);
    f.crossFileByNameOnly = exact.length === 0 && uses.length > 0;
  }
  return { errors, eslintRows, fileRows, fnRows, importsNew, ubdRows };
};

// ── summaries ──────────────────────────────────────────────────────────
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
const isDecl = (f) => f.type === "FunctionDeclaration";
const reportedDecl = (f) =>
  isDecl(f) && f.form !== "export-default-declaration" && !f.overloadedEslint;
const needsFunctionExpression = (f) =>
  f.usesThis ||
  f.usesArguments ||
  f.usesNewTarget ||
  f.thisParam ||
  (f.calledWithNew ?? 0) > 0 ||
  (f.prototypeUse ?? 0) > 0 ||
  (f.instanceofUse ?? 0) > 0 ||
  (f.crossFileNew ?? 0) > 0 ||
  (f.crossFileInstanceof ?? 0) > 0 ||
  (f.crossFilePrototype ?? 0) > 0;
const conversionOf = (f) => {
  if (!isDecl(f)) {
    return null;
  }
  if (f.form === "export-default-declaration") {
    return "not-reported:export-default";
  }
  if (f.overloadedEslint) {
    return "not-reported:overloads";
  }
  if (f.mergedNamespace) {
    return "blocked:namespace-merge";
  }
  if (f.generator) {
    return "function-expression:generator";
  }
  if (needsFunctionExpression(f)) {
    return "function-expression:this-arguments-new";
  }
  return "arrow";
};
const summarise = (rows, fileRows, ubdRows, eslintRows, lines) => {
  const fns = rows;
  const decls = fns.filter(isDecl);
  const reported = decls.filter(reportedDecl);
  const varBound = fns.filter((f) => lib.isVarBound(f.form));
  const constFns = varBound.filter((f) => f.declKind === "const");
  const arrows = fns.filter((f) => f.type === "ArrowFunctionExpression");
  const varArrows = varBound.filter(
    (f) => f.type === "ArrowFunctionExpression"
  );
  const blockArrows = varArrows.filter((f) => !f.concise);
  const moduleDecls = decls.filter((f) => f.scope === "module");
  const fileCount = fileRows.length;
  const orderFiles = fileRows.filter((f) => f.edges > 0);
  const ubdValue = ubdRows;
  const per10k = (n) => lib.per10k(n, lines);
  return {
    files: fileCount,
    lines,
    functions: {
      total: fns.length,
      per10k: per10k(fns.length),
      byGroup: countBy(fns, (f) => f.group),
      byForm: countBy(fns, (f) => f.form),
      signatures: fileRows.reduce((s, f) => s + f.signatures, 0),
    },
    named: {
      // what func-style can be about: declarations and functions bound to variables
      declarations: decls.length,
      varBound: varBound.length,
      constFunctions: constFns.length,
      declarationShare: lib.pct(decls.length, decls.length + varBound.length),
      declarationsPer10k: per10k(decls.length),
      varBoundPer10k: per10k(varBound.length),
    },
    declarations: {
      total: decls.length,
      reportedByFuncStyle: reported.length,
      reportedPer10k: per10k(reported.length),
      byForm: countBy(decls, (f) => f.form),
      byScope: countBy(decls, (f) => f.scope),
      components: decls.filter((f) => f.component).length,
      async: decls.filter((f) => f.async).length,
      generator: decls.filter((f) => f.generator).length,
      usesThis: decls.filter((f) => f.usesThis).length,
      thisParam: decls.filter((f) => f.thisParam).length,
      usesArguments: decls.filter((f) => f.usesArguments).length,
      usesNewTarget: decls.filter((f) => f.usesNewTarget).length,
      usesSuper: decls.filter((f) => f.usesSuper).length,
      overloaded: decls.filter((f) => f.overloaded).length,
      overloadedEslint: decls.filter((f) => f.overloadedEslint).length,
      assertion: decls.filter((f) => f.predicate === "asserts").length,
      typePredicate: decls.filter((f) => f.predicate === "is").length,
      calledWithNewInFile: decls.filter((f) => (f.calledWithNew ?? 0) > 0)
        .length,
      calledWithNewCrossFile: decls.filter((f) => (f.crossFileNew ?? 0) > 0)
        .length,
      prototypeUse: decls.filter(
        (f) => (f.prototypeUse ?? 0) + (f.crossFilePrototype ?? 0) > 0
      ).length,
      instanceofUse: decls.filter(
        (f) => (f.instanceofUse ?? 0) + (f.crossFileInstanceof ?? 0) > 0
      ).length,
      callApplyBind: decls.filter((f) => (f.callApplyBind ?? 0) > 0).length,
      reassigned: decls.filter((f) => (f.reassigned ?? 0) > 0).length,
      mergedNamespace: decls.filter((f) => f.mergedNamespace).length,
      generic: decls.filter((f) => f.generic > 0).length,
      genericNeedsCommaInTsx: decls.filter((f) => f.genericNeedsComma).length,
      usedAboveDefinition: decls.filter((f) => (f.refsBefore ?? 0) > 0).length,
      moduleUsedAboveDefinition: moduleDecls.filter(
        (f) => (f.refsBefore ?? 0) > 0
      ).length,
      singleReturn: decls.filter((f) => f.singleReturn).length,
      emptyBody: decls.filter((f) => f.emptyBody).length,
      fullyTyped: decls.filter(
        (f) => f.returnTyped && f.paramsTyped === f.params
      ).length,
      paramsAllTyped: decls.filter(
        (f) => f.params > 0 && f.paramsTyped === f.params
      ).length,
      returnTyped: decls.filter((f) => f.returnTyped).length,
      conversion: countBy(decls, conversionOf),
    },
    arrows: {
      total: arrows.length,
      concise: arrows.filter((f) => f.concise).length,
      conciseShare: lib.pct(
        arrows.filter((f) => f.concise).length,
        arrows.length
      ),
      varBound: varArrows.length,
      varBoundConcise: varArrows.filter((f) => f.concise).length,
      varBoundBlock: blockArrows.length,
      varBoundBlockSingleReturn: blockArrows.filter((f) => f.singleReturn)
        .length,
      varBoundBlockSingleReturnObject: blockArrows.filter(
        (f) => f.singleReturnObject
      ).length,
      callbacks: arrows.filter((f) => f.form === "callback").length,
      callbacksConcise: arrows.filter((f) => f.form === "callback" && f.concise)
        .length,
    },
    constFunctions: {
      total: constFns.length,
      arrows: constFns.filter((f) => f.type === "ArrowFunctionExpression")
        .length,
      functionExpressions: constFns.filter(
        (f) => f.type === "FunctionExpression"
      ).length,
      varAnnotated: constFns.filter((f) => f.varAnnotated).length,
      varAnnotatedNamed: constFns.filter((f) => f.varAnnotationKind === "named")
        .length,
      varAnnotatedFunctionType: constFns.filter(
        (f) => f.varAnnotationKind === "function-type"
      ).length,
      satisfies: constFns.filter((f) => f.satisfies).length,
      asserted: constFns.filter((f) => f.asserted).length,
      typedThroughVariable: constFns.filter(
        (f) => f.varAnnotated || f.satisfies || f.asserted
      ).length,
      inlineFullyTyped: constFns.filter(
        (f) => f.returnTyped && f.paramsTyped === f.params
      ).length,
      inlineParamsTyped: constFns.filter(
        (f) => f.params > 0 && f.paramsTyped === f.params
      ).length,
      inlineReturnTyped: constFns.filter((f) => f.returnTyped).length,
      topAnnotationNames: Object.fromEntries(
        Object.entries(countBy(constFns, (f) => f.varAnnotationName)).slice(
          0,
          15
        )
      ),
      components: constFns.filter((f) => f.component).length,
      byScope: countBy(constFns, (f) => f.scope),
    },
    components: {
      declarations: fns.filter((f) => f.component && isDecl(f)).length,
      constArrows: fns.filter((f) => f.component && f.form === "const-arrow")
        .length,
      constFunctions: fns.filter(
        (f) => f.component && /^const-function/.test(f.form)
      ).length,
      wrapped: fns.filter((f) => f.component && f.componentWrapper).length,
      other: fns.filter(
        (f) =>
          f.component &&
          !isDecl(f) &&
          !/^const-/.test(f.form) &&
          !f.componentWrapper
      ).length,
    },
    order: {
      filesWithEdges: orderFiles.length,
      byOrder: countBy(orderFiles, (f) => f.order),
      byOrderCallsOnly: countBy(orderFiles, (f) => f.orderCalls),
      edges: orderFiles.reduce((s, f) => s + f.edges, 0),
      up: orderFiles.reduce((s, f) => s + f.up, 0),
      down: orderFiles.reduce((s, f) => s + f.down, 0),
      downShare: lib.pct(
        orderFiles.reduce((s, f) => s + f.down, 0),
        orderFiles.reduce((s, f) => s + f.edges, 0)
      ),
      byFileForm: Object.fromEntries(
        [
          "declarations",
          "mostly-declarations",
          "mixed",
          "mostly-expressions",
          "expressions",
        ].map((form) => {
          const fs = orderFiles.filter((f) => f.form === form);
          const up = fs.reduce((s, f) => s + f.up, 0);
          const down = fs.reduce((s, f) => s + f.down, 0);
          return [
            form,
            {
              byOrder: countBy(fs, (f) => f.order),
              down,
              downShare: lib.pct(down, up + down),
              files: fs.length,
              up,
            },
          ];
        })
      ),
      filesByForm: countBy(fileRows, (f) => f.form),
      sccFiles: fileRows.filter((f) => f.sccs.length > 0).length,
      sccs: fileRows.reduce((s, f) => s + f.sccs.length, 0),
      sccsBySize: countBy(
        fileRows.flatMap((f) => f.sccs),
        (c) => c.names.length
      ),
      sccsByKinds: countBy(
        fileRows.flatMap((f) => f.sccs),
        (c) => c.kinds.join("+")
      ),
      selfRecursive: fileRows.reduce((s, f) => s + f.selfRecursive, 0),
      topLevelRefsDown: fileRows.reduce(
        (s, f) => s + f.topRefs.downModuleEval,
        0
      ),
      topLevelRefsUp: fileRows.reduce((s, f) => s + f.topRefs.upModuleEval, 0),
    },
    useBeforeDefine: {
      candidates: ubdValue.length,
      byClass: countBy(ubdValue, (u) => u.cls),
      byDefType: countBy(ubdValue, (u) => u.defType),
    },
    eslint: Object.fromEntries(
      ["raw", "reported"].map((mode) => [
        mode,
        countBy(
          eslintRows.filter((m) => m.mode === mode),
          (m) => m.rule
        ),
      ])
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
    note: "See the header of func-style-census.cjs and func-style-lib.cjs. Forms: declaration, export-declaration, export-default-declaration; const/let/var-arrow and -function-named/-anonymous (bound to a variable, through `as`/`satisfies`/`!`); method; class-field; object-property; callback; iife; other. Scope: module, namespace, module-block, nested, nested-block (for declarations and variable-bound functions). File order: each reference from one module-level function to another is `up` (the callee is defined above the caller) or `down` (below); a file with at least 2 such references is top-down when 75%+ are down, bottom-up when 75%+ are up, otherwise mixed.",
    orderRule: { minEdges: ORDER_MIN_EDGES, share: ORDER_SHARE },
    repos: { ...previous.repos },
    tools: lib.toolVersions(),
  };
  for (const name of names) {
    const t0 = Date.now();
    const { errors, eslintRows, fileRows, fnRows, importsNew, ubdRows } =
      measureRepo(name);
    lib.writeJsonl(join(CENSUS, `${name}.functions.jsonl`), fnRows);
    lib.writeJsonl(join(CENSUS, `${name}.files.jsonl`), fileRows);
    lib.writeJsonl(join(CENSUS, `${name}.ubd.jsonl`), ubdRows);
    lib.writeJsonl(join(CENSUS, `${name}.eslint.jsonl`), eslintRows);
    lib.writeJsonl(join(CENSUS, `${name}.imports.jsonl`), importsNew);
    const entry = { errors, set: lib.setOf(name), sha: lib.shaOf(name) };
    for (const test of [false, true]) {
      const fr = fileRows.filter((f) => f.test === test);
      const lines = fr.reduce((s, f) => s + f.lines, 0);
      entry[test ? "tests" : "source"] = summarise(
        fnRows.filter((f) => f.test === test),
        fr,
        ubdRows.filter((u) => u.test === test),
        eslintRows.filter((m) => m.test === test),
        lines
      );
    }
    entry.seconds = Math.round((Date.now() - t0) / 1000);
    out.repos[name] = entry;
    const s = entry.source;
    console.log(
      `${name}: ${s.files} files, ${s.lines} lines, ${s.functions.total} fns; decl ${s.declarations.total} (reported ${s.declarations.reportedByFuncStyle}), varBound ${s.named.varBound}; order ${JSON.stringify(s.order.byOrder)} down ${s.order.downShare}%; sccs ${s.order.sccs}; ubd ${s.useBeforeDefine.candidates} ${JSON.stringify(s.useBeforeDefine.byClass)}; errors ${errors.length} (${entry.seconds}s)`
    );
  }
  // pooled, by set (Ultracite's CLI is never pooled)
  out.pooled = {};
  for (const [set, members] of Object.entries({
    corpus: lib.CORE,
    react: lib.REACT,
    external: [...lib.CORE, ...lib.REACT],
  })) {
    out.pooled[set] = {};
    for (const test of [false, true]) {
      const fnRows = [];
      const fileRows = [];
      const ubdRows = [];
      const eslintRows = [];
      for (const name of members) {
        if (!out.repos[name]) {
          continue;
        }
        const prefix = (r) => ({ ...r, repo: name });
        fnRows.push(
          ...lib
            .readJsonl(join(CENSUS, `${name}.functions.jsonl`))
            .filter((f) => f.test === test)
            .map(prefix)
        );
        fileRows.push(
          ...lib
            .readJsonl(join(CENSUS, `${name}.files.jsonl`))
            .filter((f) => f.test === test)
        );
        ubdRows.push(
          ...lib
            .readJsonl(join(CENSUS, `${name}.ubd.jsonl`))
            .filter((f) => f.test === test)
        );
        eslintRows.push(
          ...lib
            .readJsonl(join(CENSUS, `${name}.eslint.jsonl`))
            .filter((f) => f.test === test)
        );
      }
      const lines = fileRows.reduce((s, f) => s + f.lines, 0);
      out.pooled[set][test ? "tests" : "source"] = summarise(
        fnRows,
        fileRows,
        ubdRows,
        eslintRows,
        lines
      );
    }
  }
  lib.writeJson(join(lib.RESULTS_DIR, "census.json"), out);
  const p = out.pooled.external.source;
  console.log(
    `external source: ${p.files} files, ${p.lines} lines, ${p.functions.total} functions; declarations ${p.declarations.total}, reported ${p.declarations.reportedByFuncStyle}`
  );
};

module.exports = { classifyOrder, conversionOf, needsFunctionExpression };

if (require.main === module) {
  main();
}
