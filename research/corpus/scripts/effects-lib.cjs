// Shared definitions for the React effects scripts (effects-*.cjs): the repos measured, the hook
// inventory (every effect, memo and custom hook that takes a dependency array, with what its
// dependencies are and what its body does), the rules this topic is about in each linter, runners
// for Ultracite's Oxlint, ESLint and Biome presets that keep every message, label, help text and
// suggestion (what `ultracite fix --claude/--codex` hands an agent), and the join from a
// diagnostic to the hook it is about.
//
// The rules (confirmed against packages/cli/config by effects-inventory.cjs):
//   Oxlint react preset   react/exhaustive-deps (reported as react-hooks(exhaustive-deps)), and the
//                         React Compiler rules it ports: exhaustive-effect-dependencies,
//                         memo-dependencies, set-state-in-effect, no-deriving-state-in-effects,
//                         rule-suppression, refs, purity, immutability, ... plus rules-of-hooks
//   ESLint react preset   every non-deprecated eslint-plugin-react-hooks rule ("error", no options),
//                         scoped to **/*.{jsx,tsx}, and react-doctor's rules (the effect ones here)
//   Biome react preset    correctness/useExhaustiveDependencies and correctness/useHookAtTopLevel
//   Oxlint js-plugins     react-doctor through oxlint's jsPlugins (opt-in)
//
// Read-only with respect to the clones: files are parsed, never run; linters that fix run on
// copies under TMP.
"use strict";

// The four React codebases the accessibility post added are a separate set. Must be set before
// collect-files.cjs is loaded anywhere in the process.
process.env.CORPUS_REPO_LISTS ??= "repos-accessibility.json";

const { execFileSync, spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, relative, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const sk = require("./sort-keys-lib.cjs");
const { collect, getRepo } = require("./collect-files.cjs");

const { dc } = sk;
const HERE = resolve(__dirname, "..");
const TOPIC = "react-effects";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
const HISTORY_DIR = join(HERE, "repos", "history");
// Copies the linters lint or fix. Ultracite's presets ignore `**/out`, so they can't live in out/.
const TMP =
  process.env.EFFECTS_TMP ?? join(tmpdir(), "ultracite-research-react-effects");
const { CLI, ULTRACITE } = dc;

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

// ── repos ──────────────────────────────────────────────────────────────
const { CORE, REACT, PINNED } = sk;
const DOGFOOD = ["ultracite"];
const ALL = [...CORE, ...REACT];
const SETS = { core: CORE, react: REACT };
const setOf = (name) =>
  CORE.includes(name) ? "core" : REACT.includes(name) ? "react" : "dogfood";
const selectedRepos = (fallback = ALL) => {
  const only = (arg("repos", "") || "").split(",").filter(Boolean);
  return only.length > 0 ? only : fallback;
};
const { permalink, shaOf, checkPinned, repoMeta } = sk;

// ── tools ──────────────────────────────────────────────────────────────
const { Linter, ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
const tsParser = require(
  require.resolve("@typescript-eslint/parser", { paths: [CLI] })
);
const STORE = join(ULTRACITE, "node_modules", ".bun");
const reactHooksDir = dirname(
  require.resolve("eslint-plugin-react-hooks/package.json", { paths: [CLI] })
);
const reactDoctorEslintMain = require.resolve("eslint-plugin-react-doctor", {
  paths: [CLI],
});
const reactDoctorOxlintMain = require.resolve("oxlint-plugin-react-doctor", {
  paths: [ULTRACITE],
});
const pkgVersionUp = (file, name) => {
  let dir = dirname(file);
  while (dir !== dirname(dir)) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      const json = JSON.parse(readFileSync(pkg, "utf8"));
      if (json.name === name) {
        return json.version;
      }
    }
    dir = dirname(dir);
  }
  return null;
};
const toolVersions = () => ({
  ...sk.toolVersions(),
  "eslint-plugin-react-hooks": require(join(reactHooksDir, "package.json"))
    .version,
  "eslint-plugin-react-doctor": pkgVersionUp(
    reactDoctorEslintMain,
    "eslint-plugin-react-doctor"
  ),
  "oxlint-plugin-react-doctor": pkgVersionUp(
    reactDoctorOxlintMain,
    "oxlint-plugin-react-doctor"
  ),
  "eslint-plugin-react": dc.versionOf("eslint-plugin-react", CLI),
  react: require(join(STORE, "react@19.3.0/node_modules/react/package.json"))
    .version,
});

// ── hooks ──────────────────────────────────────────────────────────────
const EFFECT_HOOKS = new Set([
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
]);
const MEMO_HOOKS = new Set(["useCallback", "useMemo"]);
const BUILTIN_DEP_HOOKS = new Set([
  ...EFFECT_HOOKS,
  ...MEMO_HOOKS,
  "useImperativeHandle",
]);
const HOOK_NAME = /^use[A-Z0-9]/;
// `useX` or `React.useX`; also `Anything.useX` for custom hooks on a namespace.
const calleeName = (callee) => {
  if (callee.type === "Identifier") {
    return { name: callee.name, namespace: null };
  }
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    const ns =
      callee.object.type === "Identifier"
        ? callee.object.name
        : callee.object.type === "MemberExpression"
          ? "(member)"
          : "(expr)";
    return { name: callee.property.name, namespace: ns };
  }
  return null;
};

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
]);
const unwrap = (n) => {
  let node = n;
  while (
    node &&
    [
      "TSAsExpression",
      "TSSatisfiesExpression",
      "TSNonNullExpression",
      "TSTypeAssertion",
      "ChainExpression",
      "TSInstantiationExpression",
    ].includes(node.type)
  ) {
    node = node.expression;
  }
  return node;
};
// The variable an identifier refers to, from the scope at `node`.
const findVariable = (scope, name) => {
  let s = scope;
  while (s) {
    const v = s.set.get(name);
    if (v) {
      return v;
    }
    s = s.upper;
  }
  return null;
};
// Root identifier of `a`, `a.b?.c`, `a!.b`, `(a as T).b`.
const rootIdentifier = (expr) => {
  let n = unwrap(expr);
  while (n && (n.type === "MemberExpression" || n.type === "ChainExpression")) {
    n = unwrap(n.type === "ChainExpression" ? n.expression : n.object);
  }
  return n?.type === "Identifier" ? n : null;
};
const memberPath = (expr, text) => text.slice(expr.range[0], expr.range[1]);

// The function a hook call belongs to: its name and whether it's a component or a hook.
const functionName = (fn) => {
  if (fn.id?.name) {
    return fn.id.name;
  }
  let p = fn.parent;
  // forwardRef(fn), memo(fn), React.memo(forwardRef(fn)), observer(fn) ...
  while (p && p.type === "CallExpression") {
    p = p.parent;
  }
  while (
    p &&
    ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"].includes(
      p.type
    )
  ) {
    p = p.parent;
  }
  if (p?.type === "VariableDeclarator" && p.id.type === "Identifier") {
    return p.id.name;
  }
  if (p?.type === "Property" && p.key.type === "Identifier") {
    return p.key.name;
  }
  if (p?.type === "MethodDefinition" && p.key.type === "Identifier") {
    return p.key.name;
  }
  if (p?.type === "ExportDefaultDeclaration") {
    return "(default)";
  }
  if (p?.type === "AssignmentExpression") {
    const l = p.left;
    if (l.type === "Identifier") {
      return l.name;
    }
    if (l.type === "MemberExpression" && l.property.type === "Identifier") {
      return l.property.name;
    }
  }
  return null;
};
const enclosingFunctions = (node) => {
  const out = [];
  let p = node.parent;
  while (p) {
    if (FUNCTION_TYPES.has(p.type)) {
      out.push(p);
    }
    p = p.parent;
  }
  return out;
};
// The nearest enclosing function named like a component or a hook, as exhaustive-deps and
// rules-of-hooks read it. `nested` is true when the hook sits in an inner function inside it.
const ownerOf = (node) => {
  const fns = enclosingFunctions(node);
  for (let i = 0; i < fns.length; i++) {
    const name = functionName(fns[i]);
    if (name && (/^[A-Z]/.test(name) || HOOK_NAME.test(name))) {
      return {
        fn: fns[i],
        kind: HOOK_NAME.test(name) ? "hook" : "component",
        name,
        nested: i > 0,
      };
    }
  }
  return fns[0]
    ? {
        fn: fns[0],
        kind: "other",
        name: functionName(fns[0]),
        nested: false,
      }
    : { fn: null, kind: "module", name: null, nested: false };
};
const within = (inner, outer) =>
  inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1];

