// The cost of converting: every function declaration `func-style` reports, converted on a copy the
// way an autofix or a careful person would, then measured.
//
// Conversion (per declaration, from the census's facts):
//   arrow                 `const f = (…) => {…};` (and `export const`, `async`, type parameters,
//                         `<T,>` in .tsx, return type kept); `let` if the binding is reassigned
//   function expression   `const f = function f(…) {…};` when the body uses `this`, `arguments` or
//                         `new.target`, has a `this` parameter, is called with `new`, used with
//                         `instanceof` or `.prototype` (in its file or by an importer), or is a
//                         generator; named, because func-names is on in the same presets
//   left alone            `export default function` and overloads (func-style doesn't report
//                         them), and declarations merged with a namespace (a const can't merge)
// Then, on the converted copy: every file is parsed again (typescript-estree and TypeScript); the
// census's use-before-define analysis runs again, and every new candidate that points at a
// converted binding gets its runtime class (a TDZ crash at module evaluation or when a function
// runs, or a report that's harmless at runtime); Oxlint's func-style and no-use-before-define run
// on the converted and the reordered copies.
//
// Reordering: in every statement list (the module, function bodies, blocks, namespaces) of a
// converted file, statements are reordered so each binding is defined above every value reference
// to it, which is what no-use-before-define's defaults ask. Only statements with no effects when
// they run may move: function bindings, declarations whose initializers are literals, functions,
// pure object/array literals, identifiers or member reads, side-effect-free classes and enums,
// and `export { … }` lists, unless they read, while they run, a binding that's assigned somewhere
// (moved across the assignment, or a call that makes it, the read would see another value).
// Everything else keeps its relative order. Kahn's algorithm, smallest original index first; a
// cycle means no valid order (mutual recursion among the movable functions, or a dependency
// through statements that can't move). Moved statements are those outside the longest increasing
// subsequence of the new order.
//
// Type checks: each corpus repo's own tsconfig, before, converted and converted + reordered (an
// overlay through the compiler host; nothing installed). Only zod and hono resolve every import.
//
// Usage: node --max-old-space-size=16384 research/corpus/scripts/func-style-convert.cjs [--repos a,b] [--skip-typecheck]
// Writes out/func-style/convert/<repo>.json and results/func-style/convert.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative } = require("node:path");

const lib = require("./func-style-lib.cjs");
const { conversionOf } = require("./func-style-census.cjs");

const ts = lib.dc.ts;
const CENSUS = join(lib.OUT_DIR, "census");
const OUT = join(lib.OUT_DIR, "convert");
const WORK = join(lib.TMP, "convert");
const CONFIGS = join(lib.TMP, "configs-convert");

const TSCONFIG = {
  astro: "packages/astro/tsconfig.json",
  excalidraw: "tsconfig.json",
  hono: "tsconfig.json",
  "next.js": "packages/next/tsconfig.json",
  trpc: "tsconfig.json",
  vite: "packages/vite/tsconfig.base.json",
  vscode: "src/tsconfig.base.json",
  zod: "tsconfig.json",
};

// ── parsing ────────────────────────────────────────────────────────────
const parse = (text, rel) => {
  const r = lib.tsParser.parseForESLint(text, {
    comment: true,
    ecmaFeatures: { jsx: /\.[jt]sx$/.test(rel) },
    ecmaVersion: "latest",
    filePath: rel,
    loc: true,
    range: true,
    sourceType: rel.endsWith(".cjs") ? "script" : "module",
    tokens: true,
  });
  const keys = r.visitorKeys;
  const setParents = (n, parent) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    n.parent = parent;
    for (const k of keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        for (const x of v) {
          setParents(x, n);
        }
      } else if (v && typeof v.type === "string") {
        setParents(v, n);
      }
    }
  };
  setParents(r.ast, null);
  return { ...r, keys };
};
const tsParseErrors = (text, rel) => {
  const kind = rel.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : rel.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : /\.[cm]?js$/.test(rel)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  return (sf.parseDiagnostics ?? []).map((d) => ({
    code: d.code,
    message: ts.flattenDiagnosticMessageText(d.messageText, " "),
  }));
};

