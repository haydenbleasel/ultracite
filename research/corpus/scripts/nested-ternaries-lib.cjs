// Shared definitions for the nested-ternaries scripts (nested-ternaries-*.cjs): how the conditional
// operator is used, what the rules about it report, and what rewriting a nested ternary costs.
//
// The rules, and what Ultracite does with them (read from packages/cli/config by
// nested-ternaries-rules.cjs, which fails if these settings drift):
//   no-nested-ternary                  Oxlint core and ESLint core "error"
//   unicorn/no-nested-ternary          off in Oxlint core and ESLint core (its fix adds parentheses
//                                      the formatter strips, so `fix` ping-pongs)
//   no-ternary                         off
//   sonarjs/no-nested-conditional      ESLint core (every sonarjs rule) and Oxlint js-plugins
//   noNestedTernary                    Biome core (style)
//   unicorn/prefer-ternary             Oxlint core "error"; ESLint core ["error", "always",
//                                      { checkComputedMemberAccess, checkVaryingBase }]
//   context                            no-unneeded-ternary, unicorn/prefer-logical-operator-over-
//                                      ternary, no-negated-condition (and unicorn's), no-else-return,
//                                      no-lonely-if (and unicorn's), curly; ESLint core also
//                                      unicorn/prefer-minimal-ternary and
//                                      unicorn/no-unnecessary-nested-ternary; Biome's
//                                      noUselessTernary, noNegationElse, noUselessElse,
//                                      useCollapsedIf, useCollapsedElseIf, useBlockStatements
//   cognitive complexity               sonarjs/cognitive-complexity 20 (ESLint core, Oxlint
//                                      js-plugins), Biome's noExcessiveCognitiveComplexity 20
//
// The inventory runs one ESLint `Linter` pass per file with the TypeScript parser: a local census
// rule that records every conditional expression (where it sits in its ternary tree, its position,
// its tests and branches), every TypeScript conditional type, every if/else chain and every
// function, and the real ESLint rules in the same pass, so their reports join to the inventory
// exactly. sonarjs/cognitive-complexity runs at 0, so every function that scores reports its score.
//
// Terms (also in results/nested-ternaries/REPORT.md):
//   ternary tree   a maximal group of conditional expressions joined through a direct test,
//                  consequent or alternate (parentheses aren't nodes, so `a ? x : (b ? y : z)` is
//                  one tree; a TypeScript wrapper such as `as` or `!` ends the tree, as it does for
//                  ESLint's rule). A tree with two or more conditionals is a nested ternary.
//   chain          every nested conditional is in the alternate: `a ? x : b ? y : z`, the shape of
//                  an else-if chain.
//   indirect       a conditional inside another one's branch through other expressions (a call, a
//                  template, `as`): not a tree member, but sonarjs reports it unless an array,
//                  object, function or JSX container lies between.
//
// Read-only with respect to the clones: files are parsed, never run. Linters, formatters and
// rewrites run on copies under TMP.
"use strict";

// The React codebases from the accessibility post are a separate set. Must be set before
// collect-files.cjs is loaded anywhere in the process.
process.env.CORPUS_REPO_LISTS ??= "repos-accessibility.json";

const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");

const lib = require("./length-lib.cjs");

const HERE = resolve(__dirname, "..");
const TOPIC = "nested-ternaries";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
const HISTORY_DIR = join(HERE, "repos", "history");
// Copies the linters, formatters and rewrites work on. Ultracite's presets ignore `**/out`.
const TMP =
  process.env.NESTED_TERNARIES_TMP ??
  join(tmpdir(), "ultracite-research-nested-ternaries");
const { CLI, ULTRACITE } = lib;

// ── tools ──────────────────────────────────────────────────────────────
const { Linter } = require(require.resolve("eslint", { paths: [CLI] }));
const { builtinRules } = require(
  require.resolve("eslint/use-at-your-own-risk", { paths: [CLI] })
);
const unicornModule = require(
  require.resolve("eslint-plugin-unicorn", { paths: [CLI] })
);
const unicorn = unicornModule.default ?? unicornModule;
const sonarDir = dirname(
  require.resolve("eslint-plugin-sonarjs/package.json", { paths: [CLI] })
);
const sonarjs = require(sonarDir);
const sonarLocation = require(join(sonarDir, "cjs/helpers/location.js"));
const { tsParser } = lib;
const { astUtils } = require("./tools.cjs").load();

const prettierDir = dirname(
  require.resolve("prettier/package.json", { paths: [CLI] })
);
const unicornVersion = JSON.parse(
  readFileSync(
    join(
      dirname(require.resolve("eslint-plugin-unicorn", { paths: [CLI] })),
      "package.json"
    ),
    "utf8"
  )
).version;
const toolVersions = () => ({
  ...lib.toolVersions(),
  "eslint-plugin-unicorn": unicornVersion,
  git: lib
    .spawnSync("git", ["--version"], { encoding: "utf8" })
    .stdout.trim()
    .replace(/^git version /, ""),
  prettier: JSON.parse(readFileSync(join(prettierDir, "package.json"), "utf8"))
    .version,
});