// What a variable is, from where it was declared (one or two levels through simple aliases).
// Kinds: prop, state, setter, dispatch, ref, context, memo, callback, effectEvent, transition,
// hookValue (another hook's result), function, object (a literal or `new` built in render),
// constant (a const primitive literal), derived (any other expression in render), let (let/var
// in render), param (a parameter of an inner function), import, outer (module scope or a function
// outside the owner), global (unresolved).
const STATE_HOOKS = new Set(["useState", "useReducer", "useActionState"]);
const describeInit = (init, id, element, depth, ctx) => {
  const n = unwrap(init);
  if (!n) {
    return { kind: "let" };
  }
  if (n.type === "CallExpression") {
    const c = calleeName(n.callee);
    const name =
      c && (c.namespace === null || c.namespace === "React") ? c.name : null;
    if (name && STATE_HOOKS.has(name)) {
      if (element === 0) {
        return { hook: name, kind: "state" };
      }
      if (element === 1) {
        const first = id?.type === "ArrayPattern" ? id.elements[0] : null;
        return {
          hook: name,
          pair: first?.type === "Identifier" ? first.name : null,
          kind:
            name === "useReducer"
              ? "dispatch"
              : name === "useActionState"
                ? "dispatch"
                : "setter",
        };
      }
      return { hook: name, kind: "hookValue" };
    }
    if (name === "useRef") {
      return { hook: name, kind: "ref" };
    }
    if (name === "useContext" || name === "use") {
      return { hook: name, kind: "context" };
    }
    if (name === "useMemo") {
      return { hook: name, kind: "memo" };
    }
    if (name === "useCallback") {
      return { hook: name, kind: "callback" };
    }
    if (name === "useEffectEvent") {
      return { hook: name, kind: "effectEvent" };
    }
    if (name === "useTransition") {
      return { hook: name, kind: element === 1 ? "transition" : "hookValue" };
    }
    const any = calleeName(n.callee)?.name;
    if (any && HOOK_NAME.test(any)) {
      return { hook: any, kind: "hookValue" };
    }
    return { kind: "derived", via: "call" };
  }
  if (
    [
      "ObjectExpression",
      "ArrayExpression",
      "NewExpression",
      "JSXElement",
      "JSXFragment",
      "ClassExpression",
    ].includes(n.type) ||
    (n.type === "Literal" && n.regex)
  ) {
    return { kind: "object", via: n.type };
  }
  if (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression") {
    return { kind: "function" };
  }
  if (
    (n.type === "Literal" && !n.regex) ||
    (n.type === "TemplateLiteral" && n.expressions.length === 0)
  ) {
    return { kind: "constant" };
  }
  // `const x = props.x`, `const { a } = props`, `const b = a.b`: follow the alias.
  if (depth < 3 && (n.type === "Identifier" || n.type === "MemberExpression")) {
    const root = rootIdentifier(n);
    if (root) {
      const inner = ctx.describeIdentifier(root, depth + 1);
      if (inner.kind !== "global") {
        return { ...inner, alias: true };
      }
    }
  }
  return { kind: "derived", via: n.type };
};

// ── the analysis rule ──────────────────────────────────────────────────
// Effect body features. "direct" means in the callback itself; "nested" means inside a function
// the callback creates (a listener, a timer, a promise callback, an async IIFE).
const LISTENER_METHODS = new Set([
  "addEventListener",
  "addListener",
  "on",
  "once",
  "subscribe",
  "listen",
  "watch",
  "onChange",
  "onDidChange",
  "register",
]);
const UNLISTEN_METHODS = new Set([
  "removeEventListener",
  "removeListener",
  "off",
  "unsubscribe",
  "unlisten",
  "dispose",
  "disconnect",
  "unobserve",
  "abort",
  "cancel",
  "destroy",
]);
const TIMERS = new Set([
  "setTimeout",
  "setInterval",
  "requestAnimationFrame",
  "requestIdleCallback",
  "queueMicrotask",
]);
const CLEAR_TIMERS = new Set([
  "clearTimeout",
  "clearInterval",
  "cancelAnimationFrame",
  "cancelIdleCallback",
]);
const OBSERVERS =
  /^(?:ResizeObserver|IntersectionObserver|MutationObserver|PerformanceObserver)$/;
const DOM_METHODS = new Set([
  "focus",
  "blur",
  "scrollTo",
  "scrollIntoView",
  "scrollBy",
  "getBoundingClientRect",
  "setAttribute",
  "removeAttribute",
  "select",
  "click",
  "showModal",
  "close",
  "querySelector",
  "querySelectorAll",
  "getElementById",
  "setSelectionRange",
  "contains",
  "requestFullscreen",
  "setPointerCapture",
  "releasePointerCapture",
  "animate",
  "getContext",
  "play",
  "pause",
]);
const BROWSER_GLOBALS = new Set([
  "document",
  "window",
  "navigator",
  "localStorage",
  "sessionStorage",
  "history",
  "location",
  "matchMedia",
  "getComputedStyle",
]);
const isConstantArg = (a) => {
  const n = unwrap(a);
  if (!n) {
    return true;
  }
  if (n.type === "Literal") {
    return true;
  }
  if (n.type === "Identifier" && n.name === "undefined") {
    return true;
  }
  if (n.type === "ArrayExpression" && n.elements.length === 0) {
    return true;
  }
  if (n.type === "ObjectExpression" && n.properties.length === 0) {
    return true;
  }
  if (n.type === "TemplateLiteral" && n.expressions.length === 0) {
    return true;
  }
  if (n.type === "UnaryExpression" && n.argument.type === "Literal") {
    return true;
  }
  return false;
};