// ── conversion ─────────────────────────────────────────────────────────
const findDeclarations = (ast, keys) => {
  const out = [];
  const visit = (n) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    if (n.type === "FunctionDeclaration") {
      out.push(n);
    }
    for (const k of keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        for (const x of v) {
          visit(x);
        }
      } else if (v && typeof v.type === "string") {
        visit(v);
      }
    }
  };
  visit(ast);
  return out;
};
// The text edits that turn one declaration into a variable-bound function. Two edits: the head
// (`async function* name<T>(…): R ` up to the body) and a `;` after the body, so nested
// declarations' edits never overlap. The head edit's `keep` says where the parameters, copied as
// written, land in its text (for mapping positions with mapOffset).
const convertEdits = (fn, text, rel, mode, declKind) => {
  const name = fn.id.name;
  const head = text.slice(fn.range[0], fn.body.range[0]);
  const after = fn.typeParameters?.range[1] ?? fn.id.range[1];
  const open = text.indexOf("(", after);
  const paramsEnd = fn.returnType ? fn.returnType.range[0] : fn.body.range[0];
  const params = text.slice(open, paramsEnd).trimEnd();
  const ret = fn.returnType ? text.slice(...fn.returnType.range) : "";
  let tps = fn.typeParameters ? text.slice(...fn.typeParameters.range) : "";
  const asyncKw = fn.async ? "async " : "";
  let prefix;
  if (mode === "arrow") {
    if (
      /\.[jt]sx$/.test(rel) &&
      fn.typeParameters?.params.length === 1 &&
      !fn.typeParameters.params[0].constraint
    ) {
      tps = tps.replace(/>$/, ",>");
    }
    prefix = `${declKind} ${name} = ${asyncKw}${tps}`;
  } else {
    prefix = `${declKind} ${name} = ${asyncKw}function${fn.generator ? "*" : ""} ${name}${tps}`;
  }
  const replacement = `${prefix}${params}${ret}${mode === "arrow" ? " => " : " "}`;
  void head;
  return [
    {
      end: fn.body.range[0],
      keep: { at: prefix.length, from: open, to: open + params.length },
      start: fn.range[0],
      text: replacement,
    },
    { end: fn.range[1], start: fn.range[1], text: ";" },
  ];
};
const applyEdits = (text, edits) => {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  let out = text;
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
};
// Where a position in the original text is after applyEdits, or null if its text was replaced
// (anything in a converted head but the parameters).
const mapOffset = (edits, pos) => {
  let shift = 0;
  for (const e of edits) {
    if (e.end <= pos) {
      shift += e.text.length - (e.end - e.start);
    } else if (e.start <= pos) {
      if (!e.keep || pos < e.keep.from || pos >= e.keep.to) {
        return null;
      }
      shift += e.start + e.keep.at - e.keep.from;
    }
  }
  return pos + shift;
};
// Offset of each line's start, with ESLint's line breaks (the inventory's `line`s are 1-based).
const lineStarts = (text) => {
  const starts = [0];
  for (const m of text.matchAll(/\r\n|[\r\n\u2028\u2029]/g)) {
    starts.push(m.index + m[0].length);
  }
  return starts;
};

// ── reordering ─────────────────────────────────────────────────────────
const unwrap = (n) => {
  let x = n;
  while (x && lib.WRAPPERS.has(x.type)) {
    x = x.expression;
  }
  return x;
};
const PURE_NEW = new Set([
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "RegExp",
  "Error",
  "Date",
  "URL",
]);
const isPure = (n) => {
  const x = unwrap(n);
  if (!x) {
    return true;
  }
  switch (x.type) {
    case "Literal":
    case "Identifier":
    case "ArrowFunctionExpression":
    case "FunctionExpression":
    case "ThisExpression":
      return true;
    case "TemplateLiteral":
      return x.expressions.every(isPure);
    case "MemberExpression":
      return isPure(x.object) && (!x.computed || isPure(x.property));
    case "ArrayExpression":
      return x.elements.every(
        (e) =>
          !e || (e.type === "SpreadElement" ? isPure(e.argument) : isPure(e))
      );
    case "ObjectExpression":
      return x.properties.every((p) =>
        p.type === "SpreadElement"
          ? isPure(p.argument)
          : (!p.computed || isPure(p.key)) && isPure(p.value)
      );
    case "UnaryExpression":
      return x.operator !== "delete" && isPure(x.argument);
    case "BinaryExpression":
    case "LogicalExpression":
      return isPure(x.left) && isPure(x.right);
    case "ConditionalExpression":
      return isPure(x.test) && isPure(x.consequent) && isPure(x.alternate);
    case "ClassExpression":
      return pureClass(x);
    case "NewExpression":
      return (
        x.callee.type === "Identifier" &&
        PURE_NEW.has(x.callee.name) &&
        x.arguments.every(isPure)
      );
    case "CallExpression": {
      const c = x.callee;
      const name =
        c.type === "Identifier"
          ? c.name
          : c.type === "MemberExpression" && !c.computed
            ? `${c.object.name ?? ""}.${c.property.name}`
            : "";
      return (
        ["Symbol", "Symbol.for", "Object.freeze"].includes(name) &&
        x.arguments.every(isPure)
      );
    }
    default:
      return false;
  }
};
const pureClass = (c) =>
  !(c.decorators?.length > 0) &&
  (!c.superClass ||
    ["Identifier", "MemberExpression"].includes(c.superClass.type)) &&
  c.body.body.every(
    (m) =>
      m.type !== "StaticBlock" &&
      !(m.decorators?.length > 0) &&
      !(m.static && m.value && !isPure(m.value)) &&
      !(m.computed && !isPure(m.key))
  );
const siblingsOf = (stmt) =>
  (stmt.parent?.body ?? []).map((x) =>
    x.type === "ExportNamedDeclaration" && x.declaration ? x.declaration : x
  );
