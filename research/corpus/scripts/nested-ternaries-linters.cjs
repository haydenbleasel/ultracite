// What the rules report: each rule alone in Oxlint and Biome, and the ESLint reports from the
// census pass, on two mirrors of every repo's files: one with every disable directive neutralised
// (raw: `eslint-`/`oxlint-disable`/`-enable` and `biome-ignore`, rewritten to the same length) and
// one as written (reported). Only files are copied, so no config from a clone is read.
//
//   Oxlint   no-nested-ternary, unicorn/no-nested-ternary, unicorn/prefer-ternary,
//            unicorn/prefer-logical-operator-over-ternary, no-unneeded-ternary, no-else-return,
//            no-negated-condition, unicorn/no-negated-condition (Ultracite's core sets each to
//            "error" with no options); sonarjs/no-nested-conditional through Oxlint's JS plugins
//            (the js-plugins preset's plugin, loaded by path)
//   Biome    noNestedTernary, noUselessTernary, noNegationElse, noUselessElse (each "error", as in
//            Biome core)
//   ESLint   the census pass (nested-ternaries-lib.cjs ESLINT_RULES, Ultracite's options)
//
// Every nested-ternary diagnostic is joined to the conditional it starts at, and through it to its
// ternary tree (or to the indirect nesting it reports), so every disagreement between
// implementations has a reason from the inventory: a TypeScript wrapper between two conditionals,
// a conditional in a test, a conditional nested through a call or template (sonarjs), the
// reporting unit (ESLint and Oxlint report the outer conditional, Biome and sonarjs the inner
// one), and unicorn's parenthesised exception.
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/nested-ternaries-linters.cjs [--repos a,b]
// Writes out/nested-ternaries/linters/<repo>.jsonl and results/nested-ternaries/linters.json.
"use strict";

const { readFileSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./nested-ternaries-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const OUT = join(lib.OUT_DIR, "linters");
const MIRROR = join(lib.TMP, "mirror");
const CONFIGS = join(lib.TMP, "configs");

const NESTED = new Set([
  "no-nested-ternary",
  "unicorn/no-nested-ternary",
  "sonarjs/no-nested-conditional",
  "style/noNestedTernary",
]);
const OXLINT_RULES = {
  "no-else-return": "error",
  "no-negated-condition": "error",
  "no-nested-ternary": "error",
  "no-unneeded-ternary": "error",
  "unicorn/no-negated-condition": "error",
  "unicorn/no-nested-ternary": "error",
  "unicorn/prefer-logical-operator-over-ternary": "error",
  "unicorn/prefer-ternary": "error",
};
const sonarMain = require.resolve("eslint-plugin-sonarjs", {
  paths: [lib.ULTRACITE],
});
const BIOME_RULES = {
  complexity: { noUselessTernary: "error" },
  style: {
    noNegationElse: "error",
    noNestedTernary: "error",
    noUselessElse: "error",
  },
};

const VIEW_NAMES = [
  "biome/noNestedTernary",
  "eslint/no-nested-ternary",
  "eslint/sonarjs",
  "eslint/unicorn",
  "oxlint/no-nested-ternary",
  "oxlint/sonarjs",
  "oxlint/unicorn",
];
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

const lineStarts = (text) => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
};