const makeRule = (sink) => ({
  create(context) {
    const { sourceCode } = context;
    const text = sourceCode.text;
    const scopeOf = (node) => sourceCode.getScope(node);

    const describeIdentifier = (ident, depth = 0, owner = null) => {
      const scope = scopeOf(ident);
      const v = findVariable(scope, ident.name);
      if (!v) {
        return { kind: "global" };
      }
      const def = v.defs[0];
      if (!def) {
        return { kind: "global" };
      }
      const ownerFn = owner ?? sink.currentOwner;
      const declaredInOwner = ownerFn && within(def.name, ownerFn);
      if (def.type === "ImportBinding") {
        return { kind: "import", source: def.parent?.source?.value ?? null };
      }
      if (!declaredInOwner) {
        return { kind: "outer" };
      }
      if (def.type === "Parameter") {
        // a parameter of the owner itself, or of an inner function
        return def.node === ownerFn ? { kind: "prop" } : { kind: "param" };
      }
      if (def.type === "FunctionName") {
        return { kind: "function" };
      }
      if (def.type === "ClassName") {
        return { kind: "object", via: "class" };
      }
      if (def.type === "Variable") {
        const decl = def.node; // VariableDeclarator
        let element = null;
        if (decl.id.type === "ArrayPattern") {
          element = decl.id.elements.findIndex(
            (e) =>
              e &&
              (e === def.name ||
                (e.type === "AssignmentPattern" && e.left === def.name) ||
                (e.type === "RestElement" && e.argument === def.name))
          );
        }
        const fromDestructuring = decl.id.type !== "Identifier";
        const d = describeInit(decl.init, decl.id, element, depth, {
          describeIdentifier: (i, dd) => describeIdentifier(i, dd, ownerFn),
        });
        if (
          def.parent?.kind !== "const" &&
          (d.kind === "derived" || d.kind === "constant")
        ) {
          return { ...d, kind: "let", declaredKind: def.parent?.kind };
        }
        return fromDestructuring && d.kind === "object"
          ? { kind: "derived", via: "destructured" }
          : d;
      }
      return { kind: "outer", via: def.type };
    };

    const describeDep = (el, hookNode = null) => {
      if (!el) {
        return { kind: "hole", text: "" };
      }
      const t = memberPath(el, text);
      if (el.type === "SpreadElement") {
        return { kind: "spread", text: t };
      }
      const n = unwrap(el);
      if (n.type === "Literal" || n.type === "TemplateLiteral") {
        return { kind: "literal", text: t };
      }
      const root = rootIdentifier(el);
      if (!root) {
        return { kind: "expression", text: t };
      }
      const d = describeIdentifier(root);
      const isMember = unwrap(el).type !== "Identifier";
      const out = {
        kind: d.kind,
        member: isMember,
        optional: /\?\./.test(t),
        root: root.name,
        text: t,
      };
      if (d.hook) {
        out.hook = d.hook;
      }
      if (d.via) {
        out.via = d.via;
      }
      if (d.source) {
        out.source = d.source;
      }
      // a `const`/`let`/class declared after the hook call: the dependency array is evaluated during
      // render, so listing it throws (temporal dead zone)
      if (hookNode) {
        const v = findVariable(scopeOf(root), root.name);
        const def = v?.defs[0];
        if (
          def &&
          (def.type === "Variable" || def.type === "ClassName") &&
          def.parent?.kind !== "var" &&
          def.name.range[0] > hookNode.range[0]
        ) {
          out.declaredAfter = true;
        }
      }
      if (isMember && d.kind === "ref" && /\.current\b/.test(t)) {
        out.kind = "refCurrent";
      }
      if (isMember && d.kind === "prop") {
        out.kind = "prop";
      }
      return out;
    };

    // The values a hook's callback reads from its owner: identifiers declared in the owner (outside
    // the callback), with the static member path read from each (`a.b.c`, cut before a computed
    // member) and whether that path is called. This is what a dependency rule compares the array
    // with.
    const capturesOf = (cb, ownerFn) => {
      const out = new Map();
      if (!cb || !FUNCTION_TYPES.has(cb.type) || !ownerFn) {
        return [];
      }
      const visit = (node, parent, field) => {
        if (!node || typeof node.type !== "string") {
          return;
        }
        if (node.type === "Identifier") {
          const isProp =
            parent &&
            ((parent.type === "MemberExpression" &&
              field === "property" &&
              !parent.computed) ||
              ((parent.type === "Property" ||
                parent.type === "MethodDefinition") &&
                field === "key" &&
                !parent.computed &&
                !parent.shorthand));
          const isType =
            parent &&
            /^TS/.test(parent.type) &&
            parent.type !== "TSNonNullExpression" &&
            parent.type !== "TSAsExpression" &&
            parent.type !== "TSSatisfiesExpression";
          if (!isProp && !isType) {
            const v = findVariable(scopeOf(node), node.name);
            const def = v?.defs[0];
            if (def && within(def.name, ownerFn) && !within(def.name, cb)) {
              // the member path read from it
              let top = node;
              let path = node.name;
              let p = node.parent;
              while (
                p &&
                ((p.type === "MemberExpression" &&
                  p.object === top &&
                  !p.computed &&
                  p.property.type === "Identifier") ||
                  (p.type === "ChainExpression" && p.expression === top) ||
                  (p.type === "TSNonNullExpression" && p.expression === top))
              ) {
                if (p.type === "MemberExpression") {
                  path += `${p.optional ? "?." : "."}${p.property.name}`;
                }
                top = p;
                p = p.parent;
              }
              const called = p?.type === "CallExpression" && p.callee === top;
              const isWrite =
                p?.type === "AssignmentExpression" && p.left === top;
              const key = `${path}${called ? "()" : ""}`;
              if (!out.has(key)) {
                const d = describeIdentifier(node, 0, ownerFn);
                out.set(key, {
                  called,
                  kind: d.kind,
                  name: node.name,
                  path,
                  write: isWrite,
                });
              }
            }
          }
        }
        for (const key of Object.keys(node)) {
          if (
            key === "parent" ||
            key === "loc" ||
            key === "range" ||
            key === "typeAnnotation" ||
            key === "returnType" ||
            key === "typeParameters" ||
            key === "typeArguments"
          ) {
            continue;
          }
          const v = node[key];
          if (Array.isArray(v)) {
            for (const c of v) {
              if (c && typeof c.type === "string") {
                visit(c, node, key);
              }
            }
          } else if (v && typeof v.type === "string") {
            visit(v, node, key);
          }
        }
      };
      visit(cb.body, cb, "body");
      return [...out.values()];
    };

    // Features of an effect's callback.
    const features = (cb, ownerFn) => {
      const f = {
        async: false,
        asyncCallback: Boolean(cb.async),
        cleanup: null,
        conditional: false,
        contextRead: false,
        dom: false,
        fetch: false,
        listener: false,
        nestedFunctions: 0,
        observer: false,
        promise: false,
        propCalls: [],
        refRead: false,
        refWrite: false,
        setterArgs: [],
        settersDirect: [],
        settersNested: [],
        statesSetDirect: [],
        storage: false,
        subscribe: false,
        timer: false,
        unlisten: false,
        externalCalls: [],
      };
      if (cb.type === "Identifier") {
        f.cleanup = "unknown";
        return f;
      }
      if (!FUNCTION_TYPES.has(cb.type)) {
        f.cleanup = "unknown";
        return f;
      }
      if (cb.body.type !== "BlockStatement") {
        const b = unwrap(cb.body);
        if (
          b.type === "ArrowFunctionExpression" ||
          b.type === "FunctionExpression"
        ) {
          f.cleanup = "function";
        } else if (b.type === "CallExpression") {
          f.cleanup = "call-result";
        } else if (b.type === "Identifier") {
          f.cleanup = "identifier";
        } else {
          f.cleanup = null;
        }
      }
      const visit = (node, depthFns, parent, field) => {
        if (!node || typeof node.type !== "string") {
          return;
        }
        const inner = node !== cb && FUNCTION_TYPES.has(node.type);
        const d = inner ? depthFns + 1 : depthFns;
        if (inner) {
          f.nestedFunctions++;
          if (node.async) {
            f.async = true;
          }
        }
        if (node.type === "AwaitExpression") {
          f.async = true;
        }
        if (
          depthFns === 0 &&
          node.type === "ReturnStatement" &&
          node.argument &&
          f.cleanup !== "function"
        ) {
          const a = unwrap(node.argument);
          f.cleanup =
            a.type === "ArrowFunctionExpression" ||
            a.type === "FunctionExpression"
              ? "function"
              : a.type === "CallExpression"
                ? "call-result"
                : a.type === "Identifier"
                  ? "identifier"
                  : (f.cleanup ?? "other");
        }
        if (
          depthFns === 0 &&
          ["IfStatement", "ConditionalExpression", "SwitchStatement"].includes(
            node.type
          )
        ) {
          f.conditional = true;
        }
        if (
          depthFns === 0 &&
          node.type === "LogicalExpression" &&
          parent?.type === "ExpressionStatement"
        ) {
          f.conditional = true;
        }
        if (
          node.type === "NewExpression" &&
          node.callee.type === "Identifier"
        ) {
          if (OBSERVERS.test(node.callee.name)) {
            f.observer = true;
          }
          if (
            /^(?:WebSocket|EventSource|Worker|BroadcastChannel)$/.test(
              node.callee.name
            )
          ) {
            f.subscribe = true;
          }
          if (node.callee.name === "AbortController") {
            f.promise = true;
          }
        }
        if (node.type === "MemberExpression" && !node.computed) {
          const root = rootIdentifier(node);
          if (root && BROWSER_GLOBALS.has(root.name)) {
            const v = findVariable(scopeOf(root), root.name);
            if (!v || v.defs.length === 0) {
              f.dom = true;
              if (/Storage$/.test(root.name)) {
                f.storage = true;
              }
            }
          }
          if (
            node.property.type === "Identifier" &&
            node.property.name === "current"
          ) {
            const r = rootIdentifier(node);
            if (r) {
              const desc = describeIdentifier(r, 0, ownerFn);
              if (desc.kind === "ref") {
                const isWrite =
                  parent?.type === "AssignmentExpression" &&
                  field === "left" &&
                  parent.left === node;
                if (isWrite) {
                  f.refWrite = true;
                } else {
                  f.refRead = true;
                }
              }
            }
          }
          if (
            node.property.type === "Identifier" &&
            [
              "style",
              "classList",
              "scrollTop",
              "scrollLeft",
              "innerHTML",
              "textContent",
              "value",
            ].includes(node.property.name) &&
            parent?.type === "MemberExpression"
          ) {
            // ref.current.style.x = ..., el.classList.add(...)
            const r = rootIdentifier(node);
            if (r) {
              const desc = describeIdentifier(r, 0, ownerFn);
              if (desc.kind === "ref") {
                f.dom = true;
              }
            }
          }
        }
        if (node.type === "CallExpression") {
          const callee = unwrap(node.callee);
          if (callee.type === "Identifier") {
            const name = callee.name;
            const desc = describeIdentifier(callee, 0, ownerFn);
            if (desc.kind === "setter" || desc.kind === "dispatch") {
              (d === 0 ? f.settersDirect : f.settersNested).push(name);
              if (d === 0 && desc.pair) {
                f.statesSetDirect.push(desc.pair);
              }
              if (d === 0) {
                const a = node.arguments[0];
                f.setterArgs.push(
                  !a
                    ? "none"
                    : isConstantArg(a)
                      ? "constant"
                      : FUNCTION_TYPES.has(unwrap(a).type)
                        ? "updater"
                        : "value"
                );
              }
            } else if (desc.kind === "prop") {
              f.propCalls.push({ direct: d === 0, name });
            } else if (desc.kind === "context") {
              f.contextRead = true;
            } else if (desc.kind === "global") {
              if (name === "fetch") {
                f.fetch = true;
              }
              if (TIMERS.has(name)) {
                f.timer = true;
              }
              if (CLEAR_TIMERS.has(name)) {
                f.unlisten = true;
              }
              if (name === "matchMedia" || name === "getComputedStyle") {
                f.dom = true;
              }
            } else if (
              [
                "import",
                "outer",
                "function",
                "callback",
                "hookValue",
                "derived",
                "memo",
                "effectEvent",
              ].includes(desc.kind)
            ) {
              f.externalCalls.push({ direct: d === 0, kind: desc.kind, name });
            }
          } else if (
            callee.type === "MemberExpression" &&
            !callee.computed &&
            callee.property.type === "Identifier"
          ) {
            const m = callee.property.name;
            const root = rootIdentifier(callee);
            const rootDesc = root
              ? describeIdentifier(root, 0, ownerFn)
              : { kind: "expression" };
            if (LISTENER_METHODS.has(m)) {
              if (m === "addEventListener") {
                f.listener = true;
              } else {
                f.subscribe = true;
              }
            }
            if (UNLISTEN_METHODS.has(m)) {
              f.unlisten = true;
            }
            if (m === "observe") {
              f.observer = true;
            }
            if (m === "then" || m === "catch" || m === "finally") {
              f.promise = true;
            }
            if (
              m === "fetch" ||
              (root && /^(?:axios|ky|got)$/.test(root.name))
            ) {
              f.fetch = true;
            }
            if (DOM_METHODS.has(m) && rootDesc.kind !== "setter") {
              if (
                rootDesc.kind === "ref" ||
                (root && BROWSER_GLOBALS.has(root.name))
              ) {
                f.dom = true;
              }
            }
            if (rootDesc.kind === "prop") {
              f.propCalls.push({
                direct: d === 0,
                name: memberPath(callee, text),
              });
            }
            if (root && TIMERS.has(m) && root.name === "window") {
              f.timer = true;
            }
            if (root && CLEAR_TIMERS.has(m)) {
              f.unlisten = true;
            }
            if (
              ["import", "outer", "hookValue", "context", "derived"].includes(
                rootDesc.kind
              )
            ) {
              f.externalCalls.push({
                direct: d === 0,
                kind: rootDesc.kind,
                name: memberPath(callee, text).slice(0, 60),
              });
            }
          }
        }
        for (const key of Object.keys(node)) {
          if (key === "parent" || key === "loc" || key === "range") {
            continue;
          }
          const v = node[key];
          if (Array.isArray(v)) {
            for (const c of v) {
              if (c && typeof c.type === "string") {
                visit(c, d, node, key);
              }
            }
          } else if (v && typeof v.type === "string") {
            visit(v, d, node, key);
          }
        }
      };
      visit(cb, 0, null, null);
      return f;
    };

    return {
      CallExpression(node) {
        const c = calleeName(node.callee);
        if (!c) {
          return;
        }
        const { name } = c;
        if (name === "useEffectEvent") {
          sink.counts.useEffectEvent++;
        }
        if (name === "useState") {
          sink.counts.useState++;
        }
        if (name === "useReducer") {
          sink.counts.useReducer++;
        }
        if (name === "useRef") {
          sink.counts.useRef++;
        }
        if (name === "useContext") {
          sink.counts.useContext++;
        }
        if (name === "useSyncExternalStore") {
          sink.counts.useSyncExternalStore++;
        }
        if (!HOOK_NAME.test(name)) {
          return;
        }
        const builtin =
          BUILTIN_DEP_HOOKS.has(name) &&
          (c.namespace === null || c.namespace === "React");
        const depsIndex = builtin
          ? name === "useImperativeHandle"
            ? 2
            : 1
          : -1;
        let depsArg = null;
        let cbIndex = -1;
        if (builtin) {
          depsArg = node.arguments[depsIndex] ?? null;
          cbIndex = depsIndex - 1;
        } else {
          // A custom hook "takes a dependency array" when one of its arguments after the first is
          // an array literal and the argument before it is a function (useX(fn, [deps])), or
          // when its last argument is an array literal of identifiers and member paths.
          const argsList = node.arguments;
          for (let i = 1; i < argsList.length; i++) {
            if (
              argsList[i].type === "ArrayExpression" &&
              FUNCTION_TYPES.has(unwrap(argsList[i - 1]).type)
            ) {
              depsArg = argsList[i];
              cbIndex = i - 1;
              break;
            }
          }
          if (!depsArg) {
            return;
          }
        }
        const owner = ownerOf(node);
        sink.currentOwner = owner.fn;
        // Where the hook's name comes from.
        let importSource = null;
        let binding = "global";
        const bindingId =
          node.callee.type === "Identifier"
            ? node.callee
            : node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier"
              ? node.callee.object
              : null;
        if (bindingId) {
          const v = findVariable(scopeOf(bindingId), bindingId.name);
          const def = v?.defs[0];
          if (def?.type === "ImportBinding") {
            binding = "import";
            importSource = def.parent?.source?.value ?? null;
          } else if (def) {
            binding = "local";
          }
        }
        const cb = cbIndex >= 0 ? (node.arguments[cbIndex] ?? null) : null;
        const depsForm = !depsArg
          ? "none"
          : depsArg.type === "ArrayExpression"
            ? depsArg.elements.length === 0
              ? "empty"
              : "literal"
            : "non-literal";
        const deps =
          depsArg?.type === "ArrayExpression"
            ? depsArg.elements.map((el) => describeDep(el, node))
            : [];
        const isEffect = builtin && EFFECT_HOOKS.has(name);
        const row = {
          arity: node.arguments.length,
          binding,
          builtin,
          callback: cb
            ? {
                async: Boolean(cb.async),
                type: cb.type,
              }
            : null,
          column: node.loc.start.column + 1,
          deps,
          depsCount: deps.length,
          depsForm,
          depsLine: depsArg?.loc.start.line ?? null,
          depsRange: depsArg ? depsArg.range : null,
          endLine: node.loc.end.line,
          file: sink.file,
          importSource,
          kind: isEffect
            ? "effect"
            : builtin && MEMO_HOOKS.has(name)
              ? "memo"
              : builtin
                ? "imperative"
                : "custom",
          line: node.loc.start.line,
          name,
          namespace: c.namespace,
          owner: {
            kind: owner.kind,
            line: owner.fn?.loc.start.line ?? null,
            name: owner.name,
            nested: owner.nested,
          },
          range: node.range,
        };
        if (isEffect && cb) {
          row.features = features(cb, owner.fn);
        }
        if (cb) {
          row.captures = capturesOf(cb, owner.fn);
        }
        sink.rows.push(row);
      },
      "Program:exit"() {
        sink.lines = text.split("\n").length;
      },
    };
  },
  meta: { schema: [], type: "problem" },
});