const movable = (stmt) => {
  const s =
    stmt.type === "ExportNamedDeclaration" && stmt.declaration
      ? stmt.declaration
      : stmt;
  switch (s.type) {
    case "VariableDeclaration":
      return s.kind !== "var" && s.declarations.every((d) => isPure(d.init));
    case "FunctionDeclaration":
      // overload signatures must stay next to their implementation
      return !siblingsOf(stmt).some(
        (x) => x.type === "TSDeclareFunction" && x.id?.name === s.id?.name
      );
    case "TSDeclareFunction":
      return false;
    case "ClassDeclaration":
      return pureClass(s);
    case "TSEnumDeclaration":
      return s.members.every(
        (m) => !m.initializer || m.initializer.type === "Literal"
      );
    case "ExportNamedDeclaration":
      return !s.source; // `export { a, b }`
    default:
      return false;
  }
};
const statementLists = (ast, keys) => {
  const lists = [];
  const visit = (n) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    if (
      n.type === "Program" ||
      n.type === "BlockStatement" ||
      n.type === "TSModuleBlock" ||
      n.type === "StaticBlock"
    ) {
      lists.push(n);
    }
    for (const k of keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        for (const x of v) {
          visit(x);
        }
      } else if (v && typeof v.type === "string") {
        visit(v);
      }
    }
  };
  visit(ast);
  return lists;
};
// Order one statement list. Returns null when nothing needs to move.
const solveList = (list, sm, text) => {
  const stmts = list.body;
  if (stmts.length < 2) {
    return null;
  }
  const idxOfPos = (pos) => {
    let lo = 0;
    let hi = stmts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (stmts[mid].range[1] <= pos) {
        lo = mid + 1;
      } else if (stmts[mid].range[0] > pos) {
        hi = mid - 1;
      } else {
        return mid;
      }
    }
    return -1;
  };
  // the scope whose variables are declared by this list's statements
  const scopes = new Set();
  const owner = list.type === "Program" ? list : list.parent;
  for (const s of sm.scopes) {
    if (s.block === owner || s.block === list) {
      scopes.add(s);
    }
  }
  const deps = stmts.map(() => new Set());
  const hard = new Set(); // "j>k": a reference evaluated when statement k runs
  let reported = 0;
  for (const scope of scopes) {
    for (const v of scope.variables) {
      const def = v.defs[0];
      if (
        !def ||
        def.type === "ImportBinding" ||
        def.type === "Parameter" ||
        def.type === "Type"
      ) {
        continue;
      }
      const j = idxOfPos(def.name.range[0]);
      if (j === -1) {
        continue;
      }
      for (const r of v.references) {
        if (r.init || (r.isTypeReference && !r.isValueReference)) {
          continue;
        }
        const k = idxOfPos(r.identifier.range[0]);
        if (k === -1 || k === j) {
          continue;
        }
        deps[k].add(j);
        if (!lib.isFromSeparateExecutionContext(r)) {
          hard.add(`${j}>${k}`);
        }
        if (k < j) {
          reported++;
        }
      }
    }
  }
  if (reported === 0) {
    return null;
  }
  // statements that read, while they run, a binding assigned anywhere (`b = 2`, `b++`, in this
  // list or not): only statements that can't move assign or call, so these keep their place
  // among them. Reads inside functions and instance fields run later; `export { b }` reads nothing.
  const listScope = sm.acquire(list, true) ?? sm.acquire(owner, true);
  const runsWithList = (r) => {
    for (let s = r.from; s; s = s.upper) {
      if (s === listScope) {
        return true;
      }
      if (
        s.type === "function" ||
        (s.type === "class-field-initializer" && !s.block.parent?.static)
      ) {
        return false;
      }
    }
    return false;
  };
  const readsReassigned = new Set();
  for (const s of sm.scopes) {
    if (s.block.range[1] < list.range[0] || s.block.range[0] > list.range[1]) {
      continue;
    }
    for (const r of s.references) {
      if (
        !r.resolved ||
        !r.isRead() ||
        (r.isTypeReference && !r.isValueReference) ||
        r.identifier.parent?.type === "ExportSpecifier" ||
        !r.resolved.references.some((w) => w.isWrite() && !w.init) ||
        !runsWithList(r)
      ) {
        continue;
      }
      const k = idxOfPos(r.identifier.range[0]);
      if (k !== -1) {
        readsReassigned.add(k);
      }
    }
  }
  const mov = stmts.map((s, i) => movable(s) && !readsReassigned.has(i));
  const n = stmts.length;
  // overload signatures and their implementation move as one: every member points at the group's
  // first statement, and the group is expanded again in the output
  const decl = (x) =>
    x.type === "ExportNamedDeclaration" && x.declaration ? x.declaration : x;
  const glue = [...Array(n).keys()];
  for (let i = 1; i < n; i++) {
    const a = decl(stmts[i - 1]);
    const b = decl(stmts[i]);
    if (
      a.type === "TSDeclareFunction" &&
      (b.type === "TSDeclareFunction" || b.type === "FunctionDeclaration") &&
      a.id?.name &&
      a.id.name === b.id?.name
    ) {
      glue[i] = glue[i - 1];
    }
  }
  const rep = (i) => glue[i];
  const chainEdges = [];
  let prevImm = -1;
  for (let i = 0; i < n; i++) {
    if (rep(i) !== i) {
      continue;
    }
    const groupMovable = [...Array(n).keys()]
      .filter((x) => rep(x) === i)
      .every((x) => mov[x]);
    if (!groupMovable) {
      if (prevImm !== -1) {
        chainEdges.push([prevImm, i]);
      }
      prevImm = i;
    }
  }
  const depEdges = [];
  for (let k = 0; k < n; k++) {
    for (const j of deps[k]) {
      if (rep(j) !== rep(k)) {
        depEdges.push([rep(j), rep(k), hard.has(`${j}>${k}`)]);
      }
    }
  }
  const reps = [...Array(n).keys()].filter((i) => rep(i) === i);
  const expand = (order) =>
    order.flatMap((r) => [...Array(n).keys()].filter((x) => rep(x) === r));
  const kahn = (edges) => {
    const succ = stmts.map(() => new Set());
    const indeg = new Array(n).fill(0);
    for (const [a, b] of edges) {
      if (a !== b && !succ[a].has(b)) {
        succ[a].add(b);
        indeg[b]++;
      }
    }
    const order = [];
    const ready = [];
    for (const i of reps) {
      if (indeg[i] === 0) {
        ready.push(i);
      }
    }
    while (ready.length) {
      ready.sort((a, b) => a - b);
      const x = ready.shift();
      order.push(x);
      for (const y of succ[x]) {
        indeg[y]--;
        if (indeg[y] === 0) {
          ready.push(y);
        }
      }
    }
    return {
      complete: order.length === reps.length,
      order: expand(order),
      succ,
    };
  };
  const lines = (i) => stmts[i].loc.end.line - stmts[i].loc.start.line + 1;
  let { complete, order, succ } = kahn([...depEdges, ...chainEdges]);
  let failure = null;
  if (!complete) {
    // strongly connected components; a component of movable statements alone is mutual
    // recursion, one that includes an immovable statement is an evaluation-order dependency
    const comp = new Array(n).fill(-1);
    {
      let index = 0;
      const idx = new Array(n).fill(-1);
      const low = new Array(n).fill(0);
      const st = [];
      const on = new Array(n).fill(false);
      let c = 0;
      const strong = (v) => {
        idx[v] = index;
        low[v] = index;
        index++;
        st.push(v);
        on[v] = true;
        for (const w of succ[v]) {
          if (idx[w] === -1) {
            strong(w);
            low[v] = Math.min(low[v], low[w]);
          } else if (on[w]) {
            low[v] = Math.min(low[v], idx[w]);
          }
        }
        if (low[v] === idx[v]) {
          let w;
          do {
            w = st.pop();
            on[w] = false;
            comp[w] = c;
          } while (w !== v);
          c++;
        }
      };
      for (let v = 0; v < n; v++) {
        if (idx[v] === -1) {
          strong(v);
        }
      }
    }
    const members = new Map();
    for (const v of reps) {
      (members.get(comp[v]) ?? members.set(comp[v], []).get(comp[v])).push(v);
    }
    const cyclic = [...members.values()].filter((m) => m.length > 1);
    const reasons = cyclic.map((m) =>
      m.every((v) => mov[v]) ? "mutual-recursion" : "evaluation-order"
    );
    // best effort: drop the deferred references inside each component (they stay reported;
    // nothing reads them while the module or block runs) and order the rest. A cycle of
    // references evaluated on the spot can't be broken this way.
    const kept = depEdges.filter(
      ([a, b, h]) =>
        h || comp[a] !== comp[b] || members.get(comp[a]).length === 1
    );
    const best = kahn([...kept, ...chainEdges]);
    if (!best.complete) {
      return {
        reason: "evaluation-order",
        reported,
        solvable: false,
        movedLines: 0,
        movedStatements: 0,
        noBestEffort: true,
      };
    }
    order = best.order;
    const pos = new Map(order.map((v, p) => [v, p]));
    const residual = depEdges.filter(
      ([a, b]) => pos.get(a) > pos.get(b)
    ).length;
    failure = {
      reason: reasons.includes("evaluation-order")
        ? "evaluation-order"
        : "mutual-recursion",
      residualEdges: residual,
      stuck: cyclic.reduce((s, m) => s + m.length, 0),
      stuckNames: cyclic
        .flat()
        .slice(0, 6)
        .map((i) => {
          const st0 =
            stmts[i].type === "ExportNamedDeclaration"
              ? (stmts[i].declaration ?? stmts[i])
              : stmts[i];
          return st0.id?.name ?? st0.declarations?.[0]?.id?.name ?? st0.type;
        }),
    };
  }
  // what stays put: the heaviest subsequence of the new order that's increasing in original
  // index, weighted by lines (so the fewest lines move for this order)
  const m = order.length;
  const best = new Array(m).fill(0);
  const back = new Array(m).fill(-1);
  for (let p = 0; p < m; p++) {
    best[p] = lines(order[p]);
    for (let q = 0; q < p; q++) {
      if (order[q] < order[p] && best[q] + lines(order[p]) > best[p]) {
        best[p] = best[q] + lines(order[p]);
        back[p] = q;
      }
    }
  }
  let top = 0;
  for (let p = 1; p < m; p++) {
    if (best[p] > best[top]) {
      top = p;
    }
  }
  const keep = new Set();
  for (let p = m ? top : -1; p !== -1; p = back[p]) {
    keep.add(order[p]);
  }
  const moved = order.filter((i) => !keep.has(i));
  return {
    ...(failure ?? {}),
    movedLines: moved.reduce((s, i) => s + lines(i), 0),
    movedStatements: moved.length,
    order,
    reported,
    solvable: failure === null,
    text: rebuildList(list, stmts, order, text),
    range: listRange(list, stmts, text),
  };
};
// The text a statement list's chunks span, and each chunk (a statement with its leading comments).
const lineStart = (text, pos) => text.lastIndexOf("\n", pos - 1) + 1;
const chunkStarts = (list, stmts, text) => {
  const open = list.type === "Program" ? 0 : list.range[0] + 1;
  const starts = [];
  for (let i = 0; i < stmts.length; i++) {
    const floor = i === 0 ? open : stmts[i - 1].range[1];
    if (i === 0) {
      const ls = lineStart(text, stmts[0].range[0]);
      starts.push(ls >= floor ? ls : stmts[0].range[0]);
      continue;
    }
    // leading comments: from the line after the previous statement ends
    const prevEnd = stmts[i - 1].range[1];
    const nl = text.indexOf("\n", prevEnd);
    const from =
      nl === -1 || nl >= stmts[i].range[0] ? stmts[i].range[0] : nl + 1;
    // skip blank lines so they stay where they are
    let s = from;
    while (s < stmts[i].range[0] && /\s/.test(text[s])) {
      s++;
    }
    const ls = lineStart(text, Math.min(s, stmts[i].range[0]));
    starts.push(ls >= floor ? ls : Math.min(s, stmts[i].range[0]));
  }
  return starts;
};
const listRange = (list, stmts, text) => {
  const starts = chunkStarts(list, stmts, text);
  const last = stmts.at(-1).range[1];
  const nl = text.indexOf("\n", last);
  const close = list.type === "Program" ? text.length : list.range[1] - 1;
  const end = Math.min(nl === -1 ? text.length : nl, close);
  return [starts[0], end];
};
const rebuildList = (list, stmts, order, text) => {
  const starts = chunkStarts(list, stmts, text);
  const [, end] = listRange(list, stmts, text);
  const chunks = stmts.map((s, i) => {
    const to = i + 1 < stmts.length ? starts[i + 1] : end;
    return text.slice(starts[i], to).replace(/\s+$/, "");
  });
  return order.map((i) => chunks[i]).join("\n\n");
};
// Reorder every list that needs it (outermost first; inner lists are rebuilt within).
const reorderText = (text, rel) => {
  let current = text;
  const results = [];
  for (let pass = 0; pass < 6; pass++) {
    let p;
    try {
      p = parse(current, rel);
    } catch (error) {
      return {
        error: String(error.message).slice(0, 200),
        results,
        text: current,
      };
    }
    const lists = statementLists(p.ast, p.keys);
    let changed = false;
    // innermost lists first, then apply one non-overlapping set per pass
    const solved = [];
    for (const list of lists) {
      const r = solveList(list, p.scopeManager, current);
      if (r) {
        r.kind =
          list.type === "Program"
            ? "module"
            : list.parent && lib.FUNCTION_TYPES.has(list.parent.type)
              ? "function-body"
              : list.type;
        r.line = list.loc.start.line;
        solved.push(r);
      }
    }
    if (pass === 0) {
      results.push(
        ...solved.map(({ text: _t, order: _o, range: _r, ...rest }) => rest)
      );
    }
    const applicable = solved
      .filter((r) => r.movedStatements > 0)
      .sort((a, b) => b.range[0] - a.range[0]);
    const taken = [];
    for (const r of applicable) {
      if (taken.some((t) => !(r.range[1] <= t[0] || r.range[0] >= t[1]))) {
        continue;
      }
      taken.push(r.range);
      current =
        current.slice(0, r.range[0]) + r.text + current.slice(r.range[1]);
      changed = true;
    }
    if (!changed) {
      break;
    }
  }
  return { results, text: current };
};

