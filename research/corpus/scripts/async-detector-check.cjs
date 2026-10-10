// Validates the syntactic async detector (async-census.cjs) against the type-aware rules
// (async-typed-census.cjs), site by site:
//
//   floating   detector floating-call + floating-chain + bare `.map(async ...)` statements
//              vs typescript-eslint `no-floating-promises` (both report the statement's start)
//   callbacks  detector async-callback sites vs `no-misused-promises` voidReturnArgument (both
//              report the async function's start), broken down by callee
//
// For every typed hit the detector missed, it parses the statement and records why syntax
// couldn't see it (an imported function, a method on another object, a callback parameter...).
// Detector-only hits are listed in full, with code, for review by hand; the verdicts live in
// results/<topic>/detector-review.json and are folded into the precision figures.
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-detector-check.cjs [--topic floating-promises]
// Writes results/<topic>/detector-check.json.
"use strict";

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const { getRepo } = require("./collect-files.cjs");
const config = require("./repos.json");
const { dirs } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const args = process.argv.slice(2);
const TOPIC = args.includes("--topic")
  ? args[args.indexOf("--topic") + 1]
  : (process.env.RESEARCH_TOPIC ?? "floating-promises");
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", "floating-promises");
const DOGFOOD = new Set(["ultracite"]);

const { parse } = require(
  require.resolve("@typescript-eslint/typescript-estree", {
    paths: [dirs.tsParser],
  })
);
const { visitorKeys } = require(
  require.resolve("@typescript-eslint/visitor-keys", { paths: [dirs.tsParser] })
);

const key = (s) => `${s.file}:${s.line}`;
const pct = (a, b) => (b === 0 ? null : Math.round((a / b) * 1000) / 10);

// ── why the detector missed a typed hit ───────────────────────────────
const parsed = new Map();
const astOf = (root, file) => {
  if (!parsed.has(file)) {
    const text = readFileSync(join(root, file), "utf8");
    const ast = parse(text, {
      errorOnUnknownASTType: false,
      jsx: /\.[jt]sx$/.test(file),
      loc: true,
      range: true,
    });
    const imported = new Set();
    for (const s of ast.body) {
      if (s.type === "ImportDeclaration") {
        for (const spec of s.specifiers) {
          imported.add(spec.local.name);
        }
      }
    }
    parsed.set(file, { ast, imported, text });
  }
  return parsed.get(file);
};

const statementAt = (ast, line, column) => {
  let found = null;
  const visit = (node) => {
    if (found) {
      return;
    }
    if (
      node.type === "ExpressionStatement" &&
      node.loc.start.line === line &&
      node.loc.start.column + 1 === column
    ) {
      found = node;
      return;
    }
    for (const k of visitorKeys[node.type] ?? []) {
      const child = node[k];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c.type === "string") {
            visit(c);
          }
        }
      } else if (child && typeof child.type === "string") {
        visit(child);
      }
    }
  };
  visit(ast);
  return found;
};

const unwrap = (n) => {
  let x = n;
  while (
    x &&
    [
      "ChainExpression",
      "TSAsExpression",
      "TSNonNullExpression",
      "AwaitExpression",
    ].includes(x.type)
  ) {
    x = x.expression ?? x.argument;
  }
  return x;
};

// The base call of a chain: `a.b().then(x).finally(y)` -> `a.b()`.
const baseCall = (call) => {
  let c = call;
  for (;;) {
    const callee = unwrap(c.callee);
    if (
      callee?.type === "MemberExpression" &&
      ["then", "catch", "finally"].includes(callee.property?.name) &&
      unwrap(callee.object)?.type === "CallExpression"
    ) {
      c = unwrap(callee.object);
    } else {
      return c;
    }
  }
};

const missReason = (root, hit) => {
  const { ast, imported } = astOf(root, hit.file);
  const stmt = statementAt(ast, hit.line, hit.column);
  if (!stmt) {
    return "not a statement at the reported position";
  }
  const e = unwrap(stmt.expression);
  if (e.type !== "CallExpression") {
    if (e.type === "Identifier" || e.type === "MemberExpression") {
      return "a promise-valued variable or property";
    }
    if (e.type === "AssignmentExpression") {
      return "an assignment expression";
    }
    if (e.type === "ConditionalExpression" || e.type === "LogicalExpression") {
      return "a conditional or logical expression";
    }
    return `other expression (${e.type})`;
  }
  const callee = unwrap(e.callee);
  const prop =
    callee?.type === "MemberExpression" ? callee.property?.name : null;
  if (prop === "then" || prop === "finally" || prop === "catch") {
    return "a promise chain the detector treats as handled";
  }
  if (prop === "map") {
    return "an array of promises from .map";
  }
  const base = baseCall(e);
  const c = unwrap(base.callee);
  if (c.type === "Identifier") {
    if (imported.has(c.name)) {
      return "a call to an imported function";
    }
    return "a call to a parameter, variable or other local";
  }
  if (c.type === "MemberExpression") {
    const obj = unwrap(c.object);
    if (obj.type === "ThisExpression") {
      return "a method on this, defined elsewhere (inherited or not async)";
    }
    if (obj.type === "Identifier" && imported.has(obj.name)) {
      return "a method on an imported object";
    }
    return "a method on another object";
  }
  if (c.type === "ArrowFunctionExpression" || c.type === "FunctionExpression") {
    return "an IIFE";
  }
  return `other callee (${c.type})`;
};

