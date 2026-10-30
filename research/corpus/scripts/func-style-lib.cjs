// Shared definitions for the func-style scripts (func-style-*.cjs): how functions are written and
// ordered, and what `func-style` and `no-use-before-define` say about it.
//
// The rules, and what Ultracite does with them (read from packages/cli/config by
// func-style-rules.cjs):
//   func-style               ["error", "expression", { allowArrowFunctions: true }] in Oxlint core
//                            and ESLint core: every function declaration is reported, except
//                            `export default function` and TypeScript overloads (ESLint's source)
//   no-use-before-define     Oxlint core "error" (defaults); ESLint core through @eslint/js
//                            configs.all (defaults) on JS files, and on TS files the base rule off
//                            and @typescript-eslint/no-use-before-define on (defaults); off for
//                            route files in the TanStack presets (both linters)
//   related                  func-names, prefer-arrow-callback, arrow-body-style ("as-needed"),
//                            unicorn/consistent-function-scoping; Biome's useArrowFunction,
//                            noInvalidUseBeforeDeclaration and useConsistentArrowReturn (core), and
//                            its nursery useConsistentFunctionStyle (not enabled)
//
// The inventory runs one ESLint `Linter` pass per file with the TypeScript parser and its scope
// analysis: a local census rule that records every function (its form, scope, body, types, and
// what a conversion would need), every reference between module-level functions (file order), and
// every reference that comes before its binding's definition (the use-before-define candidates),
// each with what would happen at runtime. The real ESLint rules run in the same pass, under local
// aliases for option variants, so their reports join to the inventory exactly.
//
// Read-only with respect to the clones: files are parsed, never run. Linters and conversions run
// on copies under TMP.
"use strict";

// The React codebases from the accessibility post are a separate set. Must be set before
// collect-files.cjs is loaded anywhere in the process.
process.env.CORPUS_REPO_LISTS ??= "repos-accessibility.json";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");

const lib = require("./length-lib.cjs");

const HERE = resolve(__dirname, "..");
const TOPIC = "func-style";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
// Copies the linters lint and the conversions write. Ultracite's presets ignore `**/out`.
const TMP =
  process.env.FUNC_STYLE_TMP ?? join(tmpdir(), "ultracite-research-func-style");
const { CLI, ULTRACITE } = lib;

// ── tools ──────────────────────────────────────────────────────────────
const { Linter } = require(require.resolve("eslint", { paths: [CLI] }));
const { builtinRules } = require(
  require.resolve("eslint/use-at-your-own-risk", { paths: [CLI] })
);
const tsPlugin = require(
  require.resolve("@typescript-eslint/eslint-plugin", { paths: [CLI] })
);
const { tsParser } = lib;

const toolVersions = () => ({
  ...lib.toolVersions(),
  "oxlint-tsgolint": (() => {
    try {
      return require(
        require.resolve("oxlint-tsgolint/package.json", { paths: [CLI] })
      ).version;
    } catch {
      return null;
    }
  })(),
  git: lib
    .spawnSync("git", ["--version"], { encoding: "utf8" })
    .stdout.trim()
    .replace(/^git version /, ""),
});