// ── Oxlint on the copies ───────────────────────────────────────────────
const oxlintCounts = (cwd, files) => {
  const cfg = lib.writeOxlintRules(
    CONFIGS,
    "convert",
    {
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      "no-use-before-define": "error",
    },
    { plugins: ["eslint"] }
  );
  const diags = lib.runOxlint({ configFile: cfg, cwd, files });
  const by = (rule) => diags.filter((d) => d.rule === rule);
  return {
    files: new Set(by("no-use-before-define").map((d) => d.file)),
    funcStyle: by("func-style").length,
    ubd: by("no-use-before-define").length,
    ubdRows: by("no-use-before-define"),
  };
};

// ── type-check overlay (sort-keys-fixes.cjs's) ─────────────────────────
const typecheck = (name, overlay) => {
  const root = lib.getRepo(name).root;
  const { files } = lib.collect(name);
  const configPath = join(root, TSCONFIG[name]);
  if (!existsSync(configPath)) {
    return { error: `no ${TSCONFIG[name]}` };
  }
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    dirname(configPath)
  );
  const options = {
    ...parsed.options,
    composite: false,
    declaration: false,
    incremental: false,
    noEmit: true,
    tsBuildInfoFile: undefined,
  };
  const map = new Map();
  for (const [rel, text] of overlay ?? []) {
    map.set(join(root, rel), text);
  }
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  host.readFile = (f) => map.get(f) ?? readFile(f);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (f, lang, onError, shouldCreate) =>
    map.has(f)
      ? ts.createSourceFile(f, map.get(f), lang, true)
      : getSourceFile(f, lang, onError, shouldCreate);
  const program = ts.createProgram({
    host,
    options,
    rootNames: files.map((f) => join(root, f)),
  });
  return ts.getPreEmitDiagnostics(program).map((d) => ({
    code: d.code,
    file: d.file ? relative(root, d.file.fileName) : null,
    line: d.file
      ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
      : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 300),
  }));
};
const added = (before, after) => {
  const key = (d) => `${d.file}|${d.code}`;
  const counts = new Map();
  for (const d of before) {
    counts.set(key(d), (counts.get(key(d)) ?? 0) + 1);
  }
  const out = [];
  for (const d of after) {
    const k = key(d);
    if ((counts.get(k) ?? 0) > 0) {
      counts.set(k, counts.get(k) - 1);
    } else {
      out.push(d);
    }
  }
  return out;
};
const UNRESOLVED = new Set([2307, 2688, 2875, 7016, 2792]);

