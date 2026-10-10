// Syntactic async census: finds the async mistakes the type-aware rules look for, without type
// information, in every file of every repo (including the ones whose types don't resolve here).
// It can only see promises it can name from syntax, so it's a different instrument from the
// type-aware rules, validated against them in async-detector-check.cjs.
//
//   floating-call    a bare statement calling a same-file async function (or one annotated to
//                    return a Promise), by name or as `this.name()`; also async IIFEs
//   floating-chain   a `.then(a)` or `.finally(f)` statement: no rejection handler, not returned
//                    or awaited (`.catch(h)` or `.then(a, b)` count as handled)
//   async-callback   an async function passed straight to a call, by callee (`forEach`,
//                    `addEventListener`, `on`, `setTimeout`, `useEffect`, ...)
//   map-async        `.map(async ...)`, by what happens to the array: Promise.all/allSettled/
//                    race/any (directly or through a variable), returned, awaited, a bare
//                    statement, or other
//   await-in-loop    `await` inside a loop body, with ESLint's own boundaries (functions and
//                    `for await` loops), so it should equal Oxlint's raw `no-await-in-loop` count
//   async-no-await   async functions with no `await` (generators and empty functions skipped, as
//                    ESLint's require-await does), by what they return
//   markers          explicit fire-and-forget: `void x` statements, `.catch` handlers by what they
//                    do (empty, a no-op reference, log only, or something else), and suppression
//                    comments that name an async rule
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-census.cjs [--topic floating-promises] [--repos a,b]
// Writes results/<topic>/async-census.json and out/floating-promises/<repo>.sites.json (every
// site, gitignored, for sampling and the detector check).
"use strict";

const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const { collect } = require("./collect-files.cjs");
const config = require("./repos.json");
const { dirs } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "floating-promises");
const ONLY = (arg("repos", "") || "").split(",").filter(Boolean);
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", "floating-promises");
const DOGFOOD = new Set(["ultracite"]);

const estreePath = require.resolve("@typescript-eslint/typescript-estree", {
  paths: [dirs.tsParser],
});
const { parse } = require(estreePath);
const { visitorKeys } = require(
  require.resolve("@typescript-eslint/visitor-keys", { paths: [dirs.tsParser] })
);
const estreeVersion = require(
  join(estreePath.slice(0, estreePath.lastIndexOf("/dist/")), "package.json")
).version;

// ── helpers ────────────────────────────────────────────────────────────
const FUNCTIONS = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);
const isFunction = (node) => FUNCTIONS.has(node?.type);
const isAsyncFn = (node) => isFunction(node) && node.async;

// Wrappers that don't change what a value is.
const unwrap = (node) => {
  let n = node;
  while (
    n &&
    [
      "ChainExpression",
      "TSAsExpression",
      "TSNonNullExpression",
      "TSSatisfiesExpression",
      "TSTypeAssertion",
    ].includes(n.type)
  ) {
    n = n.expression;
  }
  return n;
};

const propName = (member) => {
  if (member?.type !== "MemberExpression" || member.computed) {
    return null;
  }
  return member.property.type === "Identifier" ||
    member.property.type === "PrivateIdentifier"
    ? member.property.name
    : null;
};

// A name for the callee of a call, for grouping: `forEach`, `addEventListener`, `setTimeout`.
const calleeLabel = (call) => {
  const callee = unwrap(call.callee);
  if (callee.type === "Identifier") {
    return callee.name;
  }
  return propName(callee) ?? callee.type;
};

const PROMISE_TYPE = /^(?:Promise|PromiseLike)$/;
const returnsPromiseType = (fn) => {
  const ann = fn.returnType?.typeAnnotation;
  return (
    ann?.type === "TSTypeReference" &&
    ann.typeName.type === "Identifier" &&
    PROMISE_TYPE.test(ann.typeName.name)
  );
};

const PROMISE_COMBINATORS = new Set(["all", "allSettled", "any", "race"]);
const isPromiseCombinator = (call) => {
  const callee = unwrap(call?.callee);
  return (
    call?.type === "CallExpression" &&
    callee?.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    callee.object.name === "Promise" &&
    PROMISE_COMBINATORS.has(propName(callee))
  );
};