// ── prefer-ternary: what the reported if statement looks like ──────────
const PREFER = new Set(["unicorn/prefer-ternary"]);
const hasCondOutsideFunctions = (node) => {
  let found = false;
  const visit = (n) => {
    if (found || !n || typeof n.type !== "string") {
      return;
    }
    if (n.type === "ConditionalExpression") {
      found = true;
      return;
    }
    if (lib.FUNCTION_TYPES.has(n.type)) {
      return;
    }
    for (const { node: c } of lib.sk.children(n)) {
      visit(c);
    }
  };
  visit(node);
  return found;
};
const single = (b) => {
  if (!b) {
    return null;
  }
  const body =
    b.type === "BlockStatement"
      ? b.body.filter((x) => x.type !== "EmptyStatement")
      : [b];
  return body.length === 1 ? body[0] : null;
};
const stmtKind = (x) => {
  if (!x) {
    return "block";
  }
  if (x.type === "ReturnStatement") {
    return x.argument ? "return" : "return-void";
  }
  if (x.type === "ThrowStatement") {
    return "throw";
  }
  if (x.type === "ExpressionStatement") {
    const e = x.expression;
    if (e.type === "AssignmentExpression") {
      return e.operator === "=" ? "assign" : "assign-op";
    }
    if (e.type === "AwaitExpression") {
      return "await";
    }
    if (e.type === "CallExpression") {
      return "call";
    }
    return "expression";
  }
  return x.type;
};
const ifShape = (n) => {
  const p = n.parent;
  const list = p && Array.isArray(p.body) ? p.body : null;
  const i = list ? list.indexOf(n) : -1;
  const next = i >= 0 ? list[i + 1] : null;
  const prev = i > 0 ? list[i - 1] : null;
  const c = single(n.consequent);
  const a = single(n.alternate);
  let form;
  if (!n.alternate) {
    if (next?.type === "ReturnStatement" && stmtKind(c) === "return") {
      form = "flat-return";
    } else if (
      prev?.type === "VariableDeclaration" &&
      prev.kind === "let" &&
      stmtKind(c) === "assign"
    ) {
      form = "let-plus-if";
    } else {
      form = `if-only:${stmtKind(c)}`;
    }
  } else if (n.alternate.type === "IfStatement") {
    form = "else-if";
  } else {
    const kc = stmtKind(c);
    const ka = stmtKind(a);
    form = kc === ka ? `if-else:${kc}` : `if-else:${kc}/${ka}`;
  }
  const branches = [n.consequent, n.alternate].filter(Boolean);
  if (form === "flat-return") {
    branches.push(next);
  }
  // the value a branch returns or assigns is itself a conditional: converting nests it directly
  const valueOf = (b) => {
    const x = b && (b.type === "ReturnStatement" ? b : single(b));
    if (!x) {
      return null;
    }
    if (x.type === "ReturnStatement") {
      return x.argument;
    }
    if (
      x.type === "ExpressionStatement" &&
      x.expression.type === "AssignmentExpression"
    ) {
      return x.expression.right;
    }
    return null;
  };
  const values = [
    n.consequent,
    n.alternate,
    form === "flat-return" ? next : null,
  ]
    .filter(Boolean)
    .map(valueOf);
  return {
    branchValueIsTernary: values.some(
      (v) => v && lib.peel(v).type === "ConditionalExpression"
    ),
    branchHasTernary: branches.some(hasCondOutsideFunctions),
    form,
    multiline: n.loc.end.line > n.loc.start.line,
    testHasTernary: hasCondOutsideFunctions(n.test),
  };
};
const preferTernaryJoin = (name) => {
  const root = lib.getRepo(name).root;
  const rows = lib
    .readJsonl(join(OUT, `${name}.jsonl`))
    .filter((d) => PREFER.has(d.rule) && (d.mode ?? "raw") === "raw");
  const byFile = new Map();
  for (const d of rows) {
    if (!byFile.has(d.file)) {
      byFile.set(d.file, []);
    }
    byFile.get(d.file).push(d);
  }
  const out = [];
  for (const [rel, ds] of byFile) {
    const text = readFileSync(join(root, rel), "utf8");
    const { ast } = lib.sk.safeParse(text, rel);
    if (!ast) {
      continue;
    }
    const ifs = new Map();
    lib.sk.walk(ast, (n) => {
      if (n.type === "IfStatement") {
        ifs.set(n.range[0], n);
      }
    });
    const starts = lineStarts(text);
    const toU16 = lib.utf16Offset(text);
    const at = new Map();
    for (const d of ds) {
      const off =
        d.linter === "oxlint" ? toU16(d.offset) : starts[d.line - 1] + d.column;
      const n = ifs.get(off);
      const key = `${rel}:${off}`;
      if (!at.has(key)) {
        at.set(key, {
          file: rel,
          line: d.line,
          test: d.test,
          ...(n ? ifShape(n) : { form: "unjoined" }),
          eslint: false,
          oxlint: false,
        });
      }
      at.get(key)[d.linter] = true;
    }
    out.push(...at.values());
  }
  return out;
};