// Ultracite's options (nested-ternaries-rules.cjs checks them against the resolved preset).
const PREFER_TERNARY_OPTIONS = [
  "always",
  { checkComputedMemberAccess: true, checkVaryingBase: true },
];
const PREFER_MINIMAL_OPTIONS = [
  { checkComputedMemberAccess: true, checkVaryingBase: true },
];

// ── node helpers ───────────────────────────────────────────────────────
const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);
const TS_WRAPPERS = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
]);
const isCond = (n) => n?.type === "ConditionalExpression";
const SLOTS = ["test", "consequent", "alternate"];
const slotOf = (node) => {
  const p = node.parent;
  if (!isCond(p)) {
    return null;
  }
  return SLOTS.find((s) => p[s] === node) ?? null;
};
// The node an expression sits in once TypeScript wrappers are peeled.
const outerOf = (node) => {
  let n = node;
  const wraps = [];
  while (
    n.parent &&
    TS_WRAPPERS.has(n.parent.type) &&
    n.parent.expression === n
  ) {
    wraps.push(n.parent.type);
    n = n.parent;
  }
  return { node: n, parent: n.parent, wraps };
};
const enclosingFunction = (node) => {
  for (let n = node.parent; n; n = n.parent) {
    if (FUNCTION_TYPES.has(n.type)) {
      return n;
    }
  }
  return null;
};
const peel = (n) => {
  let x = n;
  while (x && TS_WRAPPERS.has(x.type)) {
    x = x.expression;
  }
  return x;
};
const textOf = (sc, n) => sc.text.slice(n.range[0], n.range[1]);
const squash = (s, max = 120) => s.replace(/\s+/g, " ").trim().slice(0, max);

// Where a tree's root sits. `statement` says whether a statement can replace it in place.
const positionOf = (root) => {
  const { parent, node, wraps } = outerOf(root);
  const p = parent;
  const t = p?.type;
  const pos = (position, extra = {}) => ({
    position,
    wraps: wraps.length,
    ...extra,
  });
  if (!p) {
    return pos("other");
  }
  if (t === "ReturnStatement") {
    return pos("return");
  }
  if (t === "ArrowFunctionExpression" && p.body === node) {
    return pos("arrow-body");
  }
  if (t === "VariableDeclarator" && p.init === node) {
    const decl = p.parent;
    return pos("initializer", {
      declarationKind: decl?.kind ?? null,
      exported: decl?.parent?.type === "ExportNamedDeclaration",
      idType: p.id.type,
      inFor: /^For/.test(decl?.parent?.type ?? ""),
      typed: Boolean(p.id.typeAnnotation),
    });
  }
  if (t === "AssignmentExpression" && p.right === node) {
    return pos(
      p.parent?.type === "ExpressionStatement"
        ? "assignment-statement"
        : "assignment",
      { operator: p.operator }
    );
  }
  if (t === "JSXExpressionContainer") {
    return pos(
      p.parent?.type === "JSXAttribute" ? "jsx-attribute" : "jsx-child"
    );
  }
  if ((t === "CallExpression" || t === "NewExpression") && p.callee !== node) {
    return pos("argument");
  }
  if (t === "CallExpression" || t === "NewExpression") {
    return pos("callee");
  }
  if (t === "TemplateLiteral") {
    return pos("template");
  }
  if (t === "Property" && p.value === node) {
    return pos(
      p.parent?.type === "ObjectPattern" ? "destructuring-default" : "property"
    );
  }
  if (t === "Property") {
    return pos("computed-key");
  }
  if (t === "AssignmentPattern" && p.right === node) {
    // a default: of a parameter (directly or inside a destructured parameter) or in a pattern
    let q = p;
    while (
      q.parent &&
      (q.parent.type === "Property" ||
        q.parent.type === "ObjectPattern" ||
        q.parent.type === "ArrayPattern" ||
        q.parent.type === "AssignmentPattern" ||
        q.parent.type === "TSParameterProperty")
    ) {
      q = q.parent;
    }
    const fn = q.parent;
    const isParam = fn && FUNCTION_TYPES.has(fn.type) && fn.params.includes(q);
    return pos(isParam ? "default-parameter" : "destructuring-default");
  }
  if (
    (t === "PropertyDefinition" || t === "AccessorProperty") &&
    p.value === node
  ) {
    return pos("class-field");
  }
  if (t === "ArrayExpression") {
    return pos("array-element");
  }
  if (t === "ExpressionStatement") {
    return pos("statement");
  }
  if (t === "ThrowStatement") {
    return pos("throw");
  }
  if (t === "SpreadElement" || t === "JSXSpreadAttribute") {
    return pos("spread");
  }
  if (t === "MemberExpression") {
    return pos(p.object === node ? "member-object" : "member-property");
  }
  if (
    t === "IfStatement" ||
    t === "WhileStatement" ||
    t === "DoWhileStatement" ||
    t === "ForStatement" ||
    t === "SwitchStatement" ||
    t === "SwitchCase"
  ) {
    return pos("condition");
  }
  if (t === "ExportDefaultDeclaration") {
    return pos("export-default");
  }
  if (
    t === "BinaryExpression" ||
    t === "LogicalExpression" ||
    t === "UnaryExpression" ||
    t === "AwaitExpression" ||
    t === "YieldExpression" ||
    t === "SequenceExpression" ||
    t === "TaggedTemplateExpression" ||
    t === "ChainExpression"
  ) {
    return pos("operand", { operandOf: t });
  }
  return pos("other", { parentType: t });
};
// Positions where a nested ternary can become early returns, and where it can become statements
// in place (if/else assignments or statements). Everything else needs an extraction.
const EARLY_RETURN = new Set(["return", "arrow-body"]);
const STATEMENT_IN_PLACE = new Set([
  "initializer",
  "assignment-statement",
  "statement",
]);
const rewriteClass = (position, extra = {}) => {
  if (EARLY_RETURN.has(position)) {
    return "early-return";
  }
  if (
    position === "initializer" &&
    extra.idType === "Identifier" &&
    !extra.inFor
  ) {
    return "let-if";
  }
  if (position === "assignment-statement" || position === "statement") {
    return "if-statement";
  }
  return "extraction";
};