// Count component and custom-hook definitions (functions named like them).
const countDefinitions = (ast) => {
  const out = { components: 0, customHooks: 0 };
  const seen = new Set();
  sk.walk(ast, (n) => {
    if (!FUNCTION_TYPES.has(n.type)) {
      return;
    }
    const name = functionName(n);
    if (!name || seen.has(n)) {
      return;
    }
    seen.add(n);
    if (HOOK_NAME.test(name)) {
      out.customHooks++;
    } else if (/^[A-Z]/.test(name)) {
      out.components++;
    }
  });
  return out;
};

const linter = new Linter({ configType: "flat" });
const newCounts = () => ({
  useContext: 0,
  useEffectEvent: 0,
  useReducer: 0,
  useRef: 0,
  useState: 0,
  useSyncExternalStore: 0,
});
// Analyse one file: every hook call with a dependency array (and every built-in that could take
// one), plus counts. Returns { rows, counts, lines, error }.
const analyse = (text, rel) => {
  const sink = {
    counts: newCounts(),
    currentOwner: null,
    file: rel,
    lines: text.split("\n").length,
    rows: [],
  };
  const jsx = /\.(?:tsx|jsx|js|mjs|cjs)$/.test(rel);
  const configFor = (withJsx) => [
    {
      files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaFeatures: { jsx: withJsx },
          sourceType: "module",
        },
        sourceType: "module",
      },
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "off",
      },
      plugins: { fx: { rules: { census: makeRule(sink) } } },
      rules: { "fx/census": "error" },
    },
  ];
  let messages = linter.verify(text, configFor(jsx), { filename: rel });
  let fatal = messages.find((m) => m.fatal);
  if (fatal && /\.(?:js|mjs|cjs)$/.test(rel)) {
    sink.rows = [];
    sink.counts = newCounts();
    messages = linter.verify(text, configFor(false), { filename: rel });
    fatal = messages.find((m) => m.fatal);
  }
  let definitions = { components: 0, customHooks: 0 };
  if (!fatal) {
    const parsed = sk.safeParse(text, rel);
    if (parsed.ast) {
      definitions = countDefinitions(parsed.ast);
    }
  }
  return {
    counts: { ...sink.counts, ...definitions },
    error: fatal ? fatal.message : null,
    lines: sink.lines,
    rows: sink.rows,
  };
};