// ── node helpers ───────────────────────────────────────────────────────
const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);
const WRAPPERS = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
]);
// The expression a function sits in once TypeScript wrappers (`as`, `satisfies`, `!`) are peeled.
const outerOf = (node) => {
  let n = node;
  const wraps = [];
  while (n.parent && WRAPPERS.has(n.parent.type) && n.parent.expression === n) {
    wraps.push(n.parent.type);
    n = n.parent;
  }
  return { outer: n, wraps };
};
const enclosingFunction = (node) => {
  let n = node.parent;
  while (n) {
    if (FUNCTION_TYPES.has(n.type)) {
      return n;
    }
    n = n.parent;
  }
  return null;
};
const functionDepth = (node) => {
  let d = 0;
  let n = node.parent;
  while (n) {
    if (FUNCTION_TYPES.has(n.type)) {
      d++;
    }
    n = n.parent;
  }
  return d;
};
// The statement a declaration-like function belongs to (with its `export`).
const statementOf = (node) => {
  let n = node;
  if (node.type !== "FunctionDeclaration") {
    const { outer } = outerOf(node);
    if (outer.parent?.type !== "VariableDeclarator") {
      return null;
    }
    n = outer.parent.parent; // VariableDeclaration
  }
  if (
    n.parent?.type === "ExportNamedDeclaration" ||
    n.parent?.type === "ExportDefaultDeclaration"
  ) {
    n = n.parent;
  }
  return n;
};
const formOf = (node) => {
  if (node.type === "FunctionDeclaration") {
    const p = node.parent;
    if (p.type === "ExportDefaultDeclaration") {
      return "export-default-declaration";
    }
    if (p.type === "ExportNamedDeclaration") {
      return "export-declaration";
    }
    return "declaration";
  }
  const arrow = node.type === "ArrowFunctionExpression";
  const { outer } = outerOf(node);
  const p = outer.parent;
  switch (p?.type) {
    case "VariableDeclarator": {
      if (p.init !== outer) {
        return "other";
      }
      const kind = p.parent.kind;
      return `${kind}-${arrow ? "arrow" : node.id ? "function-named" : "function-anonymous"}`;
    }
    case "MethodDefinition":
    case "TSAbstractMethodDefinition":
      return "method";
    case "Property":
      if (p.value !== outer) {
        return "other";
      }
      return p.method || p.kind !== "init" ? "method" : "object-property";
    case "PropertyDefinition":
    case "AccessorProperty":
    case "TSAbstractPropertyDefinition":
      return arrow ? "class-field-arrow" : "class-field-function";
    case "CallExpression":
    case "NewExpression":
      return p.callee === outer ? "iife" : "callback";
    case "TaggedTemplateExpression":
      return "callback";
    case "ExportDefaultDeclaration":
      return "export-default-expression";
    case "AssignmentExpression":
      return "assignment";
    case "ReturnStatement":
      return "returned";
    case "ArrowFunctionExpression":
      return p.body === outer ? "returned" : "other";
    case "AssignmentPattern":
      return "default-value";
    case "JSXExpressionContainer":
      return "jsx-prop";
    default:
      return "other";
  }
};
const FORM_GROUP = {
  "const-arrow": "const-arrow",
  "const-function-anonymous": "const-function",
  "const-function-named": "const-function",
  "let-arrow": "let/var-function",
  "let-function-anonymous": "let/var-function",
  "let-function-named": "let/var-function",
  "var-arrow": "let/var-function",
  "var-function-anonymous": "let/var-function",
  "var-function-named": "let/var-function",
  "using-arrow": "let/var-function",
  "await using-arrow": "let/var-function",
  "class-field-arrow": "class-field",
  "class-field-function": "class-field",
  "export-declaration": "declaration",
  "export-default-declaration": "declaration",
  "export-default-expression": "other",
  "default-value": "other",
  "jsx-prop": "other",
  assignment: "other",
  callback: "callback",
  declaration: "declaration",
  iife: "iife",
  method: "method",
  "object-property": "object-property",
  other: "other",
  returned: "other",
};
const isVarBound = (form) => /^(?:const|let|var|using|await using)-/.test(form);
const scopeOf = (node) => {
  const stmt = statementOf(node);
  if (!stmt) {
    return functionDepth(node) === 0
      ? "module-expression"
      : "nested-expression";
  }
  const p = stmt.parent;
  if (p.type === "Program") {
    return "module";
  }
  if (p.type === "TSModuleBlock") {
    return "namespace";
  }
  const fn = enclosingFunction(stmt);
  if (!fn) {
    return "module-block";
  }
  if (p.type === "BlockStatement" && p.parent === fn) {
    return "nested";
  }
  return "nested-block";
};
const nameOf = (node) => {
  if (node.id?.name) {
    return node.id.name;
  }
  const { outer } = outerOf(node);
  const p = outer.parent;
  if (p?.type === "VariableDeclarator" && p.id.type === "Identifier") {
    return p.id.name;
  }
  if (
    (p?.type === "Property" ||
      p?.type === "MethodDefinition" ||
      p?.type === "PropertyDefinition" ||
      p?.type === "TSAbstractMethodDefinition") &&
    !p.computed
  ) {
    return p.key.name ?? String(p.key.value ?? "");
  }
  if (p?.type === "AssignmentExpression") {
    const l = p.left;
    if (l.type === "Identifier") {
      return l.name;
    }
    if (l.type === "MemberExpression" && !l.computed) {
      return l.property.name;
    }
  }
  if (
    (p?.type === "CallExpression" || p?.type === "NewExpression") &&
    p.parent?.type === "VariableDeclarator" &&
    p.parent.id.type === "Identifier"
  ) {
    return p.parent.id.name; // const X = memo(() => …)
  }
  return null;
};
const calleeName = (callee) => {
  let c = callee;
  while (c?.type === "MemberExpression") {
    c = c.property.type === "Identifier" ? c.property : c.object;
    break;
  }
  return c?.type === "Identifier" ? c.name : null;
};
const COMPONENT_WRAPPERS = new Set(["memo", "forwardRef", "observer"]);
const typeText = (node, text, max = 80) => {
  if (!node) {
    return null;
  }
  const t = text.slice(node.range[0], node.range[1]).replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
const paramTyped = (p) => {
  if (p.type === "AssignmentPattern") {
    return Boolean(p.left.typeAnnotation);
  }
  if (p.type === "TSParameterProperty") {
    return paramTyped(p.parameter);
  }
  return Boolean(p.typeAnnotation);
};

// Visit a function's own code: everything in its params and body, through arrow functions (which
// share `this`, `arguments`, `new.target` and `super`), but not into other functions or classes.
const visitOwn = (fn, keys, cb) => {
  const visit = (n, own) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    if (n !== fn) {
      if (n.type === "FunctionExpression" || n.type === "FunctionDeclaration") {
        return;
      }
      if (n.type === "ClassBody") {
        return;
      }
    }
    cb(n, own);
    for (const k of keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        for (const x of v) {
          visit(x, own && !(x && FUNCTION_TYPES.has(x.type)));
        }
      } else if (v && typeof v.type === "string") {
        visit(v, own && !FUNCTION_TYPES.has(v.type));
      }
    }
  };
  visit(fn, true);
};
const containsJsxOwn = (fn, keys) => {
  let found = false;
  const visit = (n) => {
    if (found || !n || typeof n.type !== "string") {
      return;
    }
    if (n !== fn && FUNCTION_TYPES.has(n.type)) {
      return;
    }
    if (n.type === "JSXElement" || n.type === "JSXFragment") {
      found = true;
      return;
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
  visit(fn.body);
  return found;
};

// ── scope helpers ──────────────────────────────────────────────────────
// ESLint's no-use-before-define: a reference is in a separate execution context from its variable
// unless the scopes between them are only IIFEs (not async or generator) and class static
// initializers.
const isClassStaticInitializerScope = (scope) => {
  if (scope.type === "class-static-block") {
    return true;
  }
  if (scope.type === "class-field-initializer") {
    return Boolean(scope.block.parent?.static);
  }
  return false;
};
const isIifeScope = (scope) => {
  if (scope.type !== "function") {
    return false;
  }
  const node = scope.block;
  const { outer } = outerOf(node);
  return (
    outer.parent?.type === "CallExpression" &&
    outer.parent.callee === outer &&
    !node.generator &&
    !node.async
  );
};
const isFromSeparateExecutionContext = (reference) => {
  const variable = reference.resolved;
  let scope = reference.from;
  while (variable.scope.variableScope !== scope.variableScope) {
    if (
      isClassStaticInitializerScope(scope.variableScope) ||
      isIifeScope(scope.variableScope)
    ) {
      scope = scope.variableScope.upper;
    } else {
      return true;
    }
    if (!scope) {
      return true;
    }
  }
  return false;
};
const inRange = (node, loc) =>
  Boolean(node) && node.range[0] <= loc && loc <= node.range[1];
const SENTINEL =
  /^(?:(?:Function|Class)(?:Declaration|Expression)|ArrowFunctionExpression|CatchClause|ImportDeclaration|ExportNamedDeclaration)$/;
// ESLint's isEvaluatedDuringInitialization (same execution context, inside the variable's own
// initializer, a for-in/of's right side, or a default value).
const inOwnInitializer = (reference) => {
  const loc = reference.identifier.range[1];
  const def = reference.resolved.defs[0];
  if (def.type === "ClassName") {
    return false; // handled by the class rows (ESLint: references inside the class body)
  }
  let node = def.name.parent;
  while (node) {
    if (node.type === "VariableDeclarator") {
      if (inRange(node.init, loc)) {
        return true;
      }
      if (
        /^For(?:In|Of)Statement$/.test(node.parent.parent?.type ?? "") &&
        inRange(node.parent.parent.right, loc)
      ) {
        return true;
      }
      break;
    }
    if (node.type === "AssignmentPattern" && inRange(node.right, loc)) {
      return true;
    }
    if (SENTINEL.test(node.type)) {
      break;
    }
    node = node.parent;
  }
  return false;
};
const referenceContainsTypeQuery = (node) => {
  switch (node?.type) {
    case "TSTypeQuery":
      return true;
    case "TSQualifiedName":
    case "Identifier":
      return referenceContainsTypeQuery(node.parent);
    default:
      return false;
  }
};
// Type positions: anything under one of these is erased at runtime (a computed key in a type
// literal reads a value syntactically, but no code runs).
const TYPE_CONTEXT = new Set([
  "TSTypeAnnotation",
  "TSTypeLiteral",
  "TSTypeReference",
  "TSTypeQuery",
  "TSPropertySignature",
  "TSMethodSignature",
  "TSIndexSignature",
  "TSInterfaceBody",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "TSTypeParameterInstantiation",
  "TSTypeParameterDeclaration",
  "TSMappedType",
  "TSConditionalType",
  "TSIndexedAccessType",
  "TSTupleType",
  "TSUnionType",
  "TSIntersectionType",
  "TSFunctionType",
  "TSConstructorType",
  "TSTypeOperator",
  "TSImportType",
  "TSInterfaceHeritage",
  "TSClassImplements",
  "TSTypePredicate",
]);
const inTypeContext = (id) => {
  let n = id.parent;
  while (n) {
    if (TYPE_CONTEXT.has(n.type)) {
      return true;
    }
    if (/Statement$|Declaration$/.test(n.type) || n.type === "Program") {
      return false;
    }
    n = n.parent;
  }
  return false;
};
const isTypeRef = (r) =>
  (Boolean(r.isTypeReference) && !r.isValueReference) ||
  referenceContainsTypeQuery(r.identifier) ||
  r.identifier.parent?.type === "TSTypeReference" ||
  inTypeContext(r.identifier);
// Sync callers: functions whose callback argument runs before the call returns.
const SYNC_CALLEES = new Set([
  "map",
  "forEach",
  "filter",
  "reduce",
  "reduceRight",
  "some",
  "every",
  "find",
  "findIndex",
  "findLast",
  "findLastIndex",
  "flatMap",
  "sort",
  "toSorted",
  "from",
  "replace",
  "replaceAll",
  "Promise",
]);

// ── the census rule ────────────────────────────────────────────────────
const makeCensusRule = (sink, rel) => ({
  create(context) {
    const sc = context.sourceCode;
    return {
      "Program:exit"(program) {
        sink.result = analyse(sc, program, rel);
      },
    };
  },
});

const lineOf = (n) => n.loc.start.line;

// The whole analysis of one parsed file.
const analyse = (sc, program, rel) => {
  const text = sc.text;
  const keys = sc.visitorKeys;
  const sm = sc.scopeManager;
  const jsxFile = /\.[jt]sx$/.test(rel);
  const fns = [];
  const signatures = [];
  const all = [];
  const walk = (n) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    all.push(n);
    for (const k of keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        for (const x of v) {
          walk(x);
        }
      } else if (v && typeof v.type === "string") {
        walk(v);
      }
    }
  };
  walk(program);

  // the top scope that module-level declarations live in
  const globalScope = sm.globalScope;
  const topScope =
    globalScope.childScopes.find(
      (s) =>
        s.block === program && (s.type === "module" || s.type === "function")
    ) ?? globalScope;

  const fnRecords = new Map();
  // overloads, as ESLint's isOverloadedFunction sees them
  const isOverloadedEslint = (node) => {
    const name = node.id?.name;
    if (!name) {
      return false;
    }
    if (node.parent.type === "ExportNamedDeclaration") {
      return node.parent.parent.body.some(
        (m) =>
          m.type === "ExportNamedDeclaration" &&
          m.declaration?.type === "TSDeclareFunction" &&
          m.declaration.id.name === name
      );
    }
    if (node.parent.type === "SwitchCase") {
      return node.parent.parent.cases.some((c) =>
        c.consequent.some(
          (m) => m.type === "TSDeclareFunction" && m.id.name === name
        )
      );
    }
    return (
      Array.isArray(node.parent.body) &&
      node.parent.body.some(
        (m) => m.type === "TSDeclareFunction" && m.id.name === name
      )
    );
  };
  // any overload signature with the same name in the same container (exported or not)
  const containerBody = (stmt) => {
    const p = stmt.parent;
    if (Array.isArray(p?.body)) {
      return p.body;
    }
    if (p?.type === "SwitchCase") {
      return p.consequent;
    }
    return [];
  };
  const unwrapExport = (s) =>
    s.type === "ExportNamedDeclaration" || s.type === "ExportDefaultDeclaration"
      ? s.declaration
      : s;
  const hasOverloads = (node) => {
    const name = node.id?.name;
    const stmt = statementOf(node) ?? node;
    return containerBody(stmt).some((s) => {
      const d = s && unwrapExport(s);
      return d?.type === "TSDeclareFunction" && d.id?.name === name;
    });
  };
  const sharesNameWithType = (node, name) => {
    const stmt = statementOf(node) ?? node;
    return containerBody(stmt).some((s) => {
      const d = s && unwrapExport(s);
      return (
        (d?.type === "TSTypeAliasDeclaration" ||
          d?.type === "TSInterfaceDeclaration") &&
        d.id?.name === name
      );
    });
  };
  const mergedWithNamespace = (node, name) => {
    const stmt = statementOf(node) ?? node;
    return containerBody(stmt).some((s) => {
      const d = s && unwrapExport(s);
      return (
        d?.type === "TSModuleDeclaration" &&
        d.id?.type === "Identifier" &&
        d.id.name === name
      );
    });
  };

  for (const n of all) {
    if (n.type === "TSDeclareFunction") {
      signatures.push({
        declare: Boolean(n.declare),
        line: lineOf(n),
        name: n.id?.name ?? null,
      });
      continue;
    }
    if (!FUNCTION_TYPES.has(n.type)) {
      continue;
    }
    const form = formOf(n);
    const name = nameOf(n);
    const stmt = statementOf(n);
    const { outer, wraps } = outerOf(n);
    const declarator = isVarBound(form) ? outer.parent : null;
    const rec = {
      async: Boolean(n.async),
      column: n.loc.start.column,
      depth: functionDepth(n),
      end: n.range[1],
      endLine: n.loc.end.line,
      form,
      generator: Boolean(n.generator),
      group: FORM_GROUP[form] ?? "other",
      i: fns.length,
      line: lineOf(n),
      lines: n.loc.end.line - n.loc.start.line + 1,
      name,
      scope: scopeOf(n),
      start: n.range[0],
      type: n.type,
    };
    if (stmt) {
      rec.stmtStart = stmt.range[0];
      rec.stmtEnd = stmt.range[1];
      rec.stmtLine = stmt.loc.start.line;
      rec.stmtEndLine = stmt.loc.end.line;
      rec.exported =
        stmt.type === "ExportNamedDeclaration" ||
        stmt.type === "ExportDefaultDeclaration";
    }
    // component: a PascalCase name with JSX in its own body, in a .tsx/.jsx file
    let cname = name;
    if (
      (outer.parent?.type === "CallExpression" ||
        outer.parent?.type === "NewExpression") &&
      COMPONENT_WRAPPERS.has(calleeName(outer.parent.callee))
    ) {
      rec.componentWrapper = calleeName(outer.parent.callee);
    }
    rec.component = Boolean(
      jsxFile && cname && /^[A-Z]/.test(cname) && containsJsxOwn(n, keys)
    );
    // body
    const body = n.body;
    rec.concise = n.type === "ArrowFunctionExpression" && n.expression === true;
    if (body?.type === "BlockStatement") {
      rec.bodyStatements = body.body.length;
      const only = body.body.length === 1 ? body.body[0] : null;
      rec.singleReturn = Boolean(
        only?.type === "ReturnStatement" && only.argument
      );
      rec.singleReturnObject =
        rec.singleReturn && only.argument.type === "ObjectExpression";
      rec.bodyComments = sc.getCommentsInside(body).length;
      rec.emptyBody = body.body.length === 0;
    }
    // what an arrow can't do
    let usesThis = false;
    let usesSuper = false;
    let usesNewTarget = false;
    let usesYieldOrAwait = false;
    visitOwn(n, keys, (x) => {
      if (x.type === "ThisExpression") {
        usesThis = true;
      } else if (x.type === "Super") {
        usesSuper = true;
      } else if (
        x.type === "MetaProperty" &&
        x.meta.name === "new" &&
        x.property.name === "target"
      ) {
        usesNewTarget = true;
      } else if (x.type === "YieldExpression") {
        usesYieldOrAwait = true;
      }
    });
    rec.usesThis = usesThis;
    rec.usesSuper = usesSuper;
    rec.usesNewTarget = usesNewTarget;
    rec.usesYield = usesYieldOrAwait;
    const fnScope = sm.acquire(n);
    const argsVar = fnScope?.set?.get("arguments");
    rec.usesArguments = Boolean(argsVar && argsVar.references.length > 0);
    rec.thisParam =
      n.params[0]?.type === "Identifier" && n.params[0].name === "this";
    // types
    const params = rec.thisParam ? n.params.slice(1) : n.params;
    rec.params = params.length;
    rec.paramsTyped = params.filter(paramTyped).length;
    rec.returnTyped = Boolean(n.returnType);
    rec.returnsNever = n.returnType?.typeAnnotation?.type === "TSNeverKeyword";
    const pred = n.returnType?.typeAnnotation;
    rec.predicate =
      pred?.type === "TSTypePredicate"
        ? pred.asserts
          ? "asserts"
          : "is"
        : null;
    rec.generic = n.typeParameters?.params?.length ?? 0;
    rec.genericNeedsComma =
      jsxFile &&
      rec.generic === 1 &&
      !n.typeParameters.params[0].constraint &&
      !n.typeParameters.params[0].default;
    if (declarator) {
      const ann = declarator.id.typeAnnotation?.typeAnnotation;
      rec.varAnnotated = Boolean(ann);
      rec.varAnnotationKind = ann
        ? ann.type === "TSTypeReference"
          ? "named"
          : ann.type === "TSFunctionType"
            ? "function-type"
            : ann.type
        : null;
      rec.varAnnotationText = ann ? typeText(ann, text) : null;
      rec.varAnnotationName =
        ann?.type === "TSTypeReference" ? typeText(ann.typeName, text) : null;
      rec.satisfies = wraps.includes("TSSatisfiesExpression");
      rec.asserted =
        wraps.includes("TSAsExpression") || wraps.includes("TSTypeAssertion");
      rec.wrapperText =
        rec.satisfies || rec.asserted
          ? typeText(
              outer.typeAnnotation ?? outer.typeAnnotation?.typeAnnotation,
              text
            )
          : null;
      rec.declKind = declarator.parent.kind;
      rec.declLine = declarator.loc.start.line;
      rec.declColumn = declarator.loc.start.column;
    }
    if (n.type === "FunctionDeclaration") {
      rec.overloaded = hasOverloads(n);
      rec.overloadedEslint = isOverloadedEslint(n);
      rec.mergedNamespace = name ? mergedWithNamespace(n, name) : false;
      rec.sameNameType = name ? sharesNameWithType(n, name) : false;
    }
    fnRecords.set(n, rec);
    fns.push(rec);
  }

  // ── variables of function bindings: how they're used ──────────────────
  const imports = [];
  const bindingOf = new Map(); // function node -> variable
  for (const scope of sm.scopes) {
    for (const v of scope.variables) {
      const def = v.defs[0];
      if (!def) {
        continue;
      }
      let fnNode = null;
      if (
        def.type === "FunctionName" &&
        def.node.type === "FunctionDeclaration"
      ) {
        fnNode = def.node;
      } else if (def.type === "Variable" && def.node.init) {
        let init = def.node.init;
        while (WRAPPERS.has(init.type)) {
          init = init.expression;
        }
        if (
          init.type === "ArrowFunctionExpression" ||
          init.type === "FunctionExpression"
        ) {
          fnNode = init;
        }
      } else if (def.type === "ImportBinding") {
        const spec = def.node;
        const decl = def.parent;
        let imported = "*";
        if (spec.type === "ImportSpecifier") {
          imported = spec.imported.name ?? spec.imported.value;
        } else if (spec.type === "ImportDefaultSpecifier") {
          imported = "default";
        }
        let newCount = 0;
        let instanceofCount = 0;
        let prototypeCount = 0;
        for (const r of v.references) {
          const p = r.identifier.parent;
          if (p.type === "NewExpression" && p.callee === r.identifier) {
            newCount++;
          } else if (
            p.type === "BinaryExpression" &&
            p.operator === "instanceof" &&
            p.right === r.identifier
          ) {
            instanceofCount++;
          } else if (
            p.type === "MemberExpression" &&
            p.object === r.identifier &&
            !p.computed &&
            p.property.name === "prototype"
          ) {
            prototypeCount++;
          }
        }
        if (newCount || instanceofCount || prototypeCount) {
          imports.push({
            imported,
            instanceof: instanceofCount,
            local: v.name,
            new: newCount,
            prototype: prototypeCount,
            source: decl.source.value,
          });
        }
      }
      if (!fnNode || !fnRecords.has(fnNode)) {
        continue;
      }
      bindingOf.set(fnNode, v);
      const rec = fnRecords.get(fnNode);
      let calledWithNew = 0;
      let prototypeUse = 0;
      let instanceofUse = 0;
      let callApplyBind = 0;
      let reassigned = 0;
      let refsBefore = 0;
      let valueRefs = 0;
      const defEnd = def.name.range[1];
      for (const r of v.references) {
        if (r.init) {
          continue;
        }
        if (r.isWrite?.() && !r.init) {
          reassigned++;
        }
        if (r.isTypeReference && !r.isValueReference) {
          continue;
        }
        valueRefs++;
        if (r.identifier.range[1] < defEnd) {
          refsBefore++;
        }
        const p = r.identifier.parent;
        if (p.type === "NewExpression" && p.callee === r.identifier) {
          calledWithNew++;
        } else if (
          p.type === "BinaryExpression" &&
          p.operator === "instanceof" &&
          p.right === r.identifier
        ) {
          instanceofUse++;
        } else if (
          p.type === "MemberExpression" &&
          p.object === r.identifier &&
          !p.computed
        ) {
          if (p.property.name === "prototype") {
            prototypeUse++;
          } else if (["call", "apply", "bind"].includes(p.property.name)) {
            callApplyBind++;
          }
        }
      }
      Object.assign(rec, {
        callApplyBind,
        calledWithNew,
        instanceofUse,
        prototypeUse,
        reassigned,
        refsBefore,
        valueRefs,
      });
    }
  }

  // ── module-level functions: file order and recursion ──────────────────
  const moduleFns = [];
  for (const v of topScope.variables) {
    const def = v.defs[0];
    if (!def) {
      continue;
    }
    let fnNode = null;
    if (
      def.type === "FunctionName" &&
      def.node.type === "FunctionDeclaration"
    ) {
      fnNode = def.node;
    } else if (def.type === "Variable" && def.node.init) {
      let init = def.node.init;
      while (WRAPPERS.has(init.type)) {
        init = init.expression;
      }
      if (
        init.type === "ArrowFunctionExpression" ||
        init.type === "FunctionExpression"
      ) {
        fnNode = init;
      }
    }
    if (!fnNode || !fnRecords.has(fnNode)) {
      continue;
    }
    const rec = fnRecords.get(fnNode);
    if (rec.scope !== "module") {
      continue;
    }
    moduleFns.push({
      fn: rec.i,
      kind:
        fnNode.type === "FunctionDeclaration" ? "declaration" : "expression",
      name: v.name,
      node: fnNode,
      stmtStart: rec.stmtStart,
      variable: v,
    });
  }
  const moduleFnOfPos = (pos) =>
    moduleFns.find((m) => m.node.range[0] <= pos && pos < m.node.range[1]) ??
    null;
  const edges = [];
  const topRefs = [];
  for (const m of moduleFns) {
    for (const r of m.variable.references) {
      if (r.init || (r.isTypeReference && !r.isValueReference)) {
        continue;
      }
      const pos = r.identifier.range[0];
      const from = moduleFnOfPos(pos);
      const p = r.identifier.parent;
      const call =
        (p.type === "CallExpression" || p.type === "NewExpression") &&
        p.callee === r.identifier;
      if (from) {
        if (from === m) {
          continue; // recursion
        }
        edges.push({
          call,
          dir: m.stmtStart < from.stmtStart ? "up" : "down",
          from: from.name,
          line: r.identifier.loc.start.line,
          to: m.name,
        });
      } else {
        topRefs.push({
          call,
          dir: m.stmtStart < pos ? "up" : "down",
          line: r.identifier.loc.start.line,
          moduleEval: !isFromSeparateExecutionContext(r),
          to: m.name,
        });
      }
    }
  }
  const selfRecursive = moduleFns.filter((m) =>
    m.variable.references.some(
      (r) =>
        !r.init &&
        r.identifier.range[0] >= m.node.range[0] &&
        r.identifier.range[0] < m.node.range[1]
    )
  ).length;
  // strongly connected components (Tarjan) among module-level functions
  const succ = new Map(moduleFns.map((m) => [m.name, new Set()]));
  for (const e of edges) {
    succ.get(e.from)?.add(e.to);
  }
  const sccs = [];
  {
    let index = 0;
    const idx = new Map();
    const low = new Map();
    const stack = [];
    const on = new Set();
    const strong = (v) => {
      idx.set(v, index);
      low.set(v, index);
      index++;
      stack.push(v);
      on.add(v);
      for (const w of succ.get(v) ?? []) {
        if (!idx.has(w)) {
          strong(w);
          low.set(v, Math.min(low.get(v), low.get(w)));
        } else if (on.has(w)) {
          low.set(v, Math.min(low.get(v), idx.get(w)));
        }
      }
      if (low.get(v) === idx.get(v)) {
        const comp = [];
        let w;
        do {
          w = stack.pop();
          on.delete(w);
          comp.push(w);
        } while (w !== v);
        if (comp.length > 1) {
          sccs.push(comp.sort());
        }
      }
    };
    for (const m of moduleFns) {
      if (!idx.has(m.name)) {
        strong(m.name);
      }
    }
  }
  const kindOfName = new Map(moduleFns.map((m) => [m.name, m.kind]));

  // ── module-evaluation calls (for indirect TDZ) ────────────────────────
  // The variable scopes a reference crosses on its way to the binding's scope, innermost first,
  // skipping IIFEs and class static initializers (which run on the spot).
  const deferChain = (r, targetVarScope) => {
    const chain = [];
    let scope = r.from;
    while (scope && scope.variableScope !== targetVarScope) {
      const vs = scope.variableScope;
      if (!isClassStaticInitializerScope(vs) && !isIifeScope(vs)) {
        chain.push(vs);
      }
      scope = vs.upper;
    }
    return chain;
  };
  // Calls at module evaluation (in the module's own execution context) of a module-level
  // function, and the call graph between module-level functions, counting only calls in the
  // caller's own execution context (not inside a callback it creates). Passing a function as an
  // argument is recorded apart, as a possible call.
  const topVarScope = topScope.variableScope;
  const callGraph = new Map(moduleFns.map((m) => [m.name, new Set()]));
  const maybeGraph = new Map(moduleFns.map((m) => [m.name, new Set()]));
  const evalCalls = []; // { name, pos, kind: call | arg }
  for (const m of moduleFns) {
    for (const r of m.variable.references) {
      if (r.init) {
        continue;
      }
      const p = r.identifier.parent;
      const isCall =
        ((p.type === "CallExpression" || p.type === "NewExpression") &&
          p.callee === r.identifier) ||
        (p.type === "TaggedTemplateExpression" && p.tag === r.identifier) ||
        p.type === "Decorator";
      const isArg =
        (p.type === "CallExpression" || p.type === "NewExpression") &&
        p.arguments.includes(r.identifier);
      if (!isCall && !isArg) {
        continue;
      }
      const chain = deferChain(r, topVarScope);
      if (chain.length === 0) {
        evalCalls.push({
          kind: isCall ? "call" : "arg",
          name: m.name,
          pos: r.identifier.range[0],
        });
        continue;
      }
      const from = moduleFns.find((x) => x.node === chain.at(-1).block);
      if (!from || from === m) {
        continue;
      }
      if (chain.length === 1 && isCall) {
        callGraph.get(from.name).add(m.name);
      } else {
        maybeGraph.get(from.name).add(m.name);
      }
    }
  }
  // Which module-level functions run during module evaluation before position `pos`? Definite:
  // called at top level, or called by one that runs, in its own context. Possible: also through
  // functions passed as arguments and calls inside callbacks.
  const runsBefore = (name, pos, possible = false) => {
    const seen = new Set();
    const queue = evalCalls
      .filter((c) => c.pos < pos && (possible || c.kind === "call"))
      .map((c) => c.name);
    while (queue.length) {
      const x = queue.shift();
      if (seen.has(x)) {
        continue;
      }
      seen.add(x);
      for (const y of callGraph.get(x) ?? []) {
        queue.push(y);
      }
      if (possible) {
        for (const y of maybeGraph.get(x) ?? []) {
          queue.push(y);
        }
      }
    }
    return seen.has(name);
  };

  // ── use-before-define candidates ──────────────────────────────────────
  const ubd = [];
  for (const scope of sm.scopes) {
    for (const r of scope.references) {
      const v = r.resolved;
      if (!v || r.init || v.defs.length === 0) {
        continue;
      }
      // The linters judge "before" by the first definition; at runtime a value reference reads
      // the value definition (a `const X` that shares its name with a `type X`).
      const def0 = v.defs[0];
      const typeRefEarly = isTypeRef(r);
      const def =
        (!typeRefEarly && v.defs.find((d) => d.type !== "Type")) || def0;
      if (
        def.type === "ImportBinding" ||
        def.type === "ImplicitGlobalVariable" ||
        def.type === "CatchClause"
      ) {
        continue;
      }
      const defEnd = def.name.range[1];
      const refEnd = r.identifier.range[1];
      const beforeFirstDef = refEnd < def0.name.range[1];
      const textuallyBefore = beforeFirstDef || refEnd < defEnd;
      const sameContext = !isFromSeparateExecutionContext(r);
      const ownInit = !textuallyBefore && sameContext && inOwnInitializer(r);
      // a class referenced inside its own body (heritage, computed keys, static parts): ESLint's
      // isEvaluatedDuringInitialization for ClassName
      let classSelf = false;
      if (!textuallyBefore && def.type === "ClassName" && sameContext) {
        const cls = def.node;
        const inStatic = (cls.body?.body ?? []).some(
          (m) =>
            (m.type === "StaticBlock" && inRange(m, refEnd)) ||
            (m.type === "PropertyDefinition" &&
              m.static &&
              m.value &&
              inRange(m.value, refEnd))
        );
        classSelf = inRange(cls, refEnd) && !inStatic;
      }
      if (!textuallyBefore && !ownInit && !classSelf) {
        continue;
      }
      const typeRef = isTypeRef(r);
      const exportSpecifier =
        r.identifier.parent?.type === "ExportSpecifier" &&
        r.identifier.parent.local === r.identifier;
      let defKind = def.type;
      let initForm = null;
      if (def.type === "Variable") {
        defKind = def.parent?.kind ?? "var";
        let init = def.node.init;
        while (init && WRAPPERS.has(init.type)) {
          init = init.expression;
        }
        initForm = init
          ? init.type === "ArrowFunctionExpression"
            ? "arrow"
            : init.type === "FunctionExpression"
              ? "function"
              : init.type === "ClassExpression"
                ? "class"
                : "value"
          : "none";
      }
      const moduleBinding = v.scope === topScope;
      const chain = sameContext ? [] : deferChain(r, v.scope.variableScope);
      const deferredScope = chain[0] ?? null; // the innermost deferring function
      const deferredBlock = deferredScope?.block ?? null;
      // Does the code the reference sits in run during module evaluation before the binding is
      // initialised? Only for a reference in a function's own context (chain length 1): a
      // module-level function that runs before (definitely, or possibly), or a callback passed to
      // a call at module evaluation (sync array methods and `new Promise` run it on the spot).
      let indirect = false;
      let maybeIndirect = false;
      let callback = null;
      const initEnd = def.node?.range?.[1] ?? defEnd;
      if (moduleBinding && chain.length >= 1) {
        const outerBlock = chain.at(-1).block;
        const mf = moduleFns.find((m) => m.node === outerBlock);
        if (mf) {
          indirect = chain.length === 1 && runsBefore(mf.name, initEnd);
          maybeIndirect = !indirect && runsBefore(mf.name, initEnd, true);
        } else if (chain.length === 1) {
          const { outer } = outerOf(outerBlock);
          const p = outer.parent;
          if (
            (p?.type === "CallExpression" || p?.type === "NewExpression") &&
            p.arguments.includes(outer) &&
            p.range[0] < initEnd
          ) {
            const cn = calleeName(p.callee);
            callback = {
              callee: cn,
              kind: SYNC_CALLEES.has(cn ?? "") ? "sync" : "unknown",
            };
          }
        }
      }
      let cls;
      if (exportSpecifier) {
        cls = "export-specifier";
      } else if (typeRef || def.type === "Type") {
        cls = "type-only";
      } else if (def.type === "FunctionName") {
        cls = sameContext
          ? "hoisted-function-same-context"
          : "hoisted-function-deferred";
      } else if (
        (def.type === "Variable" && defKind !== "var") ||
        def.type === "ClassName"
      ) {
        if (sameContext) {
          cls =
            moduleBinding || v.scope.type === "module"
              ? "tdz-module-evaluation"
              : "tdz-same-scope";
        } else if (indirect) {
          cls = "tdz-indirect";
        } else if (callback?.kind === "sync") {
          cls = "tdz-callback";
        } else if (callback || maybeIndirect) {
          cls = "deferred-maybe-module-evaluation";
        } else {
          cls = "deferred";
        }
      } else if (def.type === "Variable") {
        cls = sameContext
          ? "var-undefined"
          : indirect
            ? "var-undefined-indirect"
            : "deferred";
      } else if (def.type === "TSEnumName" || def.type === "TSModuleName") {
        cls = sameContext ? "enum-namespace-undefined" : "deferred";
      } else if (def.type === "Parameter") {
        cls = sameContext ? "tdz-parameter" : "deferred";
      } else {
        cls = sameContext ? "other-same-context" : "deferred";
      }
      ubd.push({
        beforeFirstDef,
        def0Type: def0.type,
        classSelf,
        cls,
        column: r.identifier.loc.start.column,
        defKind,
        defLine: def.name.loc.start.line,
        defType: def.type,
        exportSpecifier,
        initForm,
        line: r.identifier.loc.start.line,
        moduleBinding,
        name: r.identifier.name,
        ownInit,
        sameContext,
        scopeType: v.scope.type,
        typeRef,
        ...(callback ? { callback } : {}),
        ...(maybeIndirect ? { maybeIndirect: true } : {}),
        deferDepth: chain.length,
        deferredScopeType: deferredScope?.type ?? null,
        ...(deferredBlock
          ? {
              deferredIn:
                deferredBlock.type === "FunctionDeclaration"
                  ? "function-declaration"
                  : (formOf(deferredBlock) ?? "other"),
            }
          : {}),
        ...(indirect ? { indirect: true } : {}),
        functionBinding: Boolean(
          def.type === "FunctionName" ||
          initForm === "arrow" ||
          initForm === "function"
        ),
      });
    }
  }

  // file-level summaries
  const lines = sc.lines.length;
  return {
    edges,
    evalCalls: evalCalls.length,
    fns,
    imports,
    lines,
    moduleFns: moduleFns.map((m) => ({
      fn: m.fn,
      kind: m.kind,
      name: m.name,
    })),
    sccs: sccs.map((c) => ({
      kinds: [...new Set(c.map((n) => kindOfName.get(n)))].sort(),
      names: c,
    })),
    selfRecursive,
    signatures,
    topRefs,
    ubd,
  };
};