// ── tests: one discriminant compared with constants? ───────────────────
const EQ = new Set(["===", "==", "!==", "!="]);
const isConstant = (n) => {
  const x = peel(n);
  if (!x) {
    return null;
  }
  if (x.type === "Literal") {
    if (x.regex) {
      return null;
    }
    return x.value === null ? "null" : typeof x.value;
  }
  if (x.type === "TemplateLiteral" && x.expressions.length === 0) {
    return "string";
  }
  if (x.type === "Identifier" && x.name === "undefined") {
    return "undefined";
  }
  if (
    x.type === "UnaryExpression" &&
    x.operator === "-" &&
    x.argument.type === "Literal" &&
    typeof x.argument.value === "number"
  ) {
    return "number";
  }
  // an enum member or a SHOUTY constant: switch-able, but not a literal key
  if (
    x.type === "MemberExpression" &&
    !x.computed &&
    x.object.type === "Identifier" &&
    /^[A-Z]/.test(x.object.name)
  ) {
    return "member-constant";
  }
  if (x.type === "Identifier" && /^[A-Z][A-Z0-9_]+$/.test(x.name)) {
    return "identifier-constant";
  }
  return null;
};
// `d === c`, `c === d`, `d !== c` (branches swapped), and `d === c1 || d === c2`.
const comparisonOf = (sc, test) => {
  const t = peel(test);
  if (!t) {
    return null;
  }
  if (t.type === "BinaryExpression" && EQ.has(t.operator)) {
    const lc = isConstant(t.left);
    const rc = isConstant(t.right);
    if (rc && !lc) {
      return {
        constants: [rc],
        d: squash(textOf(sc, t.left), 200),
        dNode: t.left,
        negated: t.operator.startsWith("!"),
        op: t.operator,
      };
    }
    if (lc && !rc) {
      return {
        constants: [lc],
        d: squash(textOf(sc, t.right), 200),
        dNode: t.right,
        negated: t.operator.startsWith("!"),
        op: t.operator,
      };
    }
    return null;
  }
  if (t.type === "LogicalExpression" && t.operator === "||") {
    const a = comparisonOf(sc, t.left);
    const b = comparisonOf(sc, t.right);
    if (a && b && a.d === b.d && !a.negated && !b.negated) {
      return {
        constants: [...a.constants, ...b.constants],
        d: a.d,
        dNode: a.dNode,
        multi: true,
        negated: false,
        op: a.op === b.op ? a.op : "mixed",
      };
    }
  }
  return null;
};
const RELATIONAL = new Set(["<", ">", "<=", ">="]);
const thresholdSubject = (sc, test) => {
  const t = peel(test);
  if (t?.type === "BinaryExpression" && RELATIONAL.has(t.operator)) {
    return squash(textOf(sc, t.left), 200);
  }
  return null;
};
// The shape of a tree's tests: lookup (one discriminant, literal keys), switch (one discriminant,
// constants that aren't all literals), thresholds (one subject compared with <, >), or unrelated.
const testShapeOf = (sc, tests) => {
  const comps = tests.map((t) => comparisonOf(sc, t));
  if (comps.every(Boolean)) {
    const ds = new Set(comps.map((c) => c.d));
    if (ds.size === 1) {
      const kinds = comps.flatMap((c) => c.constants);
      const ops = new Set(comps.map((c) => c.op.replace("!", "=")));
      const literalKeys = kinds.every((k) => k === "string" || k === "number");
      const d = comps[0].dNode;
      const dPeeled = peel(d);
      return {
        constants: kinds,
        discriminant: comps[0].d,
        discriminantKind:
          dPeeled.type === "Identifier"
            ? "identifier"
            : dPeeled.type === "MemberExpression"
              ? "member"
              : dPeeled.type === "UnaryExpression" &&
                  dPeeled.operator === "typeof"
                ? "typeof"
                : dPeeled.type === "CallExpression" ||
                    dPeeled.type === "ChainExpression"
                  ? "call-or-chain"
                  : "other",
        looseEquality: ops.has("==") || ops.has("mixed"),
        multiValue: comps.some((c) => c.multi),
        negated: comps.some((c) => c.negated),
        shape: literalKeys ? "lookup" : "switch",
      };
    }
  }
  const subjects = tests.map((t) => thresholdSubject(sc, t));
  if (subjects.every(Boolean) && new Set(subjects).size === 1) {
    return { shape: "thresholds", subject: subjects[0] };
  }
  return { shape: "unrelated" };
};