// ── the "You Might Not Need an Effect" reading ─────────────────────────
// A mechanical reading of one effect, using only its own body and dependency kinds. Precedence
// follows how strong the static sign is. `chain` needs the other effects in the same owner.
const REACTIVE_KINDS = new Set([
  "prop",
  "state",
  "context",
  "memo",
  "callback",
  "hookValue",
  "derived",
  "function",
  "object",
  "let",
]);
// Calls on a hook's or context's value that update state held elsewhere (a form, a store, a query
// cache), and navigation.
const STORE_UPDATE =
  /(?:^|\.)(?:reset|resetField|setValue|setValues|setFieldValue|setError|clearErrors|trigger|set[A-Z]\w*|clear[A-Z]?\w*|update[A-Z]?\w*|invalidateQueries|setQueryData|refetch|mutate)$/;
const NAVIGATION =
  /(?:^|\.)(?:push|replace|back|forward|prefetch|navigate|reload)$/;
const classifyEffect = (row, siblings = []) => {
  const f = row.features;
  if (!f) {
    return { category: "not-an-effect", chainWith: [], signs: [] };
  }
  const signs = [];
  const direct = f.externalCalls.filter((c) => c.direct);
  const navigation = f.externalCalls.some(
    (c) =>
      NAVIGATION.test(c.name) &&
      (/router|history|navigat/i.test(c.name) ||
        (c.kind === "hookValue" && /^navigate$/.test(c.name)))
  );
  const external =
    f.listener ||
    f.subscribe ||
    f.timer ||
    f.observer ||
    f.dom ||
    f.storage ||
    f.refWrite ||
    navigation;
  const fetchLike =
    f.fetch || ((f.promise || f.async) && f.settersNested.length > 0);
  const storeUpdate = direct.some(
    (c) =>
      ["hookValue", "context", "memo", "callback", "derived"].includes(
        c.kind
      ) && STORE_UPDATE.test(c.name)
  );
  const depKinds = new Set(row.deps.map((d) => d.kind));
  const reactiveDeps = row.deps.filter((d) => REACTIVE_KINDS.has(d.kind));
  for (const [on, sign] of [
    [f.listener, "listener"],
    [f.subscribe, "subscription"],
    [f.timer, "timer"],
    [f.observer, "observer"],
    [f.dom, "dom"],
    [f.storage, "storage"],
    [f.refWrite, "ref-write"],
    [navigation, "navigation"],
    [fetchLike, "fetch"],
    [f.settersDirect.length > 0, "sync-setState"],
    [f.settersNested.length > 0, "nested-setState"],
    [storeUpdate, "store-update"],
    [f.propCalls.length > 0, "calls-prop"],
    [f.conditional, "conditional"],
  ]) {
    if (on) {
      signs.push(sign);
    }
  }
  // An effect chain: this effect sets state synchronously that another effect in the same owner
  // depends on, and that effect sets state synchronously too.
  const setsHere = new Set(f.statesSetDirect);
  const chainWith = siblings.filter(
    (s) =>
      s !== row &&
      s.features &&
      s.features.settersDirect.length > 0 &&
      s.deps.some((d) => d.kind === "state" && setsHere.has(d.root))
  );
  let category;
  if (fetchLike && !external) {
    category = "data-fetching";
  } else if (external) {
    category = "external-sync";
  } else if (f.settersDirect.length > 0 && chainWith.length > 0) {
    category = "effect-chain";
  } else if (
    f.settersDirect.length > 0 &&
    f.setterArgs.length > 0 &&
    f.setterArgs.every((a) => a === "constant") &&
    depKinds.has("prop")
  ) {
    category = "reset-state-on-prop-change";
  } else if (f.settersDirect.length > 0 && row.depsForm !== "none") {
    category = "derived-state";
  } else if (storeUpdate) {
    category = "store-or-form-update";
  } else if (f.propCalls.some((p) => p.direct)) {
    category = "notify-parent";
  } else if (
    row.depsForm === "literal" &&
    reactiveDeps.length > 0 &&
    direct.length > 0 &&
    f.conditional
  ) {
    category = "event-specific";
  } else if (row.depsForm === "empty") {
    category = "mount-only";
  } else {
    category = "unclassified";
  }
  return { category, chainWith: chainWith.map((s) => s.line), signs };
};