// ── the ESLint pass ────────────────────────────────────────────────────
// The real rules, under local aliases for option variants. `fs-eslint/…` are ESLint core's own
// rule objects; `fs-ts/…` are typescript-eslint's.
const ESLINT_RULES = {
  "arrow-body-style": ["error", "as-needed"],
  "fs/func-style-declaration": ["error", "declaration"],
  "fs/func-style-declaration-arrows": [
    "error",
    "declaration",
    { allowArrowFunctions: true },
  ],
  "fs/ubd-nofunc": ["error", { functions: false }],
  "fs/ubd-tdz-only": [
    "error",
    {
      classes: false,
      enums: false,
      functions: false,
      typedefs: false,
      variables: false,
    },
  ],
  "fs/ubd-ts-nofunc": ["error", { functions: false }],
  "fs/ubd-ts-tdz-only": [
    "error",
    {
      classes: false,
      enums: false,
      functions: false,
      typedefs: false,
      variables: false,
    },
  ],
  "func-names": "error",
  "func-style": ["error", "expression", { allowArrowFunctions: true }],
  "no-use-before-define": "error",
  "prefer-arrow-callback": "error",
  "ts/no-use-before-define": "error",
};
const fsPlugin = {
  rules: {
    "func-style-declaration": builtinRules.get("func-style"),
    "func-style-declaration-arrows": builtinRules.get("func-style"),
    "ubd-nofunc": builtinRules.get("no-use-before-define"),
    "ubd-tdz-only": builtinRules.get("no-use-before-define"),
    "ubd-ts-nofunc": tsPlugin.rules["no-use-before-define"],
    "ubd-ts-tdz-only": tsPlugin.rules["no-use-before-define"],
  },
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
      census: { rules: { census: makeCensusRule(sink, rel) } },
      fs: fsPlugin,
      ts: tsPlugin,
    },
    rules: { "census/census": "error", ...rules },
  },
];
// One file: the inventory, and every ESLint report of the topic's rules (inline config ignored,
// and, with { inline: true }, honoured). Returns { ...inventory, eslint: [...] } or { error }.
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
  return {
    ...sink.result,
    eslint: messages
      .filter((m) => m.ruleId && m.ruleId !== "census/census")
      .map((m) => ({
        column: m.column - 1,
        endColumn: m.endColumn ? m.endColumn - 1 : null,
        endLine: m.endLine ?? null,
        fix: Boolean(m.fix),
        line: m.line,
        message: m.message,
        rule: m.ruleId,
        suggestions: (m.suggestions ?? []).map((s) => s.desc),
      })),
  };
};
const isTsFile = (rel) => /\.[cm]?tsx?$/.test(rel);
// The no-use-before-define Ultracite's ESLint preset runs on a file: the base rule on JS files,
// typescript-eslint's on TS files.
const ultraciteUbdRule = (rel) =>
  isTsFile(rel) ? "ts/no-use-before-define" : "no-use-before-define";

// ── misc ───────────────────────────────────────────────────────────────
const writeText = (file, text) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const readText = (file) =>
  existsSync(file) ? readFileSync(file, "utf8") : null;
const sum = (xs, f = (x) => x) => xs.reduce((s, x) => s + f(x), 0);
const share = (a, b) => lib.pct(a, b);

module.exports = {
  ...lib,
  CALIBRATION_DIR,
  ESLINT_RULES,
  EXAMPLES_DIR,
  FORM_GROUP,
  FUNCTION_TYPES,
  OUT_DIR,
  RESULTS_DIR,
  SYNC_CALLEES,
  TMP,
  TOPIC,
  WRAPPERS,
  analyse,
  inventory,
  isFromSeparateExecutionContext,
  isTsFile,
  isVarBound,
  outerOf,
  readText,
  share,
  sum,
  toolVersions,
  ultraciteUbdRule,
  writeText,
};