// ── per repo ───────────────────────────────────────────────────────────
const convertRepo = (name) => {
  const root = lib.getRepo(name).root;
  const fns = lib
    .readJsonl(join(CENSUS, `${name}.functions.jsonl`))
    .filter((f) => !f.test && f.type === "FunctionDeclaration");
  const byFile = new Map();
  for (const f of fns) {
    (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)).push(f);
  }
  const srcFiles = lib.collect(name).files;
  const dirs = {
    converted: join(WORK, "converted", name),
    original: join(WORK, "original", name),
    reordered: join(WORK, "reordered", name),
  };
  for (const d of Object.values(dirs)) {
    rmSync(d, { force: true, recursive: true });
  }
  const files = [];
  const overlayConverted = new Map();
  const overlayReordered = new Map();
  const decisions = {};
  const newRefs = [];
  const reorder = [];
  const parseFailures = [];
  for (const rel of srcFiles) {
    const text = readFileSync(join(root, rel), "utf8");
    for (const d of Object.values(dirs)) {
      mkdirSync(dirname(join(d, rel)), { recursive: true });
    }
    writeFileSync(join(dirs.original, rel), text);
    const list = byFile.get(rel) ?? [];
    const todo = list.filter((f) => {
      const c = conversionOf(f);
      decisions[c] = (decisions[c] ?? 0) + 1;
      return c === "arrow" || c.startsWith("function-expression");
    });
    if (todo.length === 0) {
      writeFileSync(join(dirs.converted, rel), text);
      writeFileSync(join(dirs.reordered, rel), text);
      continue;
    }
    const p = parse(text, rel);
    const decls = findDeclarations(p.ast, p.keys);
    const edits = [];
    const converted = new Set();
    for (const f of todo) {
      const node = decls.find(
        (d) => d.loc.start.line === f.line && d.loc.start.column === f.column
      );
      if (!node || !node.id || !node.body) {
        continue;
      }
      const mode = conversionOf(f) === "arrow" ? "arrow" : "function";
      edits.push(
        ...convertEdits(
          node,
          text,
          rel,
          mode,
          (f.reassigned ?? 0) > 0 ? "let" : "const"
        )
      );
      converted.add(`${node.id.name}@${node.id.loc.start.line}`);
    }
    const out = applyEdits(text, edits);
    writeFileSync(join(dirs.converted, rel), out);
    overlayConverted.set(rel, out);
    // parse checks
    const before = lib.inventory(text, rel);
    const after = lib.inventory(out, rel);
    const tsErrBefore = tsParseErrors(text, rel).length;
    const tsErrAfter = tsParseErrors(out, rel);
    if (after.error || tsErrAfter.length > tsErrBefore) {
      parseFailures.push({
        error: after.error ?? tsErrAfter[0]?.message,
        file: rel,
      });
    }
    // new use-before-define candidates that point at a converted binding, matched to the original
    // candidates by position in the converted text (the head edits shift columns on their line)
    const startsBefore = lineStarts(text);
    const startsAfter = lineStarts(out);
    const beforeByPos = new Map();
    for (const u of before.ubd ?? []) {
      if (u.cls === "type-only") {
        continue;
      }
      const pos = mapOffset(edits, startsBefore[u.line - 1] + u.column);
      if (pos !== null) {
        beforeByPos.set(pos, u);
      }
    }
    for (const u of after.ubd ?? []) {
      if (u.cls === "type-only" || u.cls === "export-specifier") {
        continue;
      }
      if (!converted.has(`${u.name}@${u.defLine}`)) {
        continue;
      }
      newRefs.push({
        before:
          beforeByPos.get(startsAfter[u.line - 1] + u.column)?.cls ?? null,
        cls: u.cls,
        file: rel,
        line: u.line,
        moduleBinding: u.moduleBinding,
        name: u.name,
        sameContext: u.sameContext,
        ...(u.callback ? { callback: u.callback } : {}),
      });
    }
    // reorder
    const r = reorderText(out, rel);
    writeFileSync(join(dirs.reordered, rel), r.text);
    overlayReordered.set(rel, r.text);
    const afterReorder = r.error
      ? { error: r.error }
      : lib.inventory(r.text, rel);
    if (afterReorder.error) {
      parseFailures.push({
        error: afterReorder.error,
        file: rel,
        stage: "reordered",
      });
    }
    const lists = r.results;
    if (lists.length) {
      reorder.push({
        file: rel,
        lists,
        remainingTdz: (afterReorder.ubd ?? []).filter((u) => /^tdz/.test(u.cls))
          .length,
      });
    }
    files.push(rel);
  }
  // Oxlint before, converted and reordered (only the files that were converted)
  const ox = {};
  for (const [k, d] of Object.entries(dirs)) {
    ox[k] = files.length
      ? oxlintCounts(d, files)
      : { files: new Set(), funcStyle: 0, ubd: 0, ubdRows: [] };
  }
  // tsc
  let typecheckResult = null;
  if (!lib.flag("skip-typecheck") && TSCONFIG[name]) {
    const t0 = Date.now();
    const base = typecheck(name, null);
    if (base.error) {
      typecheckResult = { error: base.error };
    } else {
      const conv = typecheck(name, overlayConverted);
      const reord = typecheck(name, overlayReordered);
      const summ = (after) => {
        const add = added(base, after);
        const byCode = {};
        for (const d of add) {
          byCode[d.code] = (byCode[d.code] ?? 0) + 1;
        }
        return {
          added: add.length,
          byCode,
          examples: add.slice(0, 12),
          removed: added(after, base).length,
        };
      };
      typecheckResult = {
        before: base.length,
        beforeUnresolved: base.filter((d) => UNRESOLVED.has(d.code)).length,
        converted: summ(conv),
        reordered: summ(reord),
        seconds: Math.round((Date.now() - t0) / 1000),
        tsconfig: TSCONFIG[name],
      };
    }
  }
  return {
    decisions,
    files,
    newRefs,
    ox,
    parseFailures,
    reorder,
    typecheck: typecheckResult,
  };
};

