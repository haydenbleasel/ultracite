// The rewrites: every nested ternary ESLint's no-nested-ternary reports, rewritten on copies in
// each way that applies, as a careful person or an autofix would, one tree per copy so every
// difference is the rewrite's:
//
//   early-return  a `return` argument or an arrow's concise body becomes if statements that return
//                 (`if (a) { return x; } if (b) { return y; } return z;`), with braces, as curly
//                 wants; a consequent ternary becomes an if inside the if
//   let-if        `const v = …` becomes `let v; if (a) { v = x; } else if (b) { v = y; } else
//                 { v = z; }` (one declarator, an identifier, the type annotation kept)
//   if-statement  an assignment statement or an expression statement becomes if/else statements
//   helper        any position: a local arrow (`const selectN = () => { if … return … }`) defined
//                 just above the statement that holds the ternary, in the same function (a concise
//                 arrow body becomes a block), and the ternary replaced by `selectN()` (`await
//                 selectN()` and an async helper when a branch awaits; generators are skipped)
//   lookup        one discriminant compared with string or number literals (the census's test
//                 shape): `({ k1: v1, k2: v2 })[d] ?? fallback`, every value evaluated eagerly
//   lookup-lazy   the same with thunks: `({ k1: () => v1 })[d]?.() ?? fallback`
//   switch        a switch on the discriminant (lookup and switch shapes), in place for early-return
//                 positions, otherwise inside a helper
//
// For each rewrite: whether it parses; lines added (both copies formatted with Oxfmt); the
// enclosing function's sonarjs cognitive complexity before and after, and the helper's; what
// Ultracite's presets report on the result against the original (Oxlint core, + react for .tsx,
// as init wires it; ESLint core (+ react) with the rules that bear on control flow; Biome core
// (+ react)); and what each `ultracite fix` path does to it (oxlint --fix then Oxfmt, eslint --fix
// then Prettier, biome check --write), against the same path on the original, so a rule that
// undoes the rewrite shows up as a nested ternary or a conditional that comes back. Static signs
// that a rewrite can change behaviour are recorded per rewrite (eager evaluation of calls, throws,
// awaits and member reads; `??` replacing an undefined or null branch; inherited keys; number keys;
// a discriminant that is a call or member read evaluated a different number of times; an exported
// `const` that becomes `let`; an await moved into an async helper).
//
// Usage: node --max-old-space-size=16384 research/corpus/scripts/nested-ternaries-rewrite.cjs [--repos a,b] [--skip-eslint]
// Writes out/nested-ternaries/rewrite/items.jsonl and results/nested-ternaries/rewrite.json.
"use strict";

const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { basename, join } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const WORK = join(lib.TMP, "rewrite");
const CONFIGS = join(lib.TMP, "configs-rewrite");
const OUT = join(lib.OUT_DIR, "rewrite");
const KINDS = [
  "early-return",
  "let-if",
  "if-statement",
  "helper",
  "lookup",
  "lookup-lazy",
  "switch",
];
// ESLint rules that bear on what a rewrite leaves (the rest of the preset is unaffected by it)
const ESLINT_FOCUS =
  /^(?:no-nested-ternary|unicorn\/prefer-ternary|unicorn\/prefer-minimal-ternary|no-else-return|unicorn\/no-useless-else|curly|no-lonely-if|unicorn\/no-lonely-if|func-style|no-use-before-define|@typescript-eslint\/no-use-before-define|prefer-const|sonarjs\/no-nested-conditional|sonarjs\/cognitive-complexity|complexity|arrow-body-style|no-useless-return|sonarjs\/prefer-immediate-return|sonarjs\/prefer-single-boolean-return|unicorn\/prefer-switch|sonarjs\/no-small-switch|default-case|unicorn\/switch-case-braces|no-case-declarations|unicorn\/no-useless-undefined|no-undefined|unicorn\/no-negated-condition|no-negated-condition|init-declarations|@typescript-eslint\/init-declarations|unicorn\/consistent-function-scoping|max-statements|sonarjs\/no-redundant-jump|no-unneeded-ternary|unicorn\/prefer-logical-operator-over-ternary|@typescript-eslint\/no-unnecessary-condition|unicorn\/no-array-callback-reference|func-names|prefer-arrow-callback|no-implicit-coercion|dot-notation|@typescript-eslint\/dot-notation|no-restricted-syntax|unicorn\/no-object-as-default-parameter|sonarjs\/no-collapsible-if|unicorn\/prefer-default-parameters|no-param-reassign|sonarjs\/function-return-type|@typescript-eslint\/explicit-function-return-type|@typescript-eslint\/explicit-module-boundary-types|@typescript-eslint\/no-confusing-void-expression|no-useless-assignment|sonarjs\/no-dead-store)$/;