// ── branches ───────────────────────────────────────────────────────────
// What a leaf branch is, and whether evaluating it eagerly (as a lookup object would) could be
// observed: calls, `new`, `await`, `yield`, assignments, updates, `delete`, tagged templates and
// throws, outside nested functions; member reads can throw on nullish or run a getter.
const LEAF_KINDS = (n) => {
  const x = peel(n);
  switch (x.type) {
    case "Literal":
      return x.regex ? "regex" : x.value === null ? "null" : "literal";
    case "Identifier":
      return x.name === "undefined" ? "undefined" : "identifier";
    case "TemplateLiteral":
      return x.expressions.length === 0 ? "literal" : "template";
    case "MemberExpression":
    case "ChainExpression":
      return x.type === "ChainExpression" &&
        x.expression.type === "CallExpression"
        ? "call"
        : "member";
    case "CallExpression":
      return /^(?:FunctionExpression|ArrowFunctionExpression)$/.test(
        x.callee.type
      )
        ? "iife"
        : "call";
    case "NewExpression":
      return "new";
    case "TaggedTemplateExpression":
      return "call";
    case "AwaitExpression":
      return "await";
    case "JSXElement":
    case "JSXFragment":
      return "jsx";
    case "ArrowFunctionExpression":
    case "FunctionExpression":
      return "function";
    case "ObjectExpression":
      return "object";
    case "ArrayExpression":
      return "array";
    case "UnaryExpression":
      return x.operator === "void" ? "undefined" : "unary";
    case "BinaryExpression":
      return "binary";
    case "LogicalExpression":
      return "logical";
    case "ConditionalExpression":
      return "conditional";
    case "AssignmentExpression":
      return "assignment";
    case "YieldExpression":
      return "yield";
    default:
      return "other";
  }
};
const effectsIn = (node, keys) => {
  const found = {
    assignment: 0,
    await: 0,
    call: 0,
    member: 0,
    new: 0,
    throwIife: 0,
    update: 0,
    yield: 0,
  };
  const visit = (n, inFn) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    if (FUNCTION_TYPES.has(n.type) && n !== node) {
      // a function value isn't run by evaluating it, unless it's an IIFE (handled at the call)
      return;
    }
    switch (n.type) {
      case "CallExpression":
      case "TaggedTemplateExpression": {
        found.call++;
        const callee = n.type === "CallExpression" ? n.callee : null;
        if (callee && FUNCTION_TYPES.has(callee.type)) {
          // an IIFE: its body runs now
          let throws = false;
          const scan = (m) => {
            if (!m || typeof m.type !== "string") {
              return;
            }
            if (m.type === "ThrowStatement") {
              throws = true;
            }
            if (FUNCTION_TYPES.has(m.type) && m !== callee) {
              return;
            }
            for (const k of keys[m.type] ?? []) {
              const v = m[k];
              if (Array.isArray(v)) {
                v.forEach(scan);
              } else {
                scan(v);
              }
            }
          };
          scan(callee.body);
          if (throws) {
            found.throwIife++;
          }
          for (const k of keys[callee.body.type] ?? []) {
            const v = callee.body[k];
            if (Array.isArray(v)) {
              v.forEach((c) => visit(c, true));
            } else {
              visit(v, true);
            }
          }
        }
        break;
      }
      case "NewExpression":
        found.new++;
        break;
      case "AwaitExpression":
        found.await++;
        break;
      case "YieldExpression":
        found.yield++;
        break;
      case "AssignmentExpression":
        found.assignment++;
        break;
      case "UpdateExpression":
        found.update++;
        break;
      case "UnaryExpression":
        if (n.operator === "delete") {
          found.assignment++;
        }
        break;
      case "MemberExpression":
        found.member++;
        break;
      default:
        break;
    }
    for (const k of keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        v.forEach((c) => visit(c, inFn));
      } else {
        visit(v, inFn);
      }
    }
  };
  visit(node, false);
  return found;
};
// The eager-evaluation risk of a leaf: "pure" (literals, identifiers, functions, JSX of those),
// "reads" (member reads: a nullish object throws, a getter runs), "effects" (calls, new, await,
// yield, assignments, updates), "throws" (an IIFE that throws).
const riskOf = (e, kind) => {
  if (e.throwIife > 0) {
    return "throws";
  }
  if (e.await > 0 || e.yield > 0) {
    return "await";
  }
  if (e.call + e.new + e.assignment + e.update > 0) {
    return "effects";
  }
  if (e.member > 0) {
    return "reads";
  }
  return kind === "jsx" ? "jsx" : "pure";
};

// ── the census rule ────────────────────────────────────────────────────
const keyOf = (loc) =>
  loc
    ? `${loc.start.line}:${loc.start.column + 1}:${loc.end.line}:${loc.end.column + 1}`
    : null;
const breaksSonarNesting = (type) =>
  [
    "ArrayExpression",
    "ObjectExpression",
    "FunctionExpression",
    "ArrowFunctionExpression",
    "JSXExpressionContainer",
  ].includes(type);