const countBy = (xs, f) => {
  const out = {};
  for (const x of xs) {
    const k = f(x);
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};

const summariseRepo = (name, r) => {
  const lists = r.reorder.flatMap((f) =>
    f.lists.map((l) => ({ ...l, file: f.file }))
  );
  const filesNeeding = r.reorder.filter((f) => f.lists.length > 0);
  const filesUnsolvable = r.reorder.filter((f) =>
    f.lists.some((l) => !l.solvable)
  );
  const solvedLists = lists.filter((l) => l.solvable);
  const partialLists = lists.filter((l) => !l.solvable);
  // files whose Oxlint no-use-before-define count rose with the conversion
  const before = r.ox.original.ubdRows;
  const after = r.ox.converted.ubdRows;
  const perFile = (rows) => countBy(rows, (d) => d.file);
  const b = perFile(before);
  const a = perFile(after);
  const rose = Object.keys(a).filter((f) => (a[f] ?? 0) > (b[f] ?? 0));
  return {
    convertedFiles: r.files.length,
    decisions: r.decisions,
    newReferences: {
      total: r.newRefs.length,
      byClass: countBy(r.newRefs, (u) => u.cls),
      byBeforeAndAfter: countBy(
        r.newRefs,
        (u) => `${u.before ?? "not a candidate"} -> ${u.cls}`
      ),
      alreadyCandidates: r.newRefs.filter((u) => u.before).length,
      crashAtImport: r.newRefs.filter(
        (u) =>
          u.moduleBinding &&
          /^tdz-(?:module-evaluation|indirect|callback)$/.test(u.cls)
      ).length,
      crashWhenCalled: r.newRefs.filter((u) => u.cls === "tdz-same-scope")
        .length,
      crashAtImportFiles: new Set(
        r.newRefs
          .filter(
            (u) =>
              u.moduleBinding &&
              /^tdz-(?:module-evaluation|indirect|callback)$/.test(u.cls)
          )
          .map((u) => u.file)
      ).size,
      crashWhenCalledFiles: new Set(
        r.newRefs.filter((u) => u.cls === "tdz-same-scope").map((u) => u.file)
      ).size,
      examples: r.newRefs
        .filter((u) => /^tdz/.test(u.cls))
        .slice(0, 8)
        .map((u) => ({
          ...u,
          permalink: lib.permalink(name, u.file, u.line),
        })),
    },
    oxlint: {
      original: {
        funcStyle: r.ox.original.funcStyle,
        ubd: r.ox.original.ubd,
        ubdFiles: r.ox.original.files.size,
      },
      converted: {
        funcStyle: r.ox.converted.funcStyle,
        ubd: r.ox.converted.ubd,
        ubdFiles: r.ox.converted.files.size,
      },
      reordered: {
        funcStyle: r.ox.reordered.funcStyle,
        ubd: r.ox.reordered.ubd,
        ubdFiles: r.ox.reordered.files.size,
      },
      filesWhereUbdRose: rose.length,
    },
    parseFailures: r.parseFailures,
    reorder: {
      filesWithReports: filesNeeding.length,
      filesUnsolvable: filesUnsolvable.length,
      filesSolvable: filesNeeding.length - filesUnsolvable.length,
      lists: lists.length,
      listsByKind: countBy(lists, (l) => l.kind),
      unsolvableLists: lists.filter((l) => !l.solvable).length,
      unsolvableByReason: countBy(
        lists.filter((l) => !l.solvable),
        (l) => l.reason
      ),
      movedStatements: solvedLists.reduce((s, l) => s + l.movedStatements, 0),
      movedLines: solvedLists.reduce((s, l) => s + l.movedLines, 0),
      movedStatementsBestEffort: partialLists.reduce(
        (s, l) => s + l.movedStatements,
        0
      ),
      movedLinesBestEffort: partialLists.reduce((s, l) => s + l.movedLines, 0),
      residualReferences: partialLists.reduce(
        (s, l) => s + (l.residualEdges ?? 0),
        0
      ),
      remainingTdzAfterReorder: r.reorder.reduce(
        (s, f) => s + f.remainingTdz,
        0
      ),
      unsolvableExamples: lists
        .filter((l) => !l.solvable)
        .slice(0, 8)
        .map((l) => ({
          file: l.file,
          line: l.line,
          names: l.stuckNames,
          permalink: lib.permalink(name, l.file, l.line),
          reason: l.reason,
        })),
    },
    typecheck: r.typecheck,
  };
};

const main = () => {
  const names = lib.selectedRepos([...lib.CORE, ...lib.REACT]);
  lib.checkPinned(names);
  const previous = lib.readJson(join(lib.RESULTS_DIR, "convert.json"), {
    repos: {},
  });
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of func-style-convert.cjs. Source files only. newReferences are use-before-define candidates (func-style-lib.cjs) that appear after conversion and point at a converted binding; crashAtImport counts module-level tdz-module-evaluation, tdz-indirect and tdz-callback; crashWhenCalled counts tdz-same-scope (a nested declaration used above it in the same function). reorder counts statement lists with a reference above its binding after conversion (including references that were already reported before).",
    repos: { ...previous.repos },
    tools: lib.toolVersions(),
  };
  for (const name of names) {
    const t0 = Date.now();
    const r = convertRepo(name);
    lib.writeJson(join(OUT, `${name}.json`), {
      newRefs: r.newRefs,
      parseFailures: r.parseFailures,
      reorder: r.reorder,
      typecheck: r.typecheck,
    });
    const s = summariseRepo(name, r);
    s.seconds = Math.round((Date.now() - t0) / 1000);
    result.repos[name] = s;
    console.log(
      `${name}: ${s.convertedFiles} files; decisions ${JSON.stringify(s.decisions)}; new refs ${s.newReferences.total} ${JSON.stringify(s.newReferences.byClass)}; import crash ${s.newReferences.crashAtImport}, call crash ${s.newReferences.crashWhenCalled}; oxlint ubd ${s.oxlint.original.ubd}→${s.oxlint.converted.ubd}→${s.oxlint.reordered.ubd}, func-style ${s.oxlint.original.funcStyle}→${s.oxlint.converted.funcStyle}; reorder files ${s.reorder.filesWithReports} (unsolvable ${s.reorder.filesUnsolvable} ${JSON.stringify(s.reorder.unsolvableByReason)}), moved ${s.reorder.movedStatements} stmts/${s.reorder.movedLines} lines; parse failures ${s.parseFailures.length}; tsc ${s.typecheck ? `+${s.typecheck.converted?.added}/+${s.typecheck.reordered?.added} ${JSON.stringify(s.typecheck.converted?.byCode)}` : "-"} (${s.seconds}s)`
    );
  }
  lib.writeJson(join(lib.RESULTS_DIR, "convert.json"), result);
  rmSync(CONFIGS, { force: true, recursive: true });
};

module.exports = {
  convertEdits,
  applyEdits,
  lineStarts,
  mapOffset,
  parse,
  reorderText,
  solveList,
  movable,
};

if (require.main === module) {
  main();
}