// Async rules whose suppression comments are counted (Oxlint/ESLint names and Biome names).
const ASYNC_RULE =
  /(?:no-floating-promises|no-misused-promises|require-await|no-await-in-loop|no-async-promise-executor|no-promise-executor-return|await-thenable|return-await|no-return-await|promise-function-async|prefer-await-to-then|prefer-await-to-callbacks|promise\/[a-z-]+|no-array-for-each|noFloatingPromises|noMisusedPromises|useAwait|noAwaitInLoops?|noAsyncPromiseExecutor|noForEach|array-foreach|no-then)\b/;
const DISABLE =
  /^\s*(eslint|oxlint)-disable(?:-next-line|-line)?(?:\s+([^\n]*?))?(?:\s+--.*)?\s*$/s;
const BIOME =
  /^\s*biome-ignore(?:-all|-start|-end)?\s+lint\/[a-zA-Z]+\/([a-zA-Z]+)/;

const NOOP_NAME =
  /^(?:noop|nop|NOOP|NOP|ignore|ignoreError|swallow|swallowError|identity|_)$/;
const LOG_CALL = (call) => {
  const callee = unwrap(call?.callee);
  if (call?.type !== "CallExpression") {
    return false;
  }
  if (callee.type === "MemberExpression") {
    const obj = unwrap(callee.object);
    return (
      (obj.type === "Identifier" &&
        /^(?:console|log|logger|Log)$/.test(obj.name)) ||
      /^(?:warn|error|log|debug|info|trace)$/.test(propName(callee) ?? "")
    );
  }
  return (
    callee.type === "Identifier" &&
    /^(?:log|warn|debug|logError|warnOnce)$/i.test(callee.name)
  );
};

// What a rejection handler does: nothing, a no-op reference, only logs, or something else.
const handlerKind = (handler, comments) => {
  if (!handler) {
    return "missing";
  }
  const h = unwrap(handler);
  if (h.type === "Identifier") {
    if (h.name === "undefined") {
      return "missing";
    }
    return NOOP_NAME.test(h.name) ? "noop-ref" : "handler-ref";
  }
  if (h.type === "MemberExpression") {
    const obj = unwrap(h.object);
    return obj.type === "Identifier" && obj.name === "console"
      ? "log-only"
      : "handler-ref";
  }
  if (!isFunction(h)) {
    return "other";
  }
  const commented = comments.some(
    (c) => c.range[0] >= h.body.range[0] && c.range[1] <= h.body.range[1]
  );
  if (h.body.type !== "BlockStatement") {
    const b = unwrap(h.body);
    if (
      (b.type === "Identifier" && b.name === "undefined") ||
      (b.type === "Literal" && b.value === null) ||
      (b.type === "UnaryExpression" &&
        b.operator === "void" &&
        b.argument.type === "Literal")
    ) {
      return commented ? "empty (commented)" : "empty";
    }
    return LOG_CALL(b) ? "log-only" : "handles";
  }
  const statements = h.body.body;
  if (statements.length === 0) {
    return commented ? "empty (commented)" : "empty";
  }
  if (
    statements.every(
      (s) => s.type === "ExpressionStatement" && LOG_CALL(unwrap(s.expression))
    )
  ) {
    return "log-only";
  }
  return "handles";
};

const bump = (obj, key, n = 1) => {
  obj[key] = (obj[key] ?? 0) + n;
};

const emptyTally = () => ({
  asyncCallback: { byCallee: {}, total: 0 },
  asyncFunctions: 0,
  asyncNoAwait: { byContext: {}, byReturn: {}, total: 0 },
  awaitExpressions: 0,
  awaitInLoop: { byLoop: {}, total: 0 },
  catchCalls: { byHandler: {}, total: 0 },
  disables: { byRule: {}, total: 0 },
  floatingCall: { byTarget: {}, total: 0 },
  floatingChain: { byEnd: {}, total: 0 },
  mapAsync: { byFate: {}, total: 0 },
  thenCalls: 0,
  thenRejectionHandlers: { byHandler: {}, total: 0 },
  voidStatements: { byOperand: {}, total: 0 },
});

// ── one file ───────────────────────────────────────────────────────────
const setParents = (ast) => {
  const visit = (node, parent) => {
    node.parent = parent;
    for (const key of visitorKeys[node.type] ?? []) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c.type === "string") {
            visit(c, node);
          }
        }
      } else if (child && typeof child.type === "string") {
        visit(child, node);
      }
    }
  };
  visit(ast, null);
};