// ── text helpers ───────────────────────────────────────────────────────
const isCond = (n) => n?.type === "ConditionalExpression";
const peelTs = lib.peel;
// The range of a node with the parentheses around it (ESTree drops them).
const parenRange = (text, node) => {
  let [s, e] = node.range;
  for (;;) {
    let i = s - 1;
    while (i >= 0 && /\s/.test(text[i])) {
      i--;
    }
    let j = e;
    while (j < text.length && /\s/.test(text[j])) {
      j++;
    }
    if (text[i] === "(" && text[j] === ")") {
      // the `(` must not belong to a call, `if`, arrow params, etc.: look at what precedes it
      let k = i - 1;
      while (k >= 0 && /\s/.test(text[k])) {
        k--;
      }
      const prev = text[k];
      if (
        prev &&
        /[\w$)\]]/.test(prev) &&
        !/\b(?:return|typeof|void|await|case|in|of|throw|yield|new|delete|else)$/.test(
          text.slice(Math.max(0, k - 8), k + 1)
        )
      ) {
        break;
      }
      s = i;
      e = j + 1;
      continue;
    }
    break;
  }
  return [s, e];
};
const src = (text, node) => text.slice(node.range[0], node.range[1]);
const needsParensAsValue = (n) =>
  n.type === "SequenceExpression" ||
  n.type === "ObjectExpression" ||
  n.type === "FunctionExpression" ||
  n.type === "ClassExpression";