const main = () => {
  const reviewPath = join(RESULTS_DIR, "detector-review.json");
  const review = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, "utf8"))
    : { verdicts: {} };
  const typedCensus = JSON.parse(
    readFileSync(join(RESULTS_DIR, "typed-census.json"), "utf8")
  );
  const out = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Sites are matched by file and start line. 'confirmed' adds detector-only hits that a hand review found to be real floating promises the type-aware rule missed (usually because types didn't resolve), from detector-review.json.",
    repos: {},
  };
  const pooled = {
    biome: {},
    callbacks: { both: 0, detectorOnly: 0, typedOnly: 0 },
    floating: {
      both: 0,
      detectorOnly: 0,
      reviewedTrue: 0,
      reviewedFalse: 0,
      typedOnly: 0,
    },
    byCallee: {},
    missReasons: {},
  };
  for (const { name } of config.repos) {
    if (DOGFOOD.has(name)) {
      continue;
    }
    const sitesPath = join(OUT_DIR, `${name}.sites.json`);
    const typedPath = join(OUT_DIR, "typed", `${name}.json`);
    if (!existsSync(sitesPath) || !existsSync(typedPath)) {
      continue;
    }
    const root = getRepo(name).root;
    parsed.clear();
    const { sites } = JSON.parse(readFileSync(sitesPath, "utf8"));
    const typed = JSON.parse(readFileSync(typedPath, "utf8")).eslint ?? [];

    // Floating promises.
    const detector = sites.filter(
      (s) =>
        s.kind === "floating-call" ||
        s.kind === "floating-chain" ||
        (s.kind === "map-async" && s.fate === "bare statement")
    );
    const typedFloating = typed.filter(
      (h) => h.rule === "no-floating-promises"
    );
    const typedKeys = new Set(typedFloating.map(key));
    const detectorKeys = new Set(detector.map(key));
    const both = detector.filter((s) => typedKeys.has(key(s)));
    const detectorOnly = detector.filter((s) => !typedKeys.has(key(s)));
    const typedOnly = typedFloating.filter((h) => !detectorKeys.has(key(h)));
    const missReasons = {};
    for (const h of typedOnly) {
      const reason = missReason(root, h);
      missReasons[reason] = (missReasons[reason] ?? 0) + 1;
      pooled.missReasons[reason] = (pooled.missReasons[reason] ?? 0) + 1;
    }
    const lines = (file) => readFileSync(join(root, file), "utf8").split("\n");
    const detectorOnlyRows = detectorOnly.map((s) => {
      const id = `${name}:${s.file}:${s.line}`;
      return {
        code: lines(s.file)[s.line - 1].trim().slice(0, 140),
        file: s.file,
        id,
        kind: s.kind,
        line: s.line,
        verdict: review.verdicts[id] ?? null,
      };
    });
    const reviewedTrue = detectorOnlyRows.filter(
      (r) => r.verdict?.real === true
    ).length;
    const reviewedFalse = detectorOnlyRows.filter(
      (r) => r.verdict?.real === false
    ).length;

    // Async callbacks vs no-misused-promises (voidReturnArgument).
    const callbacks = sites.filter((s) => s.kind === "async-callback");
    const misused = typed.filter(
      (h) =>
        h.rule === "no-misused-promises" && h.messageId === "voidReturnArgument"
    );
    const misusedKeys = new Set(misused.map(key));
    const callbackKeys = new Set(callbacks.map(key));
    const byCallee = {};
    for (const s of callbacks) {
      const row = (byCallee[s.callee] ??= { flagged: 0, total: 0 });
      row.total++;
      const flagged = misusedKeys.has(key(s));
      row.flagged += flagged ? 1 : 0;
      const p = (pooled.byCallee[s.callee] ??= { flagged: 0, total: 0 });
      p.total++;
      p.flagged += flagged ? 1 : 0;
    }
    const cbBoth = callbacks.filter((s) => misusedKeys.has(key(s))).length;
    const cbTypedOnly = misused.filter((h) => !callbackKeys.has(key(h)));

    // Biome's inference-based rules (async-linters.cjs --corpus) vs typescript-eslint.
    const biomePath = join(OUT_DIR, "linters", `${name}.biome-hits.json`);
    let biome = null;
    if (existsSync(biomePath)) {
      const hits = JSON.parse(readFileSync(biomePath, "utf8"));
      biome = {};
      for (const [biomeRule, tsRule] of [
        ["noFloatingPromises", "no-floating-promises"],
        ["noMisusedPromises", "no-misused-promises"],
      ]) {
        const b = new Set(hits.filter((h) => h.rule === biomeRule).map(key));
        const t = new Set(typed.filter((h) => h.rule === tsRule).map(key));
        const shared = [...b].filter((k) => t.has(k)).length;
        biome[biomeRule] = {
          biome: b.size,
          both: shared,
          biomeOnlySamples: [...b]
            .filter((k) => !t.has(k))
            .slice(0, 4)
            .map((k) => {
              const [file, line] = [
                k.slice(0, k.lastIndexOf(":")),
                Number(k.slice(k.lastIndexOf(":") + 1)),
              ];
              return `${k} | ${lines(file)[line - 1].trim().slice(0, 100)}`;
            }),
          typescriptEslint: t.size,
        };
        const p = (pooled.biome[biomeRule] ??= {
          biome: 0,
          both: 0,
          typescriptEslint: 0,
        });
        p.biome += b.size;
        p.both += shared;
        p.typescriptEslint += t.size;
      }
    }

    const probe = typedCensus.repos[name]?.probe ?? {};
    out.repos[name] = {
      biome,
      callbacks: {
        both: cbBoth,
        detector: callbacks.length,
        detectorOnly: callbacks.length - cbBoth,
        typed: misused.length,
        typedOnly: cbTypedOnly.length,
        typedOnlySamples: cbTypedOnly.slice(0, 5).map((h) => ({
          code: lines(h.file)[h.line - 1].trim().slice(0, 140),
          file: h.file,
          line: h.line,
        })),
      },
      floating: {
        both: both.length,
        detector: detector.length,
        detectorOnly: detectorOnlyRows,
        missReasons,
        precisionAgainstTyped: pct(both.length, detector.length),
        precisionWithReview: pct(
          both.length + reviewedTrue,
          both.length + reviewedTrue + reviewedFalse
        ),
        recall: pct(both.length, typedFloating.length),
        reviewedFalse,
        reviewedTrue,
        typed: typedFloating.length,
        typedOnly: typedOnly.length,
      },
      importResolution: probe.importResolution ?? null,
      bareCallsUntyped: probe.bareCallsUntyped ?? null,
    };
    pooled.floating.both += both.length;
    pooled.floating.detectorOnly += detectorOnly.length;
    pooled.floating.typedOnly += typedOnly.length;
    pooled.floating.reviewedTrue += reviewedTrue;
    pooled.floating.reviewedFalse += reviewedFalse;
    pooled.callbacks.both += cbBoth;
    pooled.callbacks.detectorOnly += callbacks.length - cbBoth;
    pooled.callbacks.typedOnly += cbTypedOnly.length;
    console.log(
      `${name}: floating detector ${detector.length}, typed ${typedFloating.length}, both ${both.length}, detector-only ${detectorOnly.length} (reviewed real ${reviewedTrue}, not ${reviewedFalse}); callbacks ${callbacks.length} vs misused ${misused.length}, both ${cbBoth}`
    );
  }
  const f = pooled.floating;
  pooled.floating.precisionAgainstTyped = pct(f.both, f.both + f.detectorOnly);
  pooled.floating.precisionWithReview = pct(
    f.both + f.reviewedTrue,
    f.both + f.reviewedTrue + f.reviewedFalse
  );
  pooled.floating.recall = pct(f.both, f.both + f.typedOnly);
  pooled.byCallee = Object.fromEntries(
    Object.entries(pooled.byCallee).sort((a, b) => b[1].total - a[1].total)
  );
  pooled.missReasons = Object.fromEntries(
    Object.entries(pooled.missReasons).sort((a, b) => b[1] - a[1])
  );
  out.pooled = pooled;
  writeFileSync(
    join(RESULTS_DIR, "detector-check.json"),
    `${JSON.stringify(out, null, 2)}\n`
  );
  console.log(JSON.stringify(pooled, null, 1));
};

main();