const runRepo = (name) => {
  const files = lib.filesOf(name).map((f) => f.rel);
  const testOf = new Map(lib.filesOf(name).map((f) => [f.rel, f.test]));
  const out = [];
  const neutralised = {};
  const oxCfg = lib.writeOxlintRules(CONFIGS, "topic", OXLINT_RULES, {
    plugins: ["eslint", "unicorn"],
  });
  const sonarCfg = lib.writeOxlintRules(
    CONFIGS,
    "sonar",
    { "sonarjs/no-nested-conditional": "error" },
    {
      jsPlugins: [
        { name: "sonarjs", specifier: pathToFileURL(sonarMain).href },
      ],
      plugins: [],
    }
  );
  const biomeDir = lib.biomeRulesConfig(join(CONFIGS, "biome"), BIOME_RULES);
  for (const mode of ["raw", "reported"]) {
    const m = lib.writeMirror(MIRROR, name, files, mode);
    neutralised[mode] = m.neutralised;
    for (const d of lib.runOxlint({
      configFile: oxCfg,
      cwd: m.root,
      files,
    })) {
      out.push({ ...d, linter: "oxlint", mode });
    }
    for (const d of lib.runOxlint({
      configFile: sonarCfg,
      cwd: m.root,
      files,
    })) {
      out.push({ ...d, linter: "oxlint", mode });
    }
    for (const d of lib.runBiome({
      configDir: biomeDir,
      cwd: m.root,
      files,
    })) {
      out.push({ ...d, linter: "biome", mode });
    }
  }
  // ESLint from the census pass
  for (const m of lib.readJsonl(join(CENSUS, `${name}.eslint.jsonl`))) {
    if (m.rule === "sonarjs/cognitive-complexity") {
      continue;
    }
    out.push({ ...m, linter: "eslint" });
  }
  rmSync(join(MIRROR, "raw", name), { force: true, recursive: true });
  rmSync(join(MIRROR, "reported", name), { force: true, recursive: true });
  // join to the inventory
  const root = lib.getRepo(name).root;
  const byFile = new Map();
  for (const d of out) {
    if (!byFile.has(d.file)) {
      byFile.set(d.file, []);
    }
    byFile.get(d.file).push(d);
  }
  const treeRows = lib.readJsonl(join(CENSUS, `${name}.trees.jsonl`));
  const treeFiles = new Set(treeRows.map((t) => t.file));
  const joined = [];
  const items = [];
  for (const rel of new Set([...byFile.keys(), ...treeFiles])) {
    const ds = byFile.get(rel) ?? [];
    const nestedDs = ds.filter((d) => NESTED.has(d.rule));
    if (nestedDs.length === 0 && !treeFiles.has(rel)) {
      for (const d of ds) {
        joined.push({ ...d, test: testOf.get(rel) });
      }
      continue;
    }
    const text = readFileSync(join(root, rel), "utf8");
    const inv = lib.inventory(text, rel);
    const starts = lineStarts(text);
    const toU16 = lib.utf16Offset(text);
    const cp = lib.codePointColumn(text, starts);
    const byStart = new Map(inv.conditionals.map((c) => [c.range[0], c]));
    const offsetOf = (d) => {
      if (d.linter === "oxlint") {
        return toU16(d.offset);
      }
      if (d.linter === "biome") {
        return cp(d.line, d.column);
      }
      return starts[d.line - 1] + d.column;
    };
    for (const d of ds) {
      const row = { ...d, test: testOf.get(rel) };
      if (NESTED.has(d.rule)) {
        const off = offsetOf(d);
        const c = byStart.get(off);
        row.cond = c ? c.id : null;
        row.root = c ? c.root : null;
        if (!c) {
          row.unjoined = true;
        }
      }
      joined.push(row);
    }
    // per-conditional view: who reports what, for conditionals that are tree members or nested
    // through other expressions
    const reportsAt = (linter, rule, mode) => {
      const s = new Set();
      for (const d of joined) {
        if (
          d.file === rel &&
          d.linter === linter &&
          d.rule === rule &&
          d.mode === mode &&
          d.cond !== null &&
          d.cond !== undefined
        ) {
          s.add(d.cond);
        }
      }
      return s;
    };
    const views = {};
    for (const mode of ["raw", "reported"]) {
      views[mode] = {
        "biome/noNestedTernary": reportsAt(
          "biome",
          "style/noNestedTernary",
          mode
        ),
        "eslint/no-nested-ternary": reportsAt(
          "eslint",
          "no-nested-ternary",
          mode
        ),
        "eslint/sonarjs": reportsAt(
          "eslint",
          "sonarjs/no-nested-conditional",
          mode
        ),
        "eslint/unicorn": reportsAt(
          "eslint",
          "unicorn/no-nested-ternary",
          mode
        ),
        "oxlint/no-nested-ternary": reportsAt(
          "oxlint",
          "no-nested-ternary",
          mode
        ),
        "oxlint/sonarjs": reportsAt(
          "oxlint",
          "sonarjs/no-nested-conditional",
          mode
        ),
        "oxlint/unicorn": reportsAt(
          "oxlint",
          "unicorn/no-nested-ternary",
          mode
        ),
      };
    }
    const byId = new Map(inv.conditionals.map((c) => [c.id, c]));
    const kids = new Map();
    for (const c of inv.conditionals) {
      if (c.slot !== null) {
        if (!kids.has(c.ancestor)) {
          kids.set(c.ancestor, []);
        }
        kids.get(c.ancestor).push(c);
      }
    }
    // the conditionals that matter: anything with a conditional child or ancestor, or reported
    const reported = new Set(Object.values(views.raw).flatMap((s) => [...s]));
    for (const c of inv.conditionals) {
      const childSlots = (kids.get(c.id) ?? []).map((k) => k.slot);
      if (
        c.ancestor === null &&
        childSlots.length === 0 &&
        !reported.has(c.id)
      ) {
        continue;
      }
      // a conditional directly under a TypeScript wrapper whose parent chain reaches a conditional
      const wrapperChild =
        c.slot === null &&
        c.ancestor !== null &&
        c.path.length > 0 &&
        c.path.every((t) => lib.TS_WRAPPERS.has(t));
      const hasWrappedChild = inv.conditionals.some(
        (x) =>
          x.ancestor === c.id &&
          x.slot === null &&
          x.path.length > 0 &&
          x.path.every((t) => lib.TS_WRAPPERS.has(t)) &&
          x.ancestorSlot !== "test"
      );
      const tree = c.root === undefined ? null : c.root;
      // the outermost conditional reachable through ancestors, then its tree root: the unit
      let top = c;
      while (top.ancestor !== null) {
        top = byId.get(top.ancestor);
      }
      items.push({
        ancestor: c.ancestor,
        ancestorSlot: c.ancestorSlot,
        top: byId.get(top.root ?? top.id)?.id ?? top.id,
        childSlots,
        file: rel,
        hasWrappedChild,
        id: c.id,
        line: c.line,
        parenthesized: c.parenthesized,
        path: c.path,
        raw: Object.fromEntries(
          Object.entries(views.raw).map(([k, s]) => [k, s.has(c.id)])
        ),
        reported: Object.fromEntries(
          Object.entries(views.reported).map(([k, s]) => [k, s.has(c.id)])
        ),
        root: tree,
        rootLine: tree === null ? null : byId.get(tree)?.line,
        slot: c.slot,
        sonarNested: c.sonarNested,
        test: testOf.get(rel),
        wrapperChild,
      });
    }
  }
  return { items, joined, neutralised };
};