const fnName = (fn, sc) => {
  if (fn.id?.name) {
    return fn.id.name;
  }
  const p = fn.parent;
  if (p?.type === "VariableDeclarator" && p.id.type === "Identifier") {
    return p.id.name;
  }
  if (
    (p?.type === "MethodDefinition" ||
      p?.type === "Property" ||
      p?.type === "PropertyDefinition") &&
    p.key
  ) {
    return p.key.type === "Identifier"
      ? p.key.name
      : squash(textOf(sc, p.key), 40);
  }
  if (p?.type === "CallExpression" && p.callee !== fn) {
    return `<callback to ${squash(textOf(sc, p.callee), 40)}>`;
  }
  if (p?.type === "JSXExpressionContainer") {
    return "<JSX function>";
  }
  return "<anonymous>";
};
const makeCensusRule = (sink) => ({
  create(context) {
    const sc = context.sourceCode;
    const keys = sc.visitorKeys;
    const conds = [];
    const condTypes = [];
    const ifs = [];
    const fns = [];
    return {
      ConditionalExpression(n) {
        conds.push(n);
      },
      IfStatement(n) {
        ifs.push(n);
      },
      ":function"(n) {
        fns.push(n);
      },
      TSConditionalType(n) {
        condTypes.push(n);
      },
      "Program:exit"(program) {
        sink.result = analyse(sc, keys, program, {
          condTypes,
          conds,
          context,
          fns,
          ifs,
        });
      },
    };
  },
  meta: { schema: [], type: "suggestion" },
});