// ── rules this topic is about ──────────────────────────────────────────
// Oxlint names (`react/…`) as the presets spell them; the diagnostic code of react/exhaustive-deps
// and react/rules-of-hooks is `react-hooks(...)`.
const OXLINT_HOOK_RULES = [
  "react/exhaustive-deps",
  "react/rules-of-hooks",
  "react/exhaustive-effect-dependencies",
  "react/memo-dependencies",
  "react/set-state-in-effect",
  "react/no-deriving-state-in-effects",
  "react/set-state-in-render",
  "react/rule-suppression",
  "react/refs",
  "react/purity",
  "react/immutability",
  "react/globals",
  "react/hooks",
  "react/use-memo",
  "react/void-use-memo",
  "react/preserve-manual-memoization",
  "react/incompatible-library",
  "react/static-components",
  "react/capitalized-calls",
  "react/error-boundaries",
  "react/unsupported-syntax",
  "react/invariant",
  "react/todo",
  "react/syntax",
];
// Oxlint reports some react rules under the `react-hooks` scope; normalise to the config name.
const oxlintConfigName = (code) => {
  const m = /^([a-z0-9_-]+)\((.+)\)$/.exec(code ?? "");
  if (!m) {
    return code ?? "parse";
  }
  const scope = m[1].replace(/^eslint-plugin-/, "").replaceAll("_", "-");
  if (scope === "eslint") {
    return m[2];
  }
  return `${scope === "react-hooks" ? "react" : scope}/${m[2]}`;
};
// What Ultracite's agent handoff calls the rule (packages/cli/src/agent-fix/linters.ts
// toOxlintRuleName): `plugin/rule` from the diagnostic code, unnormalised.
const oxlintHandoffName = (code) => {
  const m = /^([\w-]+)\(([^)]+)\)$/.exec(code ?? "");
  if (!m) {
    return code;
  }
  return m[1] === "eslint" ? m[2] : `${m[1]}/${m[2]}`;
};
const DEP_RULES = {
  biome: ["lint/correctness/useExhaustiveDependencies"],
  eslint: ["react-hooks/exhaustive-deps"],
  oxlint: ["react/exhaustive-deps"],
};
// The React Compiler's dependency checks (Oxlint's port and eslint-plugin-react-hooks 7).
const COMPILER_DEP_RULES = [
  "react/exhaustive-effect-dependencies",
  "react/memo-dependencies",
  "react-hooks/exhaustive-effect-dependencies",
  "react-hooks/memo-dependencies",
  "react-hooks/memoized-effect-dependencies",
];
// react-doctor rules about effects, their dependencies and state set in effects (by id and title
// in react-doctor's registry; effects-inventory.cjs records which preset turns each on).
const REACT_DOCTOR_EFFECT_RULES = [
  "activity-wraps-effect-heavy-subtree",
  "advanced-event-handler-refs",
  "effect-listener-cleanup-mismatch",
  "effect-listener-cleanup-reference-mismatch",
  "effect-needs-cleanup",
  "effect-observer-needs-disconnect",
  "effect-raf-loop-needs-cancel",
  "effect-remove-listener-inline-handler",
  "exhaustive-deps",
  "hooks-no-nan-in-deps",
  "no-adjust-state-on-prop-change",
  "no-async-effect-callback",
  "no-cascading-set-state",
  "no-chain-state-updates",
  "no-derived-state",
  "no-derived-state-effect",
  "no-effect-chain",
  "no-effect-event-handler",
  "no-effect-event-in-deps",
  "no-effect-with-fresh-deps",
  "no-effect-wrapper-discards-callback-cleanup-return",
  "no-event-trigger-state",
  "no-fetch-in-effect",
  "no-initialize-state",
  "no-mirror-prop-effect",
  "no-mutable-in-deps",
  "no-pass-data-to-parent",
  "no-pass-live-state-to-parent",
  "no-prop-callback-in-effect",
  "no-promise-then-side-effect-in-effect-without-catch",
  "no-reset-all-state-on-prop-change",
  "no-self-updating-effect",
  "no-set-state-after-await-in-effect",
  "no-stale-timer-ref",
  "prefer-use-effect-event",
  "prefer-use-sync-external-store",
  "query-no-query-in-effect",
  "query-no-mutation-in-effect-as-read",
  "rerender-dependencies",
  "rules-of-hooks",
].map((id) => `react-doctor/${id}`);
const isHookRule = (name) =>
  /^react-hooks\//.test(name) ||
  OXLINT_HOOK_RULES.includes(name) ||
  REACT_DOCTOR_EFFECT_RULES.includes(name) ||
  name === "lint/correctness/useExhaustiveDependencies" ||
  name === "lint/correctness/useHookAtTopLevel";

// Kinds of dependency-rule diagnostic, from each linter's message.
const ESLINT_KINDS = [
  [/has (?:a )?missing dependenc/, "missing"],
  [/has (?:an )?unnecessary dependenc/, "unnecessary"],
  [/Outer scope values like/, "unnecessary-outer"],
  [
    /(?:makes|could make) the dependencies of .* change on every render/,
    "unstable",
  ],
  [/will likely have changed by the time this effect cleanup/, "ref-cleanup"],
  [/Effect callbacks are synchronous to prevent race conditions/, "async"],
  [/was passed a dependency list that is not an array literal/, "non-literal"],
  [/has a complex expression in the dependency array/, "complex"],
  [/has a spread element in its dependency array/, "spread"],
  [/received a function whose dependencies are unknown/, "unknown-callback"],
  [/does nothing when called with only one argument/, "no-array-memo"],
  [
    /Without a list of dependencies, this can lead to an infinite chain/,
    "no-array-setstate",
  ],
  [
    /Functions returned from `useEffectEvent` must not be included/,
    "effect-event-dep",
  ],
  [/will be lost after each render/, "assignment-lost"],
  [/requires an effect callback|requires a callback/, "no-callback"],
  [/is a duplicate|duplicate/i, "duplicate"],
  [/literal|constant/i, "literal"],
];
const OXLINT_KINDS = [
  // the React Compiler port (exhaustive-effect-dependencies, memo-dependencies)
  [
    /^Found missing\/extra (?:effect|memoization) dependencies/,
    "missing+unnecessary",
  ],
  [/^Found missing (?:effect|memoization) dependencies/, "missing"],
  [/^Found extra (?:effect|memoization) dependencies/, "unnecessary"],
  [/has missing dependenc|has a missing dependency/i, "missing"],
  [/unnecessary dependenc/i, "unnecessary"],
  [/outer scope/i, "unnecessary-outer"],
  [/changes every render|change on every render/i, "unstable"],
  [
    /ref's value `\.current` is accessed directly in the effect cleanup/i,
    "ref-cleanup",
  ],
  [/async/i, "async"],
  [/not an array literal|dependency list that is not an array/i, "non-literal"],
  [/complex expression/i, "complex"],
  [/spread/i, "spread"],
  [
    /unknown dependencies|function whose dependencies are unknown/i,
    "unknown-callback",
  ],
  [
    /only one argument|without a dependency array|no dependency array/i,
    "no-array",
  ],
  [/infinite/i, "no-array-setstate"],
  [/useEffectEvent/i, "effect-event-dep"],
  [/lost after each render/i, "assignment-lost"],
  [/literal/i, "literal"],
];
const BIOME_KINDS = [
  [/does not specify its dependency on/, "missing"],
  [/specifies more dependencies than necessary/, "unnecessary"],
  [/changes on every re-render/, "unstable"],
  [/specifies a dependency more specific than its captures/, "too-specific"],
  [/stable/i, "stable"],
  [/outer scope/i, "unnecessary-outer"],
  [
    /no dependency array|without a dependencies array|does not have a dependencies array/i,
    "no-array",
  ],
];
const kindOf = (table, message) =>
  table.find(([re]) => re.test(message ?? ""))?.[1] ?? "other";