const leafValue = (text, n, suffix = "") => {
  const t = src(text, n);
  const wrapped = n.type === "SequenceExpression" ? `(${t})` : t;
  return suffix ? `(${wrapped})${suffix}` : wrapped;
};
const stmtOfLeaf = (text, n) => {
  const t = src(text, n);
  return needsParensAsValue(n) ||
    /^(?:let\s*\[|function\b|class\b|async\s+function\b)/.test(t)
    ? `(${t});`
    : `${t};`;
};
// if statements that return each leaf (a chain becomes flat early returns)
const emitReturns = (text, n, suffix) => {
  if (!isCond(n)) {
    return `return ${leafValue(text, n, suffix)};`;
  }
  return `if (${src(text, n.test)}) {\n${emitReturns(text, n.consequent, suffix)}\n}\n${emitReturns(text, n.alternate, suffix)}`;
};
const emitAssign = (text, n, target, op) => {
  if (!isCond(n)) {
    return `${target} ${op} ${leafValue(text, n)};`;
  }
  const alt = isCond(n.alternate)
    ? ` else ${emitAssign(text, n.alternate, target, op)}`
    : ` else {\n${emitAssign(text, n.alternate, target, op)}\n}`;
  return `if (${src(text, n.test)}) {\n${emitAssign(text, n.consequent, target, op)}\n}${alt}`;
};
const emitStatements = (text, n) => {
  if (!isCond(n)) {
    return stmtOfLeaf(text, n);
  }
  const alt = isCond(n.alternate)
    ? ` else ${emitStatements(text, n.alternate)}`
    : ` else {\n${emitStatements(text, n.alternate)}\n}`;
  return `if (${src(text, n.test)}) {\n${emitStatements(text, n.consequent)}\n}${alt}`;
};
const containsType = (n, types) => {
  let found = false;
  const visit = (x, inFn) => {
    if (found || !x || typeof x.type !== "string") {
      return;
    }
    if (types.has(x.type) && !inFn) {
      found = true;
      return;
    }
    const fn = lib.FUNCTION_TYPES.has(x.type);
    for (const { node } of lib.sk.children(x)) {
      visit(node, inFn || fn);
    }
  };
  visit(n, false);
  return found;
};

// ── lookups ────────────────────────────────────────────────────────────
// The spine of a chain: [{ test, value }], and the final default.
const spineOf = (root) => {
  const out = [];
  let x = root;
  while (isCond(x)) {
    out.push({ test: x.test, value: x.consequent });
    x = x.alternate;
  }
  return { arms: out, fallback: x };
};
const keyText = (constNode) => {
  const x = peelTs(constNode);
  if (x.type === "Literal") {
    return typeof x.value === "number"
      ? String(x.value)
      : JSON.stringify(x.value);
  }
  if (x.type === "TemplateLiteral") {
    return JSON.stringify(x.quasis[0].value.cooked);
  }
  if (x.type === "UnaryExpression") {
    return `[${-x.argument.value}]`;
  }
  return null;
};
// The constant side of each comparison in a test (`d === c`, `c === d`, `d === a || d === b`),
// and the discriminant, with the census's own definition of a constant.
const constantsOf = (test) => {
  const t = peelTs(test);
  if (t.type === "LogicalExpression") {
    return [...constantsOf(t.left), ...constantsOf(t.right)];
  }
  return [
    lib.isConstant(t.right) && !lib.isConstant(t.left) ? t.right : t.left,
  ];
};
const discriminantOf = (text, test) => {
  const t = peelTs(test);
  if (t.type === "LogicalExpression") {
    return discriminantOf(text, t.left);
  }
  return lib.isConstant(t.right) && !lib.isConstant(t.left) ? t.left : t.right;
};
const lookupText = (text, root, lazy) => {
  const { arms, fallback } = spineOf(root);
  if (arms.some((a) => /^!/.test(peelTs(a.test).operator ?? ""))) {
    return { skipped: "negated-test" };
  }
  const d = discriminantOf(text, arms[0].test);
  const entries = [];
  for (const a of arms) {
    for (const k of constantsOf(a.test)) {
      const kt = keyText(k);
      if (kt === null) {
        return { skipped: "non-literal-key" };
      }
      const v = leafValue(text, a.value);
      entries.push(
        `${kt}: ${lazy ? `() => ${needsParensAsValue(a.value) ? `(${src(text, a.value)})` : v}` : v}`
      );
    }
  }
  const call = lazy ? "?.()" : "";
  const fb =
    fallback.type === "Identifier" && fallback.name === "undefined"
      ? ""
      : ` ?? ${leafValue(text, fallback)}`;
  return `(({ ${entries.join(", ")} })[${src(text, d)}]${call}${fb})`;
};
const switchText = (text, root, wrapReturn) => {
  const { arms, fallback } = spineOf(root);
  if (arms.some((a) => /^!/.test(peelTs(a.test).operator ?? ""))) {
    return null;
  }
  const d = discriminantOf(text, arms[0].test);
  const cases = [];
  for (const a of arms) {
    const ks = constantsOf(a.test).map((k) => src(text, k));
    const labels = ks.map((k) => `case ${k}:`).join("\n");
    cases.push(
      `${labels} {\nreturn ${leafValue(text, a.value, wrapReturn)};\n}`
    );
  }
  cases.push(`default: {\nreturn ${leafValue(text, fallback, wrapReturn)};\n}`);
  return `switch (${src(text, d)}) {\n${cases.join("\n")}\n}`;
};

// ── where statements can go ────────────────────────────────────────────
const LIST_PARENTS = new Set([
  "Program",
  "BlockStatement",
  "StaticBlock",
  "SwitchCase",
  "TSModuleBlock",
]);
// The statement that holds the node in a statement list of the same function, or the concise
// arrow whose body holds it (when that comes first). null: a parameter, a class field, a decorator.
const anchorOf = (node) => {
  let child = node;
  for (let p = node.parent; p; p = p.parent) {
    if (
      p.type === "ArrowFunctionExpression" &&
      p.body === child &&
      child.type !== "BlockStatement"
    ) {
      return { arrow: p, kind: "concise-arrow" };
    }
    if (lib.FUNCTION_TYPES.has(p.type) && p.params.includes(child)) {
      return null;
    }
    if (lib.FUNCTION_TYPES.has(p.type) && p.body !== child) {
      return null;
    }
    if (
      p.type === "PropertyDefinition" ||
      p.type === "AccessorProperty" ||
      p.type === "Decorator" ||
      p.type === "TSEnumMember"
    ) {
      return null;
    }
    if (
      LIST_PARENTS.has(p.type) &&
      /Statement|Declaration|Directive/.test(child.type)
    ) {
      return { kind: "statement", statement: child };
    }
    child = p;
  }
  return null;
};

// ── building one rewrite ───────────────────────────────────────────────
const applyEdits = (text, edits) => {
  const sorted = [...edits].sort((a, b) => b[0] - a[0]);
  let out = text;
  for (const [s, e, r] of sorted) {
    out = out.slice(0, s) + r + out.slice(e);
  }
  return out;
};
const buildRewrite = (text, ast, root, kind, row, n) => {
  const { node: outer, parent, wraps } = lib.outerOf(root);
  const suffix =
    wraps.length > 0
      ? text.slice(parenRange(text, root)[1], outer.range[1])
      : "";
  if (wraps.some((w) => w === "TSTypeAssertion")) {
    if (kind !== "helper" && kind !== "lookup" && kind !== "lookup-lazy") {
      return { skipped: "type-assertion-prefix" };
    }
  }
  const hasAwait = containsType(root, new Set(["AwaitExpression"]));
  const hasYield = containsType(root, new Set(["YieldExpression"]));
  if (kind === "early-return") {
    if (row.position === "return") {
      const ret = parent;
      const body = emitReturns(text, root, suffix);
      const inList = LIST_PARENTS.has(ret.parent.type);
      return {
        edits: [[ret.range[0], ret.range[1], inList ? body : `{\n${body}\n}`]],
      };
    }
    if (row.position === "arrow-body") {
      const arrow = parent;
      const [s, e] = parenRange(text, outer);
      return {
        edits: [[s, e, `{\n${emitReturns(text, root, suffix)}\n}`]],
        arrowStart: arrow.range[0],
      };
    }
    return { skipped: "not-applicable" };
  }
  if (kind === "let-if") {
    if (row.position !== "initializer" || wraps.length > 0) {
      return {
        skipped: row.position === "initializer" ? "wrapped" : "not-applicable",
      };
    }
    const decl = parent.parent;
    if (
      parent.id.type !== "Identifier" ||
      decl.declarations.length !== 1 ||
      /^For/.test(decl.parent.type) ||
      decl.declare
    ) {
      return { skipped: "pattern-or-multiple-declarators" };
    }
    const kw = decl.kind === "const" || decl.kind === "let" ? "let" : decl.kind;
    const id = src(text, parent.id);
    const name = parent.id.name;
    const inList =
      LIST_PARENTS.has(decl.parent.type) ||
      decl.parent.type === "ExportNamedDeclaration";
    if (!inList) {
      return { skipped: "declaration-not-in-statement-list" };
    }
    return {
      edits: [
        [
          decl.range[0],
          decl.range[1],
          `${kw} ${id};\n${emitAssign(text, root, name, "=")}`,
        ],
      ],
      exportedLet: decl.parent.type === "ExportNamedDeclaration",
    };
  }
  if (kind === "if-statement") {
    if (row.position === "assignment-statement" && wraps.length === 0) {
      const asg = parent;
      const stmt = asg.parent;
      const inList = LIST_PARENTS.has(stmt.parent.type);
      const body = emitAssign(text, root, src(text, asg.left), asg.operator);
      return {
        edits: [
          [stmt.range[0], stmt.range[1], inList ? body : `{\n${body}\n}`],
        ],
      };
    }
    if (row.position === "statement" && wraps.length === 0) {
      const stmt = parent;
      const inList = LIST_PARENTS.has(stmt.parent.type);
      const body = emitStatements(text, root);
      return {
        edits: [
          [stmt.range[0], stmt.range[1], inList ? body : `{\n${body}\n}`],
        ],
      };
    }
    return { skipped: "not-applicable" };
  }
  const isDispatch =
    row.tests?.shape === "lookup" || row.tests?.shape === "switch";
  if (kind === "lookup" || kind === "lookup-lazy") {
    if (row.tests?.shape !== "lookup" || row.shape !== "chain") {
      return { skipped: "not-applicable" };
    }
    const t = lookupText(text, root, kind === "lookup-lazy");
    if (typeof t !== "string") {
      return t;
    }
    const [s, e] = parenRange(text, root);
    return { edits: [[s, e, t]] };
  }
  if (kind === "switch" && (!isDispatch || row.shape !== "chain")) {
    return { skipped: "not-applicable" };
  }
  if (kind === "switch" && row.position === "return") {
    const t = switchText(text, root, suffix);
    if (!t) {
      return { skipped: "negated-test" };
    }
    const ret = parent;
    const inList = LIST_PARENTS.has(ret.parent.type);
    return { edits: [[ret.range[0], ret.range[1], inList ? t : `{\n${t}\n}`]] };
  }
  if (kind === "switch" && row.position === "arrow-body") {
    const t = switchText(text, root, suffix);
    if (!t) {
      return { skipped: "negated-test" };
    }
    const [s, e] = parenRange(text, outer);
    return { arrowStart: parent.range[0], edits: [[s, e, `{\n${t}\n}`]] };
  }
  // helper (and switch in other positions): a local arrow above the statement
  if (hasYield) {
    return { skipped: "yield" };
  }
  const anchor = anchorOf(root);
  if (!anchor) {
    return { skipped: "no-statement-position" };
  }
  const name = `select${n}`;
  let body;
  if (kind === "switch") {
    body = switchText(text, root, "");
    if (!body) {
      return { skipped: "negated-test" };
    }
  } else {
    body = emitReturns(text, root, "");
  }
  const head = `const ${name} = `;
  const helper = `${head}${hasAwait ? "async " : ""}() => {\n${body}\n};\n`;
  const callText = `${hasAwait ? "await " : ""}${name}()`;
  const [rs, re] = parenRange(text, root);
  if (anchor.kind === "statement") {
    const s = anchor.statement;
    return {
      edits: [
        [s.range[0], s.range[0], helper],
        [rs, re, hasAwait ? `(${callText})` : callText],
      ],
      helperAt: s.range[0] + head.length,
      awaitMoved: hasAwait,
    };
  }
  // a concise arrow body becomes a block: `{ const selectN = …; return <body>; }`
  const arrow = anchor.arrow;
  const [bs, be] = parenRange(text, arrow.body);
  const bodyText = text.slice(arrow.body.range[0], arrow.body.range[1]);
  const inner =
    bodyText.slice(
      0,
      rs - arrow.body.range[0] < 0 ? 0 : rs - arrow.body.range[0]
    ) +
    (hasAwait ? `(${callText})` : callText) +
    bodyText.slice(re - arrow.body.range[0]);
  if (rs < arrow.body.range[0] || re > arrow.body.range[1]) {
    // the ternary is the body itself (with its own parentheses)
    return {
      arrowStart: arrow.range[0],
      awaitMoved: hasAwait,
      edits: [[bs, be, `{\n${helper}return ${callText};\n}`]],
      helperAt: bs + 2 + head.length,
    };
  }
  return {
    arrowStart: arrow.range[0],
    awaitMoved: hasAwait,
    edits: [
      [
        bs,
        be,
        `{\n${helper}return ${needsParensAsValue(arrow.body) ? `(${inner})` : inner};\n}`,
      ],
    ],
    helperAt: bs + 2 + head.length,
  };
};

// Static signs that a rewrite can change behaviour.
const behaviourSigns = (text, root, row, kind, built) => {
  const signs = [];
  if (kind === "lookup" || kind === "lookup-lazy") {
    const { arms, fallback } = spineOf(root);
    const risks = row.leafRisks;
    const armRisks = risks.slice(0, arms.length);
    if (kind === "lookup") {
      if (armRisks.some((r) => r === "effects")) {
        signs.push("eager-calls");
      }
      if (armRisks.includes("await")) {
        signs.push("eager-await");
      }
      if (armRisks.includes("throws")) {
        signs.push("eager-throw");
      }
      if (armRisks.includes("reads")) {
        signs.push("eager-member-reads");
      }
    }
    const fbKind = lib.peel(fallback).type;
    const hasFallback = !(
      fallback.type === "Identifier" && fallback.name === "undefined"
    );
    const armKinds = row.leafKinds.slice(0, arms.length);
    if (
      hasFallback &&
      armKinds.some((k) => k === "undefined" || k === "null")
    ) {
      signs.push("nullish-branch-replaced-by-default");
    } else if (
      hasFallback &&
      armKinds.some((k) =>
        ["member", "call", "identifier", "logical", "await"].includes(k)
      )
    ) {
      signs.push("branch-may-be-nullish");
    }
    signs.push("inherited-keys");
    if (row.tests?.constants?.includes("number")) {
      signs.push("number-keys-match-strings");
    }
    if (row.tests?.multiValue) {
      signs.push("value-duplicated-per-key");
    }
    void fbKind;
  }
  if (
    (kind === "lookup" || kind === "lookup-lazy" || kind === "switch") &&
    ["member", "call-or-chain", "other"].includes(row.tests?.discriminantKind)
  ) {
    signs.push(
      row.tests.discriminantKind === "call-or-chain"
        ? "discriminant-call-evaluated-once"
        : "discriminant-read-evaluated-once"
    );
  }
  if (kind === "switch" && row.tests?.looseEquality) {
    signs.push("loose-equality-becomes-strict");
  }
  if (built.exportedLet) {
    signs.push("exported-const-becomes-let");
  }
  if (built.awaitMoved) {
    signs.push("await-moved-into-async-helper");
  }
  return signs;
};

// ── linting and fixing copies ──────────────────────────────────────────
const presetsFor = (f) => (/\.[jt]sx$/.test(f) ? ["core", "react"] : ["core"]);
const groupByPresets = (files) => {
  const g = new Map();
  for (const f of files) {
    const k = presetsFor(f).join("+");
    if (!g.has(k)) {
      g.set(k, []);
    }
    g.get(k).push(f);
  }
  return g;
};
const oxlintAll = (files) => {
  const out = [];
  for (const [k, sel] of groupByPresets(files)) {
    const cfg = lib.dc.writeOxlintConfig(k.split("+"), CONFIGS);
    out.push(...lib.dc.runOxlint({ configFile: cfg, cwd: WORK, files: sel }));
  }
  return out;
};
const oxlintFixAll = (files) => {
  for (const [k, sel] of groupByPresets(files)) {
    lib.sk.oxlintFix({
      configFile: lib.dc.writeOxlintConfig(k.split("+"), CONFIGS),
      cwd: WORK,
      files: sel,
    });
  }
};
const biomeDir = (k) => {
  const dir = join(CONFIGS, `biome-${k}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "biome.json"),
    JSON.stringify({
      extends: k
        .split("+")
        .map((p) => join(lib.CLI, "config/biome", p, "biome.jsonc")),
      javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
      root: true,
      vcs: { enabled: false },
    })
  );
  return dir;
};
const biomeAll = (files) => {
  const out = [];
  for (const [k, sel] of groupByPresets(files)) {
    out.push(
      ...lib.sk.runBiome({
        configDir: biomeDir(k),
        cwd: WORK,
        files: sel,
        keep: (r) => r.startsWith("lint/"),
      })
    );
  }
  return out;
};
const biomeWriteAll = (files) => {
  for (const [k, sel] of groupByPresets(files)) {
    lib.sk.biomeWrite({
      configDir: biomeDir(k),
      cwd: WORK,
      files: sel,
      timeout: 600_000,
    });
  }
};
const eslintAll = async (files) => {
  const out = [];
  for (const [k, sel] of groupByPresets(files)) {
    out.push(
      ...(await lib.dc.runEslint({
        cwd: WORK,
        files: sel,
        keep: (r) => ESLINT_FOCUS.test(r),
        presets: k.split("+"),
      }))
    );
  }
  return out;
};
const eslintFixAll = async (files) => {
  const { ESLint } = require(require.resolve("eslint", { paths: [lib.CLI] }));
  for (const [k, sel] of groupByPresets(files)) {
    const blocks = await lib.dc.eslintBlocks({
      keep: (r) => ESLINT_FOCUS.test(r),
      presets: k.split("+"),
    });
    const eslint = new ESLint({
      cwd: WORK,
      errorOnUnmatchedPattern: false,
      fix: true,
      ignore: false,
      overrideConfig: [
        ...blocks,
        {
          linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: "off",
          },
        },
      ],
      overrideConfigFile: true,
    });
    const CHUNK = 200;
    for (let i = 0; i < sel.length; i += CHUNK) {
      await ESLint.outputFixes(await eslint.lintFiles(sel.slice(i, i + CHUNK)));
    }
  }
};
const countRules = (ds) => {
  const m = new Map();
  for (const d of ds) {
    const f = d.file.replace(/^\.\//, "");
    if (!m.has(f)) {
      m.set(f, {});
    }
    const o = m.get(f);
    o[d.rule] = (o[d.rule] ?? 0) + 1;
  }
  return m;
};
const diffRules = (after = {}, before = {}) => {
  const out = {};
  for (const r of new Set([...Object.keys(after), ...Object.keys(before)])) {
    const d = (after[r] ?? 0) - (before[r] ?? 0);
    if (d !== 0) {
      out[r] = d;
    }
  }
  return out;
};

// ── main ───────────────────────────────────────────────────────────────
const main = async () => {
  const names = lib.selectedRepos([...lib.CORE, ...lib.REACT]);
  lib.checkPinned(names);
  rmSync(WORK, { force: true, recursive: true });
  mkdirSync(WORK, { recursive: true });
  const items = [];
  const originals = new Map(); // fileId -> { rel, repo, path }
  let fileId = 0;
  let itemId = 0;
  for (const name of names) {
    const root = lib.getRepo(name).root;
    const trees = lib
      .readJsonl(join(CENSUS, `${name}.trees.jsonl`))
      .filter((t) => t.slots.consequent + t.slots.alternate > 0);
    const byFile = new Map();
    for (const t of trees) {
      if (!byFile.has(t.file)) {
        byFile.set(t.file, []);
      }
      byFile.get(t.file).push(t);
    }
    for (const [rel, rows] of byFile) {
      const text = readFileSync(join(root, rel), "utf8");
      const { ast, error } = lib.sk.safeParse(text, rel);
      if (!ast) {
        console.warn(`${name}/${rel}: ${error}`);
        continue;
      }
      const conds = new Map();
      lib.sk.walk(ast, (node) => {
        if (node.type === "ConditionalExpression") {
          conds.set(`${node.range[0]}:${node.range[1]}`, node);
        }
      });
      const fid = fileId++;
      const opath = `orig/${fid}/${basename(rel)}`;
      lib.writeText(join(WORK, opath), text);
      const inv0 = lib.cognitiveOf(text, rel);
      originals.set(fid, { path: opath, rel, repo: name, test: rows[0].test });
      for (const row of rows) {
        const root0 = conds.get(`${row.range[0]}:${row.range[1]}`);
        if (!root0) {
          console.warn(`${name}/${rel}:${row.line}: tree not found`);
          continue;
        }
        const fnBefore = inv0.functions?.find(
          (f) => row.fn !== null && f.index === row.fn
        );
        for (const kind of KINDS) {
          const id = itemId++;
          const built = buildRewrite(text, ast, root0, kind, row, id);
          const item = {
            depth: row.depth,
            file: rel,
            fileId: fid,
            id,
            inJsx: row.inJsx,
            kind,
            line: row.line,
            position: row.position,
            repo: name,
            rewriteClass: row.rewrite,
            shape: row.shape,
            test: row.test,
            testShape: row.tests?.shape ?? null,
          };
          if (built.skipped) {
            if (built.skipped !== "not-applicable") {
              items.push({ ...item, skipped: built.skipped });
            }
            continue;
          }
          const out = applyEdits(text, built.edits);
          const path = `items/${id}/${basename(rel)}`;
          lib.writeText(join(WORK, path), out);
          // cognitive complexity: the enclosing function (its start doesn't move) and the helper
          const inv1 = lib.cognitiveOf(out, rel);
          const parses = !inv1.error;
          let fnAfter = null;
          let helperScore = null;
          if (parses && fnBefore) {
            fnAfter =
              inv1.functions.find((f) => f.range[0] === fnBefore.range[0]) ??
              null;
            if (
              !fnAfter &&
              built.edits.every((e) => e[0] > fnBefore.range[0])
            ) {
              fnAfter = null;
            }
          }
          if (parses && built.helperAt !== undefined) {
            const h = inv1.functions.find((f) => f.range[0] === built.helperAt);
            helperScore = h ? h.cognitive : null;
          }
          const nestedLeft = parses
            ? inv1.trees.filter(
                (t) => t.slots.consequent + t.slots.alternate > 0
              ).length
            : null;
          items.push({
            ...item,
            cognitive: {
              after: fnAfter ? fnAfter.cognitive : null,
              before: fnBefore ? fnBefore.cognitive : null,
              helper: helperScore,
            },
            conditionals: parses ? inv1.conditionals.length : null,
            nested: nestedLeft,
            edits: built.edits,
            parses,
            path,
            signs: behaviourSigns(text, root0, row, kind, built),
          });
        }
      }
    }
    console.log(`${name}: ${trees.length} trees, ${items.length} items so far`);
  }
  // nested ternaries ESLint reports in each original, for the comparison
  for (const o of originals.values()) {
    const inv = lib.inventory(readFileSync(join(WORK, o.path), "utf8"), o.rel);
    o.nested =
      inv.trees?.filter((t) => t.slots.consequent + t.slots.alternate > 0)
        .length ?? null;
    o.conditionals = inv.conditionals?.length ?? null;
  }
  const built = items.filter((i) => i.path && i.parses);
  // formatted copies for line counts
  const fmt = (p) => p.replace(/^(orig|items)\//, "$1-fmt/");
  for (const p of [
    ...[...originals.values()].map((o) => o.path),
    ...built.map((i) => i.path),
  ]) {
    lib.writeText(join(WORK, fmt(p)), readFileSync(join(WORK, p), "utf8"));
  }
  const fmtFiles = [
    ...[...originals.values()].map((o) => fmt(o.path)),
    ...built.map((i) => fmt(i.path)),
  ];
  const fr = await lib.formatInPlace({
    cwd: WORK,
    files: fmtFiles,
    tool: "oxfmt",
  });
  const linesOf = (p) => readFileSync(join(WORK, p), "utf8").split("\n").length;
  // presets
  const allFiles = [
    ...[...originals.values()].map((o) => o.path),
    ...built.map((i) => i.path),
  ];
  console.log(`linting ${allFiles.length} files`);
  const ox = countRules(oxlintAll(allFiles));
  const bi = countRules(
    biomeAll(allFiles).map((d) => ({
      ...d,
      rule: d.rule.replace(/^lint\//, ""),
    }))
  );
  const es = lib.flag("skip-eslint")
    ? new Map()
    : countRules(await eslintAll(allFiles));
  // fix paths on marked copies of the rewrites: the rewritten code sits between /*NT{*/ and
  // /*}NT*/, so what a fix pass gives back can be counted inside it, whatever else it changes
  const fixPaths = {
    biome: { dir: "fix-biome", run: (fs) => biomeWriteAll(fs) },
    eslint: {
      dir: "fix-eslint",
      run: async (fs) => {
        if (!lib.flag("skip-eslint")) {
          await eslintFixAll(fs);
          await lib.formatInPlace({ cwd: WORK, files: fs, tool: "prettier" });
        }
      },
    },
    oxlint: {
      dir: "fix-oxlint",
      run: async (fs) => {
        oxlintFixAll(fs);
        await lib.formatInPlace({ cwd: WORK, files: fs, tool: "oxfmt" });
      },
    },
  };
  const BEGIN = "/*NT{*/";
  const END = "/*}NT*/";
  const regionCounts = (t, rel) => {
    const regions = [];
    let at = 0;
    for (;;) {
      const b = t.indexOf(BEGIN, at);
      if (b === -1) {
        break;
      }
      const e = t.indexOf(END, b);
      if (e === -1) {
        break;
      }
      regions.push([b, e]);
      at = e + END.length;
    }
    const inv = lib.inventory(t, rel);
    if (inv.error) {
      return { parses: false };
    }
    const inside = (r) =>
      regions.some(([b, e]) => r[0] >= b && r[1] <= e + END.length);
    return {
      conditionals: inv.conditionals.filter((c) => inside(c.range)).length,
      markers: regions.length,
      nested: inv.trees.filter(
        (x) => x.slots.consequent + x.slots.alternate > 0 && inside(x.range)
      ).length,
      parses: true,
      regionText: regions
        .map(([b, e]) => t.slice(b, e + END.length))
        .join("\n…\n"),
    };
  };
  const marked = new Map();
  for (const it of built) {
    const o = originals.get(it.fileId);
    const text = readFileSync(join(WORK, o.path), "utf8");
    marked.set(
      it.id,
      applyEdits(
        text,
        it.edits.map(([s0, e0, r]) => [s0, e0, `${BEGIN}${r}${END}`])
      )
    );
  }
  const fixed = {};
  for (const [k, fp] of Object.entries(fixPaths)) {
    const files = [];
    for (const it of built) {
      const p = `${fp.dir}/${it.path}`;
      lib.writeText(join(WORK, p), marked.get(it.id));
      files.push(p);
    }
    console.log(`fix path ${k}`);
    await fp.run(files);
    fixed[k] = new Map(
      built.map((it) => [
        it.id,
        regionCounts(
          readFileSync(join(WORK, `${fp.dir}/${it.path}`), "utf8"),
          it.path.split("/").at(-1)
        ),
      ])
    );
  }
  const before = new Map(
    built.map((it) => [
      it.id,
      regionCounts(marked.get(it.id), it.path.split("/").at(-1)),
    ])
  );
  for (const it of built) {
    const o = originals.get(it.fileId);
    it.lines = {
      after: linesOf(fmt(it.path)),
      before: linesOf(fmt(o.path)),
    };
    it.lines.added = it.lines.after - it.lines.before;
    it.presets = {
      biome: diffRules(bi.get(it.path), bi.get(o.path)),
      eslint: diffRules(es.get(it.path), es.get(o.path)),
      oxlint: diffRules(ox.get(it.path), ox.get(o.path)),
    };
    // this tree's nested ternary is gone, and nothing else in the file changed
    it.nestedRemoved = o.nested - it.nested;
    it.fix = {};
    const b0 = before.get(it.id);
    for (const k of Object.keys(fixPaths)) {
      const b = fixed[k].get(it.id);
      const ok = b.parses && b0.parses && b.markers === b0.markers;
      it.fix[k] = {
        // inside the rewritten code: conditionals and nested ternaries the fix pass gave back
        conditionalsAdded: ok ? b.conditionals - b0.conditionals : null,
        markersLost: b.parses && b.markers !== b0.markers,
        nestedBack: ok ? b.nested - b0.nested : null,
        parses: b.parses,
        ...(ok && b.conditionals > b0.conditionals
          ? { region: b.regionText.slice(0, 1500) }
          : {}),
      };
    }
    delete it.edits;
  }
  for (const it of items) {
    delete it.edits;
  }
  lib.writeJsonl(join(OUT, "items.jsonl"), items);
  // summary
  const countBy = (xs, f) => {
    const out = {};
    for (const x of xs) {
      for (const k of [f(x)].flat()) {
        if (k === null || k === undefined) {
          continue;
        }
        out[k] = (out[k] ?? 0) + 1;
      }
    }
    return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
  };
  const dist = (xs) => {
    const s = xs
      .filter((x) => x !== null && x !== undefined)
      .sort((a, b) => a - b);
    if (s.length === 0) {
      return null;
    }
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
    return {
      max: s.at(-1),
      mean: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 100) / 100,
      median: q(0.5),
      min: s[0],
      n: s.length,
      p90: q(0.9),
      sum: s.reduce((a, b) => a + b, 0),
    };
  };
  const summary = {};
  for (const set of ["source", "tests"]) {
    const pick = items.filter((i) => i.test === (set === "tests"));
    summary[set] = {};
    for (const kind of KINDS) {
      const ks = pick.filter((i) => i.kind === kind);
      const ok = ks.filter((i) => i.parses);
      const ruleTotals = (linter) => {
        const t = {};
        const runs = {};
        for (const i of ok) {
          for (const [r, d] of Object.entries(i.presets?.[linter] ?? {})) {
            t[r] = (t[r] ?? 0) + d;
            if (d > 0) {
              runs[r] = (runs[r] ?? 0) + 1;
            }
          }
        }
        return {
          itemsWithMore: Object.fromEntries(
            Object.entries(runs).sort((a, b) => b[1] - a[1])
          ),
          net: Object.fromEntries(
            Object.entries(t).sort((a, b) => b[1] - a[1])
          ),
        };
      };
      summary[set][kind] = {
        attempted: ks.length,
        built: ks.filter((i) => i.path).length,
        cognitiveAfter: dist(ok.map((i) => i.cognitive.after)),
        cognitiveBefore: dist(ok.map((i) => i.cognitive.before)),
        cognitiveChange: dist(
          ok
            .filter(
              (i) => i.cognitive.after !== null && i.cognitive.before !== null
            )
            .map((i) => i.cognitive.after - i.cognitive.before)
        ),
        cognitiveChangeWithHelper: dist(
          ok
            .filter(
              (i) => i.cognitive.after !== null && i.cognitive.before !== null
            )
            .map(
              (i) =>
                i.cognitive.after +
                (i.cognitive.helper ?? 0) -
                i.cognitive.before
            )
        ),
        cognitiveHelper: dist(ok.map((i) => i.cognitive.helper)),
        fix: Object.fromEntries(
          Object.keys(fixPaths).map((k) => [
            k,
            {
              conditionalsBack: ok.filter(
                (i) => (i.fix?.[k]?.conditionalsAdded ?? 0) > 0
              ).length,
              markersLost: ok.filter((i) => i.fix?.[k]?.markersLost).length,
              nestedBack: ok.filter((i) => (i.fix?.[k]?.nestedBack ?? 0) > 0)
                .length,
              parseErrors: ok.filter((i) => i.fix?.[k] && !i.fix[k].parses)
                .length,
            },
          ])
        ),
        linesAdded: dist(ok.map((i) => i.lines?.added)),
        nestedNotRemoved: ok.filter(
          (i) => i.nestedRemoved !== undefined && i.nestedRemoved < 1
        ).length,
        parses: ok.length,
        presets: {
          biome: ruleTotals("biome"),
          eslint: ruleTotals("eslint"),
          oxlint: ruleTotals("oxlint"),
        },
        signs: countBy(ok, (i) => i.signs),
        signsAny: ok.filter((i) => i.signs.length > 0).length,
        skipped: countBy(
          ks.filter((i) => i.skipped),
          (i) => i.skipped
        ),
      };
    }
    // per tree: which rewrites apply
    const trees = new Map();
    for (const i of pick) {
      const k = `${i.repo}:${i.file}:${i.line}`;
      if (!trees.has(k)) {
        trees.set(k, {
          kinds: [],
          position: i.position,
          rewriteClass: i.rewriteClass,
        });
      }
      if (i.parses) {
        trees.get(k).kinds.push(i.kind);
      }
    }
    summary[set].trees = {
      noStatementRewrite: [...trees.values()].filter(
        (t) =>
          !t.kinds.some((k) =>
            ["early-return", "let-if", "if-statement"].includes(k)
          )
      ).length,
      noRewriteAtAll: [...trees.values()].filter((t) => t.kinds.length === 0)
        .length,
      total: trees.size,
      withKinds: countBy([...trees.values()], (t) =>
        t.kinds.slice().sort().join("+")
      ),
    };
  }
  const result = {
    formatter: {
      status: fr.status,
      stderr: lib.scrub(fr.stderr.slice(0, 500)),
    },
    generated: new Date().toISOString(),
    note: "See the header of nested-ternaries-rewrite.cjs. One copy per (tree, rewrite). cognitive: the enclosing function's sonarjs score before and after (the helper's score apart); linesAdded: after Oxfmt on both copies; presets: per rule, reports on the rewrite minus reports on the original (itemsWithMore: rewrites that add at least one); fix: after each `ultracite fix` path on both copies, rewrites where a nested ternary came back (nestedBack) or the fix added conditionals (conditionalsBack) relative to the same path on the original; signs: static signs that the rewrite can change behaviour.",
    repos: Object.fromEntries(names.map((n) => [n, lib.shaOf(n)])),
    summary,
    tools: lib.toolVersions(),
  };
  lib.writeJson(join(lib.RESULTS_DIR, "rewrite.json"), result);
  rmSync(CONFIGS, { force: true, recursive: true });
  for (const [kind, s] of Object.entries(summary.source)) {
    if (kind === "trees") {
      continue;
    }
    console.log(
      `${kind}: built ${s.built}/${s.attempted}, parses ${s.parses}, lines +${s.linesAdded?.median}, cog ${s.cognitiveBefore?.median}->${s.cognitiveAfter?.median} (helper ${s.cognitiveHelper?.median}); ox ${JSON.stringify(s.presets.oxlint.itemsWithMore)}; es ${JSON.stringify(s.presets.eslint.itemsWithMore)}; fix ${JSON.stringify(s.fix)}; signs ${JSON.stringify(s.signs)}; skipped ${JSON.stringify(s.skipped)}`
    );
  }
  console.log(JSON.stringify(summary.source.trees));
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