const analyse = (
  sc,
  keys,
  program,
  { conds, condTypes, ifs, fns, context }
) => {
  const fnIndex = new Map(fns.map((f, i) => [f, i]));
  const idOf = new Map(conds.map((c, i) => [c, i]));
  const functions = fns.map((f, i) => ({
    endLine: f.loc.end.line,
    index: i,
    line: f.loc.start.line,
    name: fnName(f, sc),
    range: f.range,
    sonarKey: keyOf(
      sonarLocation.getMainFunctionTokenLocation(f, f.parent, context)
    ),
    type: f.type,
  }));
  // conditionals
  const rows = conds.map((c, i) => {
    const slot = slotOf(c);
    // the nearest conditional ancestor through any path, and whether sonarjs counts it as nesting
    let anc = null;
    let ancSlot = null;
    let sonarBroken = false;
    let viaFunction = false;
    const path = [];
    let child = c;
    for (let p = c.parent; p; p = p.parent) {
      if (isCond(p)) {
        anc = p;
        ancSlot = SLOTS.find((s) => p[s] === child) ?? null;
        break;
      }
      if (breaksSonarNesting(p.type)) {
        sonarBroken = true;
      }
      if (FUNCTION_TYPES.has(p.type)) {
        viaFunction = true;
      }
      path.push(p.type);
      child = p;
    }
    const fn = enclosingFunction(c);
    return {
      ancestor: anc ? idOf.get(anc) : null,
      ancestorSlot: ancSlot,
      column: c.loc.start.column,
      endLine: c.loc.end.line,
      fn: fn ? fnIndex.get(fn) : null,
      id: i,
      line: c.loc.start.line,
      parenthesized: astUtils.isParenthesised(sc, c),
      path: path.slice(0, 6),
      range: c.range,
      slot,
      sonarNested: anc !== null && !sonarBroken,
      viaFunction,
    };
  });
  // trees (direct nesting)
  const rootOf = (c) => {
    let x = c;
    while (isCond(x.parent) && slotOf(x)) {
      x = x.parent;
    }
    return x;
  };
  const trees = new Map();
  for (const c of conds) {
    const r = rootOf(c);
    if (!trees.has(r)) {
      trees.set(r, []);
    }
    trees.get(r).push(c);
  }
  const treeRows = [];
  for (const [root, members] of trees) {
    const rid = idOf.get(root);
    for (const m of members) {
      rows[idOf.get(m)].root = rid;
    }
    // depth of each member from the root
    const depthOf = (m) => {
      let d = 0;
      for (let x = m; x !== root; x = x.parent) {
        d++;
      }
      return d;
    };
    for (const m of members) {
      rows[idOf.get(m)].depth = depthOf(m);
    }
    if (members.length < 2) {
      continue;
    }
    const slots = members.map(slotOf).filter(Boolean);
    const hasTest = slots.includes("test");
    const hasCons = slots.includes("consequent");
    const shape =
      !hasTest && !hasCons
        ? "chain"
        : hasTest && !hasCons && !slots.includes("alternate")
          ? "test"
          : !hasTest && hasCons && !slots.includes("alternate")
            ? "consequent"
            : "mixed";
    // leaves: the branches that aren't tree members, in source order
    const leaves = [];
    const tests = [];
    const walkTree = (n) => {
      tests.push(n.test);
      for (const s of ["consequent", "alternate"]) {
        if (isCond(n[s])) {
          walkTree(n[s]);
        } else {
          leaves.push(n[s]);
        }
      }
      if (isCond(n.test)) {
        // a conditional test is a member too; its own branches are part of the condition
      }
    };
    walkTree(root);
    const leafRows = leaves.map((l) => {
      const kind = LEAF_KINDS(l);
      const e = effectsIn(l, keys);
      return {
        jsx: kind === "jsx",
        kind,
        lines: l.loc.end.line - l.loc.start.line + 1,
        risk: riskOf(e, kind),
      };
    });
    // the tests along the alternate spine (the else-if chain)
    const spine = [];
    for (let x = root; isCond(x); x = x.alternate) {
      spine.push(x.test);
    }
    const shapeOfTests = testShapeOf(sc, shape === "chain" ? spine : tests);
    const pos = positionOf(root);
    const fn = enclosingFunction(root);
    // inside JSX: an ancestor JSX element or fragment in the same function
    let inJsx = false;
    for (let p = root.parent; p && !FUNCTION_TYPES.has(p.type); p = p.parent) {
      if (p.type === "JSXElement" || p.type === "JSXFragment") {
        inJsx = true;
        break;
      }
    }
    const depth = Math.max(...members.map((m) => rows[idOf.get(m)].depth)) + 1;
    const lastSpine = (() => {
      let x = root;
      while (isCond(x.alternate)) {
        x = x.alternate;
      }
      return x.alternate;
    })();
    treeRows.push({
      column: root.loc.start.column,
      depth,
      endLine: root.loc.end.line,
      // the final default of the chain: `undefined`/`null` or a real value
      finalDefault: LEAF_KINDS(lastSpine),
      fn: fn ? fnIndex.get(fn) : null,
      inJsx,
      jsxLeaves: leafRows.filter((l) => l.jsx).length,
      leafKinds: leafRows.map((l) => l.kind),
      leafRisks: leafRows.map((l) => l.risk),
      leaves: leafRows.length,
      line: root.loc.start.line,
      lines: root.loc.end.line - root.loc.start.line + 1,
      members: members.length,
      parenthesizedInner: members
        .filter((m) => m !== root)
        .map((m) => astUtils.isParenthesised(sc, m)),
      range: root.range,
      root: rid,
      rootParenthesized: astUtils.isParenthesised(sc, root),
      shape,
      slots: {
        alternate: slots.filter((s) => s === "alternate").length,
        consequent: slots.filter((s) => s === "consequent").length,
        test: slots.filter((s) => s === "test").length,
      },
      tests: shapeOfTests,
      text: squash(textOf(sc, root), 300),
      ...pos,
      rewrite: rewriteClass(pos.position, pos),
    });
  }
  // TypeScript conditional types
  const condTypeRows = condTypes.map((t) => {
    const p = t.parent;
    const slot =
      p?.type === "TSConditionalType"
        ? ["checkType", "extendsType", "trueType", "falseType"].find(
            (s) => p[s] === t
          )
        : null;
    return { line: t.loc.start.line, nestedIn: slot };
  });
  // if/else chains: heads only (not an else-if)
  const ifRows = [];
  for (const n of ifs) {
    if (n.parent?.type === "IfStatement" && n.parent.alternate === n) {
      continue;
    }
    let len = 0;
    let finalElse = false;
    const branches = [];
    for (let x = n; x;) {
      len++;
      branches.push(x.consequent);
      if (x.alternate?.type === "IfStatement") {
        x = x.alternate;
      } else {
        if (x.alternate) {
          finalElse = true;
          branches.push(x.alternate);
        }
        break;
      }
    }
    const single = (b) => {
      const body =
        b.type === "BlockStatement"
          ? b.body.filter((s) => s.type !== "EmptyStatement")
          : [b];
      if (body.length !== 1) {
        return null;
      }
      const s = body[0];
      if (s.type === "ReturnStatement" && s.argument) {
        return "return";
      }
      if (
        s.type === "ExpressionStatement" &&
        s.expression.type === "AssignmentExpression" &&
        s.expression.operator === "="
      ) {
        return `assign:${squash(textOf(sc, s.expression.left), 80)}`;
      }
      return null;
    };
    const kinds = branches.map(single);
    const ternaryShaped =
      finalElse &&
      kinds.every(Boolean) &&
      new Set(kinds).size === 1 &&
      len >= 1;
    const fn = enclosingFunction(n);
    ifRows.push({
      braces: branches.every((b) => b.type === "BlockStatement"),
      endLine: n.loc.end.line,
      finalElse,
      fn: fn ? fnIndex.get(fn) : null,
      length: len,
      line: n.loc.start.line,
      ternaryShaped,
      ternaryShapedKind: ternaryShaped ? kinds[0].split(":")[0] : null,
    });
  }
  // guard chains: runs of `if (c) return x;` (no else) in one statement list, then a return
  const guardRows = [];
  const lists = [];
  const collect = (n) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    if (n.type === "BlockStatement" || n.type === "Program") {
      lists.push(n.body);
    }
    for (const k of keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        v.forEach(collect);
      } else {
        collect(v);
      }
    }
  };
  collect(program);
  const isGuard = (s) =>
    s.type === "IfStatement" &&
    !s.alternate &&
    (s.consequent.type === "ReturnStatement" ||
      (s.consequent.type === "BlockStatement" &&
        s.consequent.body.length === 1 &&
        s.consequent.body[0].type === "ReturnStatement")) &&
    (s.consequent.type === "ReturnStatement"
      ? s.consequent.argument
      : s.consequent.body[0].argument);
  for (const body of lists) {
    for (let i = 0; i < body.length; i++) {
      if (!isGuard(body[i])) {
        continue;
      }
      let j = i;
      while (j < body.length && isGuard(body[j])) {
        j++;
      }
      const next = body[j];
      if (next?.type === "ReturnStatement" && next.argument) {
        const fn = enclosingFunction(body[i]);
        guardRows.push({
          braces: body
            .slice(i, j)
            .every((s) => s.consequent.type === "BlockStatement"),
          fn: fn ? fnIndex.get(fn) : null,
          guards: j - i,
          line: body[i].loc.start.line,
        });
      }
      i = j;
    }
  }
  return {
    condTypes: condTypeRows,
    conditionals: rows,
    functions,
    guards: guardRows,
    ifChains: ifRows,
    lines: sc.lines.length,
    trees: treeRows,
  };
};