// ── runners ────────────────────────────────────────────────────────────
// Oxlint. `configFile` is a generated config (writeOxlintRoot). Keeps every label.
const oxlintBin = dc.oxlintBin;
const runOxlint = ({ cwd, files, configFile, keep = null, env = null }) => {
  const out = [];
  const CHUNK = 300;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    const r = spawnSync(
      process.execPath,
      [
        oxlintBin,
        "-c",
        configFile,
        "--disable-nested-config",
        "--format",
        "json",
        ...chunk,
      ],
      {
        cwd,
        encoding: "utf8",
        env: env ?? process.env,
        maxBuffer: 1 << 30,
      }
    );
    const start = r.stdout.indexOf("{");
    if (start === -1) {
      throw new Error(`oxlint printed no JSON: ${r.stderr.slice(0, 500)}`);
    }
    const report = JSON.parse(r.stdout.slice(start));
    if (report.number_of_files !== chunk.length) {
      throw new Error(
        `oxlint linted ${report.number_of_files} of ${chunk.length} files`
      );
    }
    for (const d of report.diagnostics) {
      const rule = d.code ? oxlintConfigName(d.code) : "oxlint";
      if (keep && !keep(rule)) {
        continue;
      }
      const span = d.labels?.[0]?.span ?? {};
      out.push({
        code: d.code ?? null,
        column: span.column ?? null,
        file: d.filename,
        handoffRule: d.code ? oxlintHandoffName(d.code) : "oxlint",
        help: d.help ?? null,
        labels: (d.labels ?? []).map((l) => ({
          column: l.span?.column,
          label: l.label ?? null,
          length: l.span?.length,
          line: l.span?.line,
          offset: l.span?.offset,
        })),
        line: span.line ?? null,
        message: d.message,
        offset: span.offset ?? null,
        rule,
        severity: d.severity,
        url: d.url ?? null,
      });
    }
  }
  return out;
};
// `oxlint --fix` / `--fix-suggestions` / `--fix-dangerously`, in place (run it on copies).
const oxlintFix = ({ cwd, files, configFile, mode = "--fix" }) => {
  const CHUNK = 300;
  for (let i = 0; i < files.length; i += CHUNK) {
    spawnSync(
      process.execPath,
      [
        oxlintBin,
        "-c",
        configFile,
        "--disable-nested-config",
        mode,
        ...files.slice(i, i + CHUNK),
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
    );
  }
};
// Configs. `init`: the root config `ultracite init` writes (env, extends, ignorePatterns; and the
// js-plugins wiring). `only`: one or more rules alone, every category off.
const presetUrl = (p) =>
  JSON.stringify(
    pathToFileURL(join(CLI, "config/oxlint", p, "index.mjs")).href
  );
const writeOxlintInit = (
  dir,
  presets = ["core", "react"],
  { init = true } = {}
) => {
  mkdirSync(dir, { recursive: true });
  const file = join(
    dir,
    `oxlint.${presets.join("+")}${init ? "" : ".extends"}.config.mjs`
  );
  const ids = presets.map((_, i) => `preset${i}`);
  const lines = presets.map((p, i) => `import ${ids[i]} from ${presetUrl(p)};`);
  const hasJs = presets.includes("js-plugins");
  if (hasJs) {
    lines.push(`import { jsPluginSettings } from ${presetUrl("js-plugins")};`);
  }
  const core = ids[presets.indexOf("core")];
  const props = [
    init && core ? `env: ${core}.env` : null,
    `extends: [${ids.join(", ")}]`,
    init && core ? `ignorePatterns: ${core}.ignorePatterns` : null,
    hasJs ? `jsPlugins: ${ids[presets.indexOf("js-plugins")]}.jsPlugins` : null,
    hasJs ? "settings: jsPluginSettings" : null,
  ].filter(Boolean);
  lines.push(
    "",
    "// Generated by effects-lib.cjs: Ultracite's presets, wired the way `ultracite init` does.",
    `export default { ${props.join(", ")} };`,
    ""
  );
  writeFileSync(file, lines.join("\n"));
  return file;
};
const writeOxlintOnly = (
  dir,
  name,
  rules,
  { jsPlugins = null, settings = null } = {}
) => {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `oxlint.${name}.config.json`);
  const plugins = [
    ...new Set(
      Object.keys(rules)
        .map((r) => r.split("/")[0])
        .filter((p) => ["react", "react-perf", "jsx-a11y"].includes(p))
    ),
  ];
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        categories: {
          correctness: "off",
          nursery: "off",
          pedantic: "off",
          perf: "off",
          restriction: "off",
          style: "off",
          suspicious: "off",
        },
        plugins,
        ...(jsPlugins ? { jsPlugins } : {}),
        rules,
        ...(settings ? { settings } : {}),
      },
      null,
      2
    )}\n`
  );
  return file;
};

// ESLint with Ultracite's own preset modules. Keeps messages, fixes and every suggestion with its
// text and range. `inline: true` honours the files' own disable comments (reported); the default
// ignores them (raw). `extra` adds config blocks (e.g. the react block for .ts files). A rule that
// throws is turned off for that file and recorded in `crashes`.
const eslintConfig = async ({
  presets = ["core", "react"],
  keep,
  inline,
  extra = [],
}) => {
  const blocks = await dc.eslintBlocks({ keep, presets });
  return [
    ...blocks,
    {
      linterOptions: {
        noInlineConfig: !inline,
        reportUnusedDisableDirectives: "off",
      },
    },
    ...extra,
  ];
};
// ESLint's "has no effect because you have 'noInlineConfig'" warnings (raw mode) and "Definition for
// rule '…' was not found" errors (a disable comment naming a plugin Ultracite doesn't load) are
// dropped.
const eslintRows = (r, cwd) =>
  r.messages
    .filter(
      (m) =>
        (m.ruleId || m.fatal) &&
        !/^Definition for rule '.+' was not found\.$/.test(m.message)
    )
    .map((m) => ({
      column: m.column,
      endColumn: m.endColumn ?? null,
      endLine: m.endLine ?? m.line,
      file: relative(cwd, r.filePath),
      fix: m.fix ? { range: m.fix.range, text: m.fix.text } : null,
      line: m.line,
      message: m.message,
      messageId: m.messageId ?? null,
      rule: m.ruleId ?? (m.fatal ? `parse: ${m.message}` : "inline-config"),
      suggestions: (m.suggestions ?? []).map((s) => ({
        desc: s.desc,
        fix: s.fix ? { range: s.fix.range, text: s.fix.text } : null,
      })),
    }));
const runEslint = async ({
  cwd,
  files,
  presets = ["core", "react"],
  keep = isHookRule,
  inline = false,
  extra = [],
  crashes = null,
}) => {
  const overrideConfig = await eslintConfig({ extra, inline, keep, presets });
  const make = (more = []) =>
    new ESLint({
      cwd,
      errorOnUnmatchedPattern: false,
      ignore: false,
      overrideConfig: [...overrideConfig, ...more],
      overrideConfigFile: true,
    });
  const eslint = make();
  const out = [];
  const CHUNK = 200;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    try {
      for (const r of await eslint.lintFiles(chunk)) {
        out.push(...eslintRows(r, cwd));
      }
      continue;
    } catch {
      // one file at a time
    }
    for (const file of chunk) {
      const off = [];
      for (;;) {
        try {
          const e =
            off.length > 0
              ? make([
                  { rules: Object.fromEntries(off.map((x) => [x, "off"])) },
                ])
              : eslint;
          for (const r of await e.lintFiles([file])) {
            out.push(...eslintRows(r, cwd));
          }
          break;
        } catch (error) {
          const rule =
            error.ruleId ?? /Rule: "([^"]+)"/.exec(String(error.message))?.[1];
          if (!rule || off.includes(rule)) {
            throw error;
          }
          off.push(rule);
          crashes?.push({
            error: String(error.message).split("\n")[0].slice(0, 200),
            file,
            rule,
          });
        }
      }
    }
  }
  return out;
};
// The rule configuration a file actually gets, from ESLint's own resolver.
const eslintResolved = async ({ cwd, file, presets = ["core", "react"] }) => {
  const blocks = await dc.eslintBlocks({ presets });
  const instance = new ESLint({
    cwd,
    overrideConfig: blocks,
    overrideConfigFile: true,
  });
  return instance.calculateConfigForFile(file);
};
// The react block applied to .ts/.js files too (a counterfactual: Ultracite's preset scopes it to
// .jsx/.tsx).
const eslintReactOnAllFiles = async () => {
  const react = await dc.importDefault(
    join(CLI, "config/eslint/react/eslint.config.mjs")
  );
  return react.map((b) => ({
    ...b,
    files: ["**/*.{ts,mts,cts,js,mjs,cjs}"],
  }));
};

// Biome: a config with the hook rules alone (Ultracite's react preset sets both to "error" with no
// options), or Ultracite's presets extended by absolute path.
const BIOME_HOOK_RULES = {
  assist: { enabled: false },
  files: { ignoreUnknown: true, maxSize: 10_000_000 },
  formatter: { enabled: false },
  javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
  linter: {
    enabled: true,
    rules: {
      correctness: {
        useExhaustiveDependencies: "error",
        useHookAtTopLevel: "error",
      },
      recommended: false,
    },
  },
  root: true,
  vcs: { enabled: false },
};
const writeBiomeConfig = (dir, name, body) => {
  const configDir = join(dir, `biome-${name}`);
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    join(configDir, "biome.json"),
    `${JSON.stringify(body, null, 2)}\n`
  );
  return configDir;
};
const biomeHookConfig = (dir) =>
  writeBiomeConfig(dir, "hooks", BIOME_HOOK_RULES);
const biomeUltraciteConfig = (dir, presets = ["core", "react"]) =>
  writeBiomeConfig(dir, `ultracite-${presets.join("+")}`, {
    extends: presets.map((p) => join(CLI, "config/biome", p, "biome.jsonc")),
    javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
    root: true,
    vcs: { enabled: false },
  });
const runBiome = ({
  cwd,
  files,
  configDir,
  keep = (r) => /useExhaustiveDependencies|useHookAtTopLevel/.test(r),
}) => sk.runBiome({ configDir, cwd, files, keep });
// The terminal reporter, for each diagnostic's notes and fix text.
const biomeConsole = ({ cwd, files, configDir }) => {
  const out = [];
  const CHUNK = 100;
  for (let i = 0; i < files.length; i += CHUNK) {
    out.push(
      ...sk.biomeConsole({ configDir, cwd, files: files.slice(i, i + CHUNK) })
    );
  }
  return out;
};
const biomeWrite = (opts) => sk.biomeWrite(opts);

// ── joining diagnostics to hooks ───────────────────────────────────────
const lineStarts = (text) => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
};
const offsetOf = (starts, line, column) => starts[line - 1] + (column - 1);
// The innermost hook call whose range contains the offset; ESLint's "makes the dependencies …
// change on every render" is reported at the declaration and names the hook's line.
const hookAt = (hooks, offset) => {
  let best = null;
  for (const h of hooks) {
    if (offset >= h.range[0] && offset <= h.range[1]) {
      if (!best || h.range[1] - h.range[0] < best.range[1] - best.range[0]) {
        best = h;
      }
    }
  }
  return best;
};
const matchHook = (hooks, starts, d) => {
  const atLine = /\(at line (\d+)\)/.exec(d.message ?? "");
  if (atLine) {
    const line = Number(atLine[1]);
    const h = hooks.filter((x) => x.line === line || x.depsLine === line);
    if (h.length > 0) {
      return h[0];
    }
  }
  if (d.offset !== null && d.offset !== undefined) {
    const h = hookAt(hooks, d.offset);
    if (h) {
      return h;
    }
  }
  if (d.line) {
    return hookAt(hooks, offsetOf(starts, d.line, d.column ?? 1));
  }
  return null;
};

// ── mirrors ────────────────────────────────────────────────────────────
// Same-length neutralisation of suppression directives, so positions don't move.
const neutralise = (t) =>
  t
    .replace(
      /\b(eslint|oxlint)-(disable|enable)/g,
      (_, tool, verb) => `${"x".repeat(tool.length)}-${verb}`
    )
    .replace(/\bbiome-ignore/g, "xxxxx-ignore");
const writeCopy = (name, files, root, transform = (t) => t) => {
  rmSync(root, { force: true, recursive: true });
  const src = getRepo(name).root;
  for (const rel of files) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, transform(readFileSync(join(src, rel), "utf8"), rel));
  }
  return root;
};

// ── small helpers ──────────────────────────────────────────────────────
const readJson = (p, fallback = null) =>
  existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback;
const writeJson = sk.writeJson;
const writeJsonl = sk.writeJsonl;
const readJsonl = (p) => (existsSync(p) ? sk.readJsonl(p) : []);
const pct = dc.pct;
const per10k = dc.per10k;
const rng = sk.rng;
const shuffle = sk.shuffle;
const hookId = (repo, h) => `${repo}:${h.file}:${h.line}:${h.column}`;
const countBy = (xs, f) => {
  const out = {};
  for (const x of xs) {
    const k = f(x);
    if (k === null || k === undefined) {
      continue;
    }
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(out).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  );
};

module.exports = {
  ALL,
  BIOME_HOOK_RULES,
  BIOME_KINDS,
  BUILTIN_DEP_HOOKS,
  CALIBRATION_DIR,
  CLI,
  COMPILER_DEP_RULES,
  CORE,
  DEP_RULES,
  DOGFOOD,
  EFFECT_HOOKS,
  ESLINT_KINDS,
  ESLint,
  EXAMPLES_DIR,
  HERE,
  HISTORY_DIR,
  MEMO_HOOKS,
  OUT_DIR,
  OXLINT_HOOK_RULES,
  OXLINT_KINDS,
  PINNED,
  REACT,
  REACT_DOCTOR_EFFECT_RULES,
  RESULTS_DIR,
  SETS,
  STORE,
  TMP,
  TOPIC,
  ULTRACITE,
  analyse,
  arg,
  biomeConsole,
  biomeHookConfig,
  biomeUltraciteConfig,
  biomeWrite,
  checkPinned,
  classifyEffect,
  collect,
  countBy,
  dc,
  eslintConfig,
  eslintReactOnAllFiles,
  eslintResolved,
  execFileSync,
  flag,
  getRepo,
  hookId,
  isHookRule,
  kindOf,
  lineStarts,
  matchHook,
  neutralise,
  offsetOf,
  oxlintBin,
  oxlintConfigName,
  oxlintFix,
  oxlintHandoffName,
  pct,
  per10k,
  permalink,
  reactDoctorEslintMain,
  reactDoctorOxlintMain,
  reactHooksDir,
  readJson,
  readJsonl,
  repoMeta,
  rng,
  runBiome,
  runEslint,
  runOxlint,
  selectedRepos,
  setOf,
  shaOf,
  shuffle,
  sk,
  spawnSync,
  toolVersions,
  tsParser,
  writeBiomeConfig,
  writeCopy,
  writeJson,
  writeJsonl,
  writeOxlintInit,
  writeOxlintOnly,
};