const walk = (ast, fn) => {
  const visit = (node) => {
    fn(node);
    for (const key of visitorKeys[node.type] ?? []) {
      const child = node[key];
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
};

const enclosingFunction = (node) => {
  let n = node.parent;
  while (n && !isFunction(n)) {
    n = n.parent;
  }
  return n;
};

// ESLint's no-await-in-loop: is `node` (a direct child of `parent`) evaluated once per iteration?
const isLooped = (node, parent) => {
  switch (parent.type) {
    case "ForStatement":
      return (
        node === parent.test || node === parent.update || node === parent.body
      );
    case "ForOfStatement":
    case "ForInStatement":
      return node === parent.body;
    case "WhileStatement":
    case "DoWhileStatement":
      return node === parent.test || node === parent.body;
    default:
      return false;
  }
};
const isLoopBoundary = (node) =>
  isFunction(node) || (node.type === "ForOfStatement" && node.await);
const loopOf = (awaitNode) => {
  let node = awaitNode;
  let parent = node.parent;
  while (parent && !isLoopBoundary(parent)) {
    if (isLooped(node, parent)) {
      return parent;
    }
    node = parent;
    parent = parent.parent;
  }
  return null;
};

// Does a function's own body (not nested functions) contain an await?
const hasOwnAwait = (fn) => {
  let found = false;
  const visit = (node) => {
    if (found) {
      return;
    }
    if (node !== fn && isFunction(node)) {
      return;
    }
    if (
      node.type === "AwaitExpression" ||
      (node.type === "ForOfStatement" && node.await) ||
      (node.type === "VariableDeclaration" && node.kind === "await using")
    ) {
      found = true;
      return;
    }
    for (const key of visitorKeys[node.type] ?? []) {
      const child = node[key];
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
  visit(fn.body);
  return found;
};

const ownReturns = (fn) => {
  const out = [];
  const visit = (node) => {
    if (node !== fn && isFunction(node)) {
      return;
    }
    if (node.type === "ReturnStatement") {
      out.push(node);
    }
    for (const key of visitorKeys[node.type] ?? []) {
      const child = node[key];
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
  visit(fn.body);
  return out;
};

// What an async function without await returns.
const returnKind = (fn) => {
  if (fn.body.type !== "BlockStatement") {
    const b = unwrap(fn.body);
    if (b.type === "CallExpression" || b.type === "NewExpression") {
      return "returns a call";
    }
    return "returns a value";
  }
  const returns = ownReturns(fn).filter((r) => r.argument);
  if (returns.length === 0) {
    return "returns nothing";
  }
  if (
    returns.some((r) =>
      ["CallExpression", "NewExpression"].includes(unwrap(r.argument).type)
    )
  ) {
    return "returns a call";
  }
  return "returns a value";
};

// Where a function sits: class method, object method, callback argument, export, other.
const fnContext = (fn) => {
  const p = fn.parent;
  if (
    p?.type === "MethodDefinition" ||
    p?.type === "TSAbstractMethodDefinition"
  ) {
    return "class method";
  }
  if (p?.type === "PropertyDefinition") {
    return "class property";
  }
  if (p?.type === "Property") {
    return "object property";
  }
  if (p?.type === "CallExpression" && p.arguments.includes(fn)) {
    return "callback argument";
  }
  let n = p;
  while (n && n.type === "VariableDeclarator") {
    n = n.parent?.parent;
  }
  if (
    fn.parent?.type === "ExportNamedDeclaration" ||
    fn.parent?.type === "ExportDefaultDeclaration" ||
    n?.type === "ExportNamedDeclaration"
  ) {
    return "exported function";
  }
  return "other function";
};

const nameOfFn = (fn) => {
  if (fn.id?.name) {
    return fn.id.name;
  }
  const p = fn.parent;
  if (p?.type === "VariableDeclarator" && p.id.type === "Identifier") {
    return p.id.name;
  }
  if (
    ["MethodDefinition", "Property", "PropertyDefinition"].includes(p?.type)
  ) {
    return p.key?.name ?? p.key?.value ?? null;
  }
  return null;
};

// Does `name` appear as (part of) an argument to Promise.all/allSettled/race/any inside `scope`?
const passedToCombinator = (scope, name) => {
  let found = false;
  walk(scope, (node) => {
    if (found || !isPromiseCombinator(node)) {
      return;
    }
    walk(node.arguments[0] ?? node, (inner) => {
      if (inner.type === "Identifier" && inner.name === name) {
        found = true;
      }
    });
  });
  return found;
};

// What happens to the array of promises from `.map(async ...)`.
const mapFate = (call) => {
  let n = call;
  let p = n.parent;
  while (
    p &&
    [
      "ChainExpression",
      "TSAsExpression",
      "TSNonNullExpression",
      "TSSatisfiesExpression",
    ].includes(p.type)
  ) {
    n = p;
    p = p.parent;
  }
  if (p?.type === "CallExpression" && p.arguments.includes(n)) {
    if (isPromiseCombinator(p)) {
      return "Promise combinator";
    }
    // Array.from(...), [...].concat(...) and so on: follow one level.
    return `passed to ${calleeLabel(p)}`;
  }
  if (p?.type === "SpreadElement" || p?.type === "ArrayExpression") {
    let q = p;
    while (q && (q.type === "SpreadElement" || q.type === "ArrayExpression")) {
      q = q.parent;
    }
    if (q?.type === "CallExpression" && isPromiseCombinator(q)) {
      return "Promise combinator";
    }
    return "in an array";
  }
  if (p?.type === "AwaitExpression") {
    return "awaited directly (an array)";
  }
  if (p?.type === "ReturnStatement" || (isFunction(p) && p.body === n)) {
    return "returned";
  }
  if (p?.type === "ExpressionStatement") {
    return "bare statement";
  }
  if (p?.type === "VariableDeclarator" && p.id.type === "Identifier") {
    const scope = enclosingFunction(p) ?? p.parent.parent;
    return passedToCombinator(scope, p.id.name)
      ? "Promise combinator (via variable)"
      : "stored, not combined";
  }
  if (p?.type === "MemberExpression" && p.object === n) {
    return `chained (.${propName(p) ?? "?"})`;
  }
  return "other";
};

const scanFile = (text, rel, tally, sites) => {
  const ast = parse(text, {
    comment: true,
    errorOnUnknownASTType: false,
    jsx: /\.[jt]sx$/.test(rel) || /\.(?:js|mjs|cjs)$/.test(rel),
    loc: true,
    range: true,
  });
  setParents(ast);
  const comments = ast.comments ?? [];
  const site = (kind, node, extra) =>
    sites.push({
      col: node.loc.start.column + 1,
      endLine: node.loc.end.line,
      file: rel,
      kind,
      line: node.loc.start.line,
      ...extra,
    });

  // Pass 1: same-file names that return promises.
  const asyncFns = new Map(); // name -> "async" | "annotated"
  const asyncMethods = new Map();
  walk(ast, (node) => {
    if (!isFunction(node)) {
      return;
    }
    const why =
      node.async && !node.generator
        ? "async"
        : returnsPromiseType(node)
          ? "annotated"
          : null;
    if (!why) {
      return;
    }
    const p = node.parent;
    if (node.type === "FunctionDeclaration" && node.id) {
      asyncFns.set(node.id.name, why);
    } else if (p?.type === "VariableDeclarator" && p.id.type === "Identifier") {
      asyncFns.set(p.id.name, why);
    } else if (
      (p?.type === "MethodDefinition" || p?.type === "PropertyDefinition") &&
      !p.computed &&
      (p.key.type === "Identifier" || p.key.type === "PrivateIdentifier")
    ) {
      asyncMethods.set(p.key.name, why);
    }
  });

  const asyncTarget = (call) => {
    const callee = unwrap(call.callee);
    if (callee.type === "Identifier" && asyncFns.has(callee.name)) {
      return {
        name: callee.name,
        target: `function (${asyncFns.get(callee.name)})`,
      };
    }
    if (
      callee.type === "MemberExpression" &&
      unwrap(callee.object).type === "ThisExpression" &&
      asyncMethods.has(propName(callee))
    ) {
      return {
        name: `this.${propName(callee)}`,
        target: `method (${asyncMethods.get(propName(callee))})`,
      };
    }
    if (isAsyncFn(callee)) {
      return { name: "(IIFE)", target: "async IIFE" };
    }
    return null;
  };

  walk(ast, (node) => {
    switch (node.type) {
      case "AwaitExpression": {
        tally.awaitExpressions++;
        const loop = loopOf(node);
        if (loop) {
          tally.awaitInLoop.total++;
          const kind =
            loop.type === "ForOfStatement"
              ? "for…of"
              : loop.type.replace("Statement", "");
          bump(tally.awaitInLoop.byLoop, kind);
          site("await-in-loop", node, {
            loop: kind,
            loopLine: loop.loc.start.line,
          });
        }
        break;
      }
      case "VariableDeclaration": {
        // `await using` disposes asynchronously at the end of each iteration.
        if (node.kind === "await using") {
          const loop = loopOf(node);
          if (loop) {
            tally.awaitInLoop.total++;
            bump(tally.awaitInLoop.byLoop, "await using");
            site("await-in-loop", node, {
              loop: "await using",
              loopLine: loop.loc.start.line,
            });
          }
        }
        break;
      }
      case "ForOfStatement": {
        // A `for await` loop nested in another loop is reported by no-await-in-loop too.
        if (node.await && node.parent) {
          const loop = loopOf(node);
          if (loop) {
            tally.awaitInLoop.total++;
            bump(tally.awaitInLoop.byLoop, "for await (nested)");
            site("await-in-loop", node, {
              loop: "for await (nested)",
              loopLine: loop.loc.start.line,
            });
          }
        }
        break;
      }
      case "ArrowFunctionExpression":
      case "FunctionDeclaration":
      case "FunctionExpression": {
        if (!node.async) {
          break;
        }
        tally.asyncFunctions++;
        const empty =
          node.body.type === "BlockStatement" && node.body.body.length === 0;
        if (node.generator || empty || hasOwnAwait(node)) {
          break;
        }
        const ret = returnKind(node);
        const ctx = fnContext(node);
        tally.asyncNoAwait.total++;
        bump(tally.asyncNoAwait.byReturn, ret);
        bump(tally.asyncNoAwait.byContext, ctx);
        // ESLint reports a method at its key; report the function's start line either way.
        const at = [
          "MethodDefinition",
          "Property",
          "PropertyDefinition",
        ].includes(node.parent?.type)
          ? node.parent
          : node;
        site("async-no-await", at, {
          context: ctx,
          name: nameOfFn(node),
          returns: ret,
        });
        break;
      }
      case "CallExpression": {
        const prop = propName(unwrap(node.callee));
        if (prop === "then") {
          tally.thenCalls++;
          if (node.arguments.length >= 2) {
            tally.thenRejectionHandlers.total++;
            bump(
              tally.thenRejectionHandlers.byHandler,
              handlerKind(node.arguments[1], comments)
            );
          }
        }
        if (prop === "catch") {
          tally.catchCalls.total++;
          const kind = handlerKind(node.arguments[0], comments);
          bump(tally.catchCalls.byHandler, kind);
          if (/empty|noop/.test(kind)) {
            site("swallowing-catch", node, { handler: kind });
          }
        }
        const fnArg = node.arguments.find((a) => isAsyncFn(a));
        if (
          fnArg &&
          !(node.callee.type === "Identifier" && node.callee.name === "Promise")
        ) {
          const label = calleeLabel(node);
          if (label === "map" && fnArg === node.arguments[0]) {
            const fate = mapFate(node);
            tally.mapAsync.total++;
            bump(tally.mapAsync.byFate, fate);
            site("map-async", node, { fate });
          } else {
            tally.asyncCallback.total++;
            bump(tally.asyncCallback.byCallee, label);
            site("async-callback", fnArg, {
              callee: label,
              callLine: node.loc.start.line,
            });
          }
        }
        break;
      }
      case "NewExpression": {
        const fnArg = node.arguments.find((a) => isAsyncFn(a));
        if (fnArg) {
          tally.asyncCallback.total++;
          const label = `new ${unwrap(node.callee).name ?? "?"}`;
          bump(tally.asyncCallback.byCallee, label);
          site("async-callback", fnArg, {
            callee: label,
            callLine: node.loc.start.line,
          });
        }
        break;
      }
      case "ExpressionStatement": {
        const e = unwrap(node.expression);
        if (e.type === "UnaryExpression" && e.operator === "void") {
          const operand = unwrap(e.argument);
          let kind = "other";
          if (operand.type === "CallExpression") {
            const p = propName(unwrap(operand.callee));
            kind = asyncTarget(operand)
              ? "a same-file async call"
              : ["then", "catch", "finally"].includes(p)
                ? "a promise chain"
                : "another call";
          } else if (
            operand.type === "Identifier" ||
            operand.type === "MemberExpression"
          ) {
            kind = "a variable or property";
          }
          tally.voidStatements.total++;
          bump(tally.voidStatements.byOperand, kind);
          site("void", node, { operand: kind });
          break;
        }
        if (e.type !== "CallExpression") {
          break;
        }
        const prop = propName(unwrap(e.callee));
        if (prop === "then" || prop === "finally") {
          // As typescript-eslint does: `.finally(f)` passes rejections through, so it's handled
          // when the promise before it is (`p.catch(h).finally(f)`).
          let last = e;
          while (propName(unwrap(last.callee)) === "finally") {
            const inner = unwrap(unwrap(last.callee).object);
            if (inner?.type !== "CallExpression") {
              break;
            }
            last = inner;
          }
          const lastProp = propName(unwrap(last.callee));
          const handled =
            (lastProp === "then" && last.arguments.length >= 2) ||
            (lastProp === "catch" && last.arguments.length >= 1);
          if (!handled) {
            const end = `.${prop}(${prop === "then" ? "a" : "f"})`;
            tally.floatingChain.total++;
            bump(tally.floatingChain.byEnd, end);
            site("floating-chain", node, { end });
          }
          break;
        }
        if (prop === "catch") {
          if (e.arguments.length === 0) {
            tally.floatingChain.total++;
            bump(tally.floatingChain.byEnd, ".catch()");
            site("floating-chain", node, { end: ".catch()" });
          }
          break;
        }
        const target = asyncTarget(e);
        if (target) {
          tally.floatingCall.total++;
          bump(tally.floatingCall.byTarget, target.target);
          site("floating-call", node, target);
        }
        break;
      }
      default:
    }
  });

  for (const comment of comments) {
    const value = comment.value.replace(/^\*+/, "");
    const disable = DISABLE.exec(value);
    const biome = BIOME.exec(value);
    const rules = disable
      ? (disable[2] ?? "")
          .split(",")
          .map((r) => r.trim())
          .filter((r) => ASYNC_RULE.test(r))
      : biome && ASYNC_RULE.test(biome[1])
        ? [biome[1]]
        : [];
    if (rules.length === 0) {
      continue;
    }
    tally.disables.total++;
    for (const r of rules) {
      bump(tally.disables.byRule, `${disable ? disable[1] : "biome"}: ${r}`);
    }
    site("disable", comment, {
      rules,
      text: comment.value.trim().slice(0, 160),
    });
  }
};

// Adds b's counts into a.
const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === "number") {
      a[k] = (a[k] ?? 0) + v;
    } else {
      a[k] ??= {};
      merge(a[k], v);
    }
  }
  return a;
};

const per10k = (n, lines) => Math.round((n / lines) * 1e5) / 10;

const main = () => {
  mkdirSync(RESULTS_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const names = config.repos
    .map((r) => r.name)
    .filter((n) => ONLY.length === 0 || ONLY.includes(n));
  const repos = {};
  const pooled = emptyTally();
  let pooledLines = 0;
  for (const name of names) {
    const { repo, files } = collect(name);
    const tally = emptyTally();
    const sites = [];
    let lines = 0;
    const failures = [];
    for (const rel of files) {
      const text = readFileSync(join(repo.root, rel), "utf8");
      lines += text.split("\n").length;
      try {
        scanFile(text, rel, tally, sites);
      } catch (error) {
        failures.push({
          error: String(error.message).slice(0, 200),
          file: rel,
        });
      }
    }
    repos[name] = {
      dogfood: DOGFOOD.has(name),
      failures,
      files: files.length,
      lines,
      per10k: {
        asyncCallback: per10k(tally.asyncCallback.total, lines),
        awaitInLoop: per10k(tally.awaitInLoop.total, lines),
        floatingCall: per10k(tally.floatingCall.total, lines),
        floatingChain: per10k(tally.floatingChain.total, lines),
      },
      tally,
    };
    if (!DOGFOOD.has(name)) {
      merge(pooled, tally);
      pooledLines += lines;
    }
    writeFileSync(
      join(OUT_DIR, `${name}.sites.json`),
      JSON.stringify({ repo: name, sites }, null, 1)
    );
    console.log(
      `${name}: ${files.length} files, floating calls ${tally.floatingCall.total}, chains ${tally.floatingChain.total}, async callbacks ${tally.asyncCallback.total}, map(async) ${tally.mapAsync.total}, await in loop ${tally.awaitInLoop.total}, async no await ${tally.asyncNoAwait.total}, void ${tally.voidStatements.total}, disables ${tally.disables.total}, failures ${failures.length}`
    );
  }
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Syntax only. Pooled numbers exclude the dogfood repo. Sites are in out/floating-promises/<repo>.sites.json.",
    pooled: { lines: pooledLines, tally: pooled },
    repos,
    tools: {
      node: process.version,
      "@typescript-eslint/typescript-estree": estreeVersion,
    },
  };
  writeFileSync(
    join(RESULTS_DIR, "async-census.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
};

main();