// ── the ESLint pass ────────────────────────────────────────────────────
const ESLINT_RULES = {
  "no-else-return": "error",
  "no-nested-ternary": "error",
  "no-unneeded-ternary": "error",
  "sonarjs/cognitive-complexity": ["error", 0],
  "sonarjs/no-nested-conditional": "error",
  "unicorn/no-nested-ternary": "error",
  "unicorn/no-unnecessary-nested-ternary": "error",
  "unicorn/prefer-logical-operator-over-ternary": "error",
  "unicorn/prefer-minimal-ternary": ["error", ...PREFER_MINIMAL_OPTIONS],
  "unicorn/prefer-ternary": ["error", ...PREFER_TERNARY_OPTIONS],
};
const linter = new Linter({ configType: "flat" });
const configFor = (
  sink,
  rel,
  { inline = false, rules = ESLINT_RULES } = {}
) => [
  {
    files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: /\.[jt]sx$/.test(rel) } },
      sourceType: rel.endsWith(".cjs") ? "commonjs" : "module",
    },
    linterOptions: {
      noInlineConfig: !inline,
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      census: { rules: { census: makeCensusRule(sink) } },
      sonarjs,
      unicorn,
    },
    rules: { "census/census": "error", ...rules },
  },
];
const COGNITIVE_RE = /Cognitive Complexity from (\d+) to the 0 allowed/;
// One file: the inventory, every ESLint report of the topic's rules (inline config ignored, and,
// with { inline: true }, honoured), and each function's cognitive complexity. Returns
// { ...inventory, eslint: [...] } or { error }.
const inventory = (text, rel, opts = {}) => {
  const sink = {};
  let messages;
  try {
    messages = linter.verify(text, configFor(sink, rel, opts), {
      filename: rel.replace(/^.*\//, ""),
    });
  } catch (error) {
    return { error: String(error?.message ?? error).slice(0, 300) };
  }
  const fatal = messages.find((m) => m.fatal);
  if (fatal || !sink.result) {
    return { error: fatal?.message ?? "no result" };
  }
  const r = sink.result;
  const byKey = new Map(r.functions.map((f) => [f.sonarKey, f]));
  for (const f of r.functions) {
    f.cognitive = 0;
  }
  const eslint = [];
  for (const m of messages) {
    if (
      !m.ruleId ||
      m.ruleId === "census/census" ||
      // a disable comment naming a rule this pass doesn't load (inline config honoured)
      /^Definition for rule '.*' was not found\.$/.test(m.message)
    ) {
      continue;
    }
    if (m.ruleId === "sonarjs/cognitive-complexity") {
      const score = Number(COGNITIVE_RE.exec(m.message)?.[1]);
      const f = byKey.get(`${m.line}:${m.column}:${m.endLine}:${m.endColumn}`);
      if (f && !Number.isNaN(score)) {
        f.cognitive = score;
      } else {
        // sonarjs reports a file-level score for code outside functions
        r.fileCognitive = (r.fileCognitive ?? 0) + (score || 0);
      }
      continue;
    }
    eslint.push({
      column: m.column - 1,
      endColumn: m.endColumn ? m.endColumn - 1 : null,
      endLine: m.endLine ?? null,
      fix: Boolean(m.fix),
      line: m.line,
      message: m.message,
      messageId: m.messageId ?? null,
      rule: m.ruleId,
      suggestions: (m.suggestions ?? []).map((s) => s.desc),
    });
  }
  return { ...r, eslint };
};
// Cognitive complexity only: every function's score, by start offset.
const COGNITIVE_ONLY = { "sonarjs/cognitive-complexity": ["error", 0] };
const cognitiveOf = (text, rel) =>
  inventory(text, rel, { rules: COGNITIVE_ONLY });

// The conditional a diagnostic at (line, column) points at: the one starting there.
const condAt = (inv, line, column) =>
  inv.conditionals.find((c) => c.line === line && c.column === column) ?? null;

// ── mirrors ────────────────────────────────────────────────────────────
const DIRECTIVES = /\b(?:eslint|oxlint)-(?:disable|enable)|biome-ignore/g;
const neutralise = (text) =>
  text.replace(
    DIRECTIVES,
    (m) => "x".repeat(m.indexOf("-")) + m.slice(m.indexOf("-"))
  );
const writeMirror = (dir, name, files, mode) => {
  const root = lib.getRepo(name).root;
  rmSync(join(dir, mode, name), { force: true, recursive: true });
  let neutralised = 0;
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    const dest = join(dir, mode, name, rel);
    mkdirSync(dirname(dest), { recursive: true });
    if (mode === "raw") {
      const n = text.match(DIRECTIVES)?.length ?? 0;
      neutralised += n;
      writeFileSync(dest, n ? neutralise(text) : text);
    } else {
      copyFileSync(join(root, rel), dest);
    }
  }
  return { neutralised, root: join(dir, mode, name) };
};