const summarise = (items, joined) => {
  const byLinterRule = {};
  for (const mode of ["raw", "reported"]) {
    byLinterRule[mode] = countBy(
      joined.filter((d) => (d.mode ?? "raw") === mode),
      (d) => `${d.linter}/${d.rule}`
    );
  }
  const viewNames = VIEW_NAMES;
  // Units: every conditional that nests or is nested (directly or through other expressions)
  // belongs to the outermost conditional it sits in. A view flags a unit when it reports any of
  // its conditionals. A unit's signature lists how its conditionals are related: direct slots
  // (test, consequent, alternate) and indirect paths (the first non-TypeScript node between, and
  // whether sonarjs's breaking nodes or a function lie between).
  const unitOf = (it) => `${it.file}:${it.top}`;
  const units = new Map();
  for (const it of items) {
    const u = unitOf(it);
    if (!units.has(u)) {
      units.set(u, []);
    }
    units.get(u).push(it);
  }
  const signatureOf = (its) => {
    const rel = new Set();
    for (const it of its) {
      if (it.slot !== null) {
        rel.add(`direct:${it.slot}`);
      } else if (it.ancestor !== null) {
        const via = it.path.find((t) => !lib.TS_WRAPPERS.has(t));
        rel.add(
          via
            ? `indirect:${it.ancestorSlot}:${via}${it.sonarNested ? "" : ":broken"}`
            : `wrapped:${it.ancestorSlot}`
        );
      }
    }
    return [...rel].sort().join(" ") || "none";
  };
  const flaggedUnits = {};
  for (const v of viewNames) {
    flaggedUnits[v] = new Set(
      items.filter((it) => it.raw[v]).map((it) => unitOf(it))
    );
  }
  const unitCounts = Object.fromEntries(
    Object.entries(flaggedUnits).map(([v, s]) => [v, s.size])
  );
  unitCounts.all = units.size;
  unitCounts.withDirectNesting = [...units.values()].filter((its) =>
    its.some((it) => it.slot !== null)
  ).length;
  const pairs = [
    ["eslint/no-nested-ternary", "oxlint/no-nested-ternary"],
    ["eslint/no-nested-ternary", "biome/noNestedTernary"],
    ["eslint/no-nested-ternary", "eslint/sonarjs"],
    ["eslint/unicorn", "oxlint/unicorn"],
    ["eslint/sonarjs", "oxlint/sonarjs"],
  ];
  const disagreements = {};
  for (const [a, b] of pairs) {
    const onlyA = [...flaggedUnits[a]].filter((u) => !flaggedUnits[b].has(u));
    const onlyB = [...flaggedUnits[b]].filter((u) => !flaggedUnits[a].has(u));
    disagreements[`${a} vs ${b}`] = {
      both: [...flaggedUnits[a]].filter((u) => flaggedUnits[b].has(u)).length,
      onlyA: onlyA.length,
      onlyASignatures: countBy(onlyA, (u) => signatureOf(units.get(u))),
      onlyAExamples: onlyA.slice(0, 5),
      onlyB: onlyB.length,
      onlyBSignatures: countBy(onlyB, (u) => signatureOf(units.get(u))),
      onlyBExamples: onlyB.slice(0, 5),
    };
  }
  // per-conditional agreement on the reporting unit, for direct nesting
  const conditionalLevel = {
    // ESLint and Oxlint report the conditional that has a nested branch; Biome the nested branch;
    // sonarjs every conditional with an unbroken conditional ancestor
    biomeReportsNestedBranch: items.filter(
      (it) =>
        it.raw["biome/noNestedTernary"] &&
        (it.slot === "consequent" || it.slot === "alternate")
    ).length,
    biomeReports: items.filter((it) => it.raw["biome/noNestedTernary"]).length,
    eslintReports: items.filter((it) => it.raw["eslint/no-nested-ternary"])
      .length,
    eslintReportsParent: items.filter(
      (it) =>
        it.raw["eslint/no-nested-ternary"] &&
        it.childSlots.some((x) => x === "consequent" || x === "alternate")
    ).length,
    nestedBranches: items.filter(
      (it) => it.slot === "consequent" || it.slot === "alternate"
    ).length,
    parents: items.filter((it) =>
      it.childSlots.some((x) => x === "consequent" || x === "alternate")
    ).length,
  };
  // reporting unit: how many reports per nested tree
  const perTree = {};
  for (const v of viewNames) {
    const counts = new Map();
    for (const it of items) {
      if (it.raw[v]) {
        const u = unitOf(it);
        counts.set(u, (counts.get(u) ?? 0) + 1);
      }
    }
    perTree[v] = countBy([...counts.values()], (n) => String(n));
  }
  const unjoined = countBy(
    joined.filter((d) => d.unjoined),
    (d) => `${d.linter}/${d.rule}`
  );
  return {
    byLinterRule,
    conditionalLevel,
    disagreements,
    perTree,
    unitCounts,
    unjoined,
  };
};