// ── formatters ─────────────────────────────────────────────────────────
// Oxfmt with Ultracite's preset (its ignore patterns dropped: they include `**/build`), written as
// JSON into the directory it formats.
const oxfmtConfig = async () => {
  const preset = (
    await import(
      require("node:url").pathToFileURL(join(CLI, "config/oxfmt/index.mjs"))
        .href
    )
  ).default;
  const { ignorePatterns: _ignored, ...rest } = preset;
  return rest;
};
const prettierBin = join(prettierDir, "bin/prettier.cjs");
const prettierConfig = async () =>
  (
    await import(
      require("node:url").pathToFileURL(
        join(CLI, "config/prettier/prettier.config.mjs")
      ).href
    )
  ).default;

// Format files in place under `cwd`: Oxfmt with Ultracite's preset, or Prettier with Ultracite's
// config (its tailwind option dropped: the plugin isn't loaded), optionally with
// experimentalTernaries. Configs are written under TMP.
const formatInPlace = async ({ cwd, files, tool, experimentalTernaries }) => {
  const configDir = join(TMP, "format-configs");
  mkdirSync(configDir, { recursive: true });
  const CHUNK = 400;
  const out = { status: 0, stderr: "" };
  if (tool === "oxfmt") {
    const config = join(configDir, "oxfmt.json");
    writeFileSync(config, `${JSON.stringify(await oxfmtConfig(), null, 2)}\n`);
    for (let i = 0; i < files.length; i += CHUNK) {
      const r = lib.spawnSync(
        process.execPath,
        [
          lib.oxfmtBin,
          `--config=${config}`,
          "--disable-nested-config",
          "--write",
          "--no-error-on-unmatched-pattern",
          ...files.slice(i, i + CHUNK),
        ],
        { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
      );
      out.status = Math.max(out.status, r.status ?? 1);
      out.stderr += r.stderr ?? "";
    }
    return out;
  }
  const { tailwindFunctions: _tw, ...rest } = await prettierConfig();
  const config = join(
    configDir,
    `prettier${experimentalTernaries ? "-experimental" : ""}.json`
  );
  writeFileSync(
    config,
    `${JSON.stringify({ ...rest, ...(experimentalTernaries ? { experimentalTernaries: true } : {}) }, null, 2)}\n`
  );
  for (let i = 0; i < files.length; i += CHUNK) {
    const r = lib.spawnSync(
      process.execPath,
      [
        prettierBin,
        "--config",
        config,
        "--no-editorconfig",
        "--ignore-path",
        join(configDir, "none"),
        "--write",
        "--log-level",
        "warn",
        ...files.slice(i, i + CHUNK),
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
    );
    out.status = Math.max(out.status, r.status ?? 1);
    out.stderr += r.stderr ?? "";
  }
  return out;
};

// ── misc ───────────────────────────────────────────────────────────────
const writeText = (file, text) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const readText = (file) =>
  existsSync(file) ? readFileSync(file, "utf8") : null;
const sum = (xs, f = (x) => x) => xs.reduce((s, x) => s + f(x), 0);
const share = (a, b) => lib.pct(a, b);
// Machine paths in tool output (the temp directory, the repo) become placeholders.
const scrub = (s) =>
  typeof s === "string"
    ? s
        .split(TMP)
        .join("<tmp>")
        .split(require("node:fs").realpathSync(tmpdir()))
        .join("<tmp>")
        .split(tmpdir())
        .join("<tmp>")
        .split(ULTRACITE)
        .join("<repo>")
    : s;

module.exports = {
  ...lib,
  CALIBRATION_DIR,
  CLI,
  EARLY_RETURN,
  ESLINT_RULES,
  EXAMPLES_DIR,
  FUNCTION_TYPES,
  HERE,
  HISTORY_DIR,
  OUT_DIR,
  PREFER_MINIMAL_OPTIONS,
  PREFER_TERNARY_OPTIONS,
  RESULTS_DIR,
  STATEMENT_IN_PLACE,
  TMP,
  TOPIC,
  TS_WRAPPERS,
  ULTRACITE,
  builtinRules,
  cognitiveOf,
  comparisonOf,
  formatInPlace,
  condAt,
  inventory,
  isConstant,
  linter,
  neutralise,
  outerOf,
  oxfmtConfig,
  peel,
  positionOf,
  prettierBin,
  prettierConfig,
  prettierDir,
  readText,
  rewriteClass,
  scrub,
  share,
  sonarjs,
  sum,
  testShapeOf,
  toolVersions,
  unicorn,
  unicornVersion,
  writeMirror,
  writeText,
};