const main = () => {
  const names = lib.selectedRepos(lib.ALL);
  lib.checkPinned(names);
  const previous = lib.readJson(join(lib.RESULTS_DIR, "linters.json"), {
    repos: {},
  });
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of nested-ternaries-linters.cjs. Views: eslint/* from the census pass (Ultracite's options), oxlint/* each rule alone (sonarjs through Oxlint's JS plugins), biome/* each rule alone. unitCounts: trees (or indirect nestings) each view flags in raw mode. perTree: how many reports a flagged tree gets. disagreements: units one view flags and the other doesn't, with the reason from the inventory.",
    repos: { ...previous.repos },
    tools: lib.toolVersions(),
  };
  const all = { items: [], joined: [] };
  for (const name of names) {
    const t0 = Date.now();
    const { items, joined, neutralised } = runRepo(name);
    lib.writeJsonl(join(OUT, `${name}.jsonl`), joined);
    lib.writeJsonl(join(OUT, `${name}.items.jsonl`), items);
    lib.writeJsonl(join(OUT, `${name}.prefer.jsonl`), preferTernaryJoin(name));
    const entry = { neutralised, set: lib.setOf(name), sha: lib.shaOf(name) };
    for (const test of [false, true]) {
      entry[test ? "tests" : "source"] = summarise(
        items.filter((i) => i.test === test),
        joined.filter((d) => d.test === test)
      );
    }
    entry.seconds = Math.round((Date.now() - t0) / 1000);
    result.repos[name] = entry;
    const s = entry.source;
    console.log(
      `${name}: units ${JSON.stringify(s.unitCounts)}; unjoined ${JSON.stringify(s.unjoined)} (${entry.seconds}s)`
    );
  }
  // messages and help, by linter and rule
  const messages = {};
  for (const name of lib.ALL) {
    const p = join(OUT, `${name}.jsonl`);
    if (!lib.existsSync(p)) {
      continue;
    }
    for (const d of lib.readJsonl(p)) {
      if ((d.mode ?? "raw") !== "raw") {
        continue;
      }
      const k = `${d.linter}/${d.rule}`;
      messages[k] ??= {};
      const m = `${d.message}${d.help ? ` | help: ${d.help}` : ""}`;
      messages[k][m] = (messages[k][m] ?? 0) + 1;
    }
  }
  result.messages = messages;
  result.pooled = {};
  for (const [set, members] of Object.entries({
    corpus: lib.CORE,
    external: [...lib.CORE, ...lib.REACT],
    react: lib.REACT,
  })) {
    result.pooled[set] = {};
    for (const test of [false, true]) {
      const items = [];
      const joined = [];
      for (const name of members) {
        if (!lib.existsSync(join(OUT, `${name}.jsonl`))) {
          continue;
        }
        items.push(
          ...lib
            .readJsonl(join(OUT, `${name}.items.jsonl`))
            .filter((i) => i.test === test)
            .map((i) => ({ ...i, file: `${name}/${i.file}` }))
        );
        joined.push(
          ...lib
            .readJsonl(join(OUT, `${name}.jsonl`))
            .filter((d) => d.test === test)
        );
      }
      result.pooled[set][test ? "tests" : "source"] = summarise(items, joined);
    }
  }
  // prefer-ternary in ESLint (unicorn 79, Ultracite's options) and Oxlint (its port), by the shape
  // of the reported if statement
  const preferRows = [];
  for (const name of [...lib.CORE, ...lib.REACT]) {
    const p = join(OUT, `${name}.prefer.jsonl`);
    if (lib.existsSync(p)) {
      preferRows.push(
        ...lib
          .readJsonl(p)
          .filter((r) => !r.test)
          .map((r) => ({ ...r, repo: name }))
      );
    }
  }
  const pf = (f) => countBy(preferRows.filter(f), (r) => r.form);
  result.preferTernary = {
    both: pf((r) => r.eslint && r.oxlint),
    branchHasTernary: {
      eslint: preferRows.filter((r) => r.eslint && r.branchHasTernary).length,
      oxlint: preferRows.filter((r) => r.oxlint && r.branchHasTernary).length,
    },
    branchValueIsTernary: {
      eslint: preferRows.filter((r) => r.eslint && r.branchValueIsTernary)
        .length,
      oxlint: preferRows.filter((r) => r.oxlint && r.branchValueIsTernary)
        .length,
    },
    branchValueIsTernaryExamples: preferRows
      .filter((r) => r.branchValueIsTernary)
      .slice(0, 12)
      .map((r) => ({
        eslint: r.eslint,
        form: r.form,
        oxlint: r.oxlint,
        permalink: lib.permalink(r.repo, r.file, r.line),
      })),
    branchHasTernaryExamples: preferRows
      .filter((r) => r.branchHasTernary)
      .slice(0, 12)
      .map((r) => ({
        eslint: r.eslint,
        form: r.form,
        oxlint: r.oxlint,
        permalink: lib.permalink(r.repo, r.file, r.line),
      })),
    eslintOnly: pf((r) => r.eslint && !r.oxlint),
    multiline: {
      eslint: preferRows.filter((r) => r.eslint && r.multiline).length,
      oxlint: preferRows.filter((r) => r.oxlint && r.multiline).length,
    },
    note: "External source, raw. One row per reported if statement. form: if-else:<consequent>/<alternate> (single statements), flat-return (`if (a) return x; return y;`), let-plus-if, else-if, if-only. branchHasTernary: a branch (or, for flat-return, the following return) already holds a conditional outside nested functions, so the ternary would contain one (often through an object or call, which no-nested-ternary doesn't report). branchValueIsTernary: the value a branch returns or assigns is itself a conditional, so converting would nest it directly, which no-nested-ternary reports.",
    oxlintOnly: pf((r) => r.oxlint && !r.eslint),
    total: {
      eslint: preferRows.filter((r) => r.eslint).length,
      oxlint: preferRows.filter((r) => r.oxlint).length,
    },
  };
  lib.writeJson(join(lib.RESULTS_DIR, "linters.json"), result);
  rmSync(CONFIGS, { force: true, recursive: true });
  const p = result.pooled.external.source;
  console.log(
    JSON.stringify(
      { disagreements: p.disagreements, units: p.unitCounts },
      null,
      1
    )
  );
};

if (require.main === module) {
  main();
}
