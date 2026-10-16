// What JSX-level accessibility rules can't see, measured statically on the JSX files of every
// measured repo (syntax only, plus module resolution inside each clone; nothing is installed or run).
//
//   elements    every JSX element, by DOM element versus custom component (capitalised or member
//               tag), and member factories such as `motion.div` or Radix's `Primitive.button`
//   props       every accessibility-relevant prop (alt, aria-*, role, tabIndex, htmlFor, and id on a
//               form control) on DOM elements, by literal, dynamic expression or absent; elements with
//               spread props, and what the spread is (`{...props}`, a call, an object literal); the
//               same props passed to custom components, which no jsx-a11y rule reads
//   handlers    onClick and other jsx-a11y handlers on non-interactive DOM elements, and whether role,
//               tabIndex and a key handler are there literally, dynamically, or possibly in a spread
//   components  interactive or labelled custom components (Button, Link, Input, Label, Dialog …):
//               each usage resolved to its definition in the same repo (imports through tsconfig paths
//               and workspace package names, re-exports, forwardRef/memo, `const Comp = asChild ? Slot
//               : "button"`, member factories), and what the definition's root renders: a native
//               element, a polymorphic element with a native default, another component, a third-party
//               component, a context provider or nothing
//   --lint      two counterfactual lints, each against a baseline with the same config:
//               mapping   Oxlint and ESLint with settings["jsx-a11y"].components set to what each
//                         component renders (only names that resolve to one DOM tag across the repo):
//                         the extra diagnostics are what the rules would say if they knew
//               spreads   Oxlint and ESLint on copies with every spread prop on a DOM element blanked
//                         out (same length, so positions don't move): the extra diagnostics are verdicts
//                         that depend on what the spread contains
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/a11y-jsx-census.cjs [--lint] [--repos a,b]
// Writes results/accessibility/jsx-census.json and out/accessibility/jsx-census/<repo>.json (every
// element and definition, gitignored).
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");

const lib = require("./a11y-lib.cjs");
const ic = require("./import-cycles-lib.cjs");

const { dc, ts } = lib;
const OUT = join(lib.OUT_DIR, "jsx-census");
const RESULT = join(lib.RESULTS_DIR, "jsx-census.json");

// The tsconfig that supplies paths for each repo. Radix's packages extend a config package the
// sparse clone doesn't have, so it uses defaults (its packages import each other by package name,
// which the workspace fallback resolves). Supabase Studio's tsconfig extends `tsconfig/nextjs.json`
// (not in the sparse clone), which sets baseUrl "."; it is set here so `components/…` resolves.
const SETUP = {
  excalidraw: { tsconfig: "tsconfig.json" },
  "next.js": { tsconfig: "packages/next/tsconfig.json" },
  radix: { tsconfig: null },
  "react-aria": { tsconfig: "tsconfig.json" },
  shadcn: { tsconfig: "apps/v4/tsconfig.json" },
  supabase: { baseUrl: "apps/studio", tsconfig: "apps/studio/tsconfig.json" },
  trpc: { tsconfig: "tsconfig.json" },
};

// ── element and prop classification ────────────────────────────────────
const HANDLERS = new Set([
  "onClick",
  "onMouseDown",
  "onMouseUp",
  "onKeyDown",
  "onKeyUp",
  "onKeyPress",
]);
const KEY_HANDLERS = new Set(["onKeyDown", "onKeyUp", "onKeyPress"]);
const FORM_CONTROLS = new Set(["input", "select", "textarea"]);
// Natively interactive (focusable and operable) DOM elements, as jsx-a11y's isInteractiveElement
// treats them for the handler rules. `a` and `area` count only with href; `input` unless hidden.
const isInteractiveDom = (tag, attrs) => {
  if (
    ["button", "select", "textarea", "summary", "option", "datalist"].includes(
      tag
    )
  ) {
    return true;
  }
  if (tag === "input") {
    return attrs.get("type")?.literal !== "hidden";
  }
  if (tag === "a" || tag === "area") {
    return attrs.has("href");
  }
  return false;
};

const unwrap = (e) => {
  let x = e;
  while (
    x &&
    (ts.isParenthesizedExpression(x) ||
      ts.isAsExpression(x) ||
      ts.isNonNullExpression(x) ||
      ts.isTypeAssertionExpression(x) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(x)))
  ) {
    x = x.expression;
  }
  return x;
};
const literalOf = (e) => {
  const x = unwrap(e);
  if (!x) {
    return { kind: "empty" };
  }
  if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) {
    return { kind: "literal", literal: x.text };
  }
  if (ts.isNumericLiteral(x)) {
    return { kind: "literal", literal: Number(x.text) };
  }
  if (
    ts.isPrefixUnaryExpression(x) &&
    x.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(x.operand)
  ) {
    return { kind: "literal", literal: -Number(x.operand.text) };
  }
  if (
    x.kind === ts.SyntaxKind.TrueKeyword ||
    x.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return { kind: "literal", literal: x.kind === ts.SyntaxKind.TrueKeyword };
  }
  if (x.kind === ts.SyntaxKind.NullKeyword) {
    return { kind: "literal", literal: null };
  }
  if (ts.isIdentifier(x) && x.text === "undefined") {
    return { kind: "literal", literal: "undefined" };
  }
  let cat = "other";
  if (ts.isIdentifier(x)) {
    cat = "identifier";
  } else if (
    ts.isPropertyAccessExpression(x) ||
    ts.isElementAccessExpression(x)
  ) {
    cat = "member";
  } else if (ts.isCallExpression(x) || ts.isTaggedTemplateExpression(x)) {
    cat = "call";
  } else if (ts.isConditionalExpression(x)) {
    cat = "conditional";
  } else if (
    ts.isBinaryExpression(x) &&
    [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
    ].includes(x.operatorToken.kind)
  ) {
    cat = "logical";
  } else if (ts.isTemplateExpression(x)) {
    cat = "template";
  } else if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) {
    cat = "function";
  } else if (ts.isObjectLiteralExpression(x)) {
    cat = "object";
  }
  return { cat, kind: "dynamic" };
};
const attrValue = (attr) => {
  if (!attr.initializer) {
    return { kind: "literal", literal: true };
  }
  if (ts.isStringLiteral(attr.initializer)) {
    return { kind: "literal", literal: attr.initializer.text };
  }
  if (ts.isJsxExpression(attr.initializer)) {
    return literalOf(attr.initializer.expression);
  }
  return { cat: "jsx", kind: "dynamic" };
};
const spreadKind = (expr) => {
  const x = unwrap(expr);
  if (ts.isIdentifier(x)) {
    return "identifier";
  }
  if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) {
    return "member";
  }
  if (ts.isCallExpression(x)) {
    return "call";
  }
  if (ts.isObjectLiteralExpression(x)) {
    return "object";
  }
  if (ts.isConditionalExpression(x) || ts.isBinaryExpression(x)) {
    return "conditional";
  }
  return "other";
};
const tagText = (tagName, sf) => tagName.getText(sf);
const isDomTag = (t) => /^[a-z][\w-]*$/.test(t);
// `motion.div`, `Primitive.button`, `styled.span`: a factory object whose property is a DOM tag.
const factoryTag = (t) => {
  const m = /^[A-Za-z_$][\w$]*\.([a-z][a-z0-9]*)$/.exec(t);
  return m ? m[1] : null;
};

// Interactive or labelled component families, by the last segment of the tag name. Order matters.
const FAMILIES = [
  ["button", /(?:Button|Trigger|Close)$/],
  ["link", /Link$/],
  ["label", /Label$/],
  ["textbox", /(?:Input|Textarea|TextArea|TextField|SearchField)$/],
  [
    "choice",
    /(?:Checkbox|Radio|RadioGroupItem|Switch|Toggle|ToggleGroupItem)$/,
  ],
  ["select", /(?:Select|Combobox|ComboBox|Listbox|ListBox)$/],
  ["image", /^(?:Image|Img|.*Image|Avatar)$/],
  [
    "dialog",
    /(?:Dialog|Modal|Sheet|Drawer|DialogContent|SheetContent|DrawerContent)$/,
  ],
];
const familyOfComponent = (t) => {
  const last = t.split(".").at(-1);
  for (const [family, re] of FAMILIES) {
    if (re.test(last)) {
      return family;
    }
  }
  return null;
};
// The DOM tags that fit each family.
const FAMILY_TAGS = {
  button: new Set(["button"]),
  choice: new Set(["input", "button"]),
  dialog: new Set(["dialog"]),
  image: new Set(["img", "svg", "picture"]),
  label: new Set(["label"]),
  link: new Set(["a"]),
  select: new Set(["select", "button", "input"]),
  textbox: new Set(["input", "textarea"]),
};

// ── module resolution and definitions ──────────────────────────────────
const parseCache = new Map();
const parse = (abs) => {
  if (!parseCache.has(abs)) {
    let sf = null;
    try {
      const text = readFileSync(abs, "utf8");
      const kind = /\.tsx$/.test(abs)
        ? ts.ScriptKind.TSX
        : /\.jsx$/.test(abs)
          ? ts.ScriptKind.JSX
          : /\.[cm]?js$/.test(abs)
            ? ts.ScriptKind.JS
            : ts.ScriptKind.TS;
      sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, kind);
    } catch {
      sf = null;
    }
    parseCache.set(abs, sf);
  }
  return parseCache.get(abs);
};

const makeRepoResolver = (name) => {
  const root = lib.getRepo(name).root;
  const setup = SETUP[name];
  let options = {
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    resolveJsonModule: true,
  };
  if (setup.tsconfig && existsSync(join(root, setup.tsconfig))) {
    try {
      options = ic.compilerOptionsFor(root, setup.tsconfig).options;
    } catch {
      // keep the defaults
    }
  }
  if (setup.baseUrl && !options.baseUrl) {
    options = { ...options, baseUrl: join(root, setup.baseUrl) };
  }
  const host = ts.createCompilerHost(options, true);
  const { resolveSpec } = ic.makeResolver(root, options, host);
  return { resolveSpec, root };
};

// Top-level bindings of a file: imports and declarations.
const bindingCache = new Map();
const bindingsOf = (sf) => {
  if (bindingCache.has(sf.fileName)) {
    return bindingCache.get(sf.fileName);
  }
  const map = new Map();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && st.importClause) {
      const spec = st.moduleSpecifier.text;
      const c = st.importClause;
      if (c.name) {
        map.set(c.name.text, { imported: "default", kind: "import", spec });
      }
      const nb = c.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) {
        map.set(nb.name.text, { imported: "*", kind: "import", spec });
      } else if (nb) {
        for (const el of nb.elements) {
          map.set(el.name.text, {
            imported: (el.propertyName ?? el.name).text,
            kind: "import",
            spec,
          });
        }
      }
    } else if (ts.isFunctionDeclaration(st) && st.name) {
      map.set(st.name.text, { kind: "local", node: st });
    } else if (ts.isClassDeclaration(st) && st.name) {
      map.set(st.name.text, { kind: "local", node: st });
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) {
          map.set(d.name.text, { kind: "local", node: d });
        } else if (ts.isObjectBindingPattern(d.name) && d.initializer) {
          // const { Root, Trigger } = DialogPrimitive
          for (const el of d.name.elements) {
            if (ts.isIdentifier(el.name)) {
              map.set(el.name.text, {
                kind: "destructured",
                from: d.initializer,
                property: (el.propertyName ?? el.name).getText(sf),
              });
            }
          }
        }
      }
    }
  }
  bindingCache.set(sf.fileName, map);
  return map;
};

// Finds the declaration exported as `exportName` from module file `abs`.
const findExport = (ctx, abs, exportName, seen = new Set()) => {
  const key = `${abs}\0${exportName}`;
  if (seen.has(key)) {
    return null;
  }
  seen.add(key);
  const sf = parse(abs);
  if (!sf) {
    return null;
  }
  const local = bindingsOf(sf);
  for (const st of sf.statements) {
    const exported = ts.canHaveModifiers(st)
      ? (ts.getModifiers(st) ?? []).some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword
        )
      : false;
    const isDefault =
      ts.canHaveModifiers(st) &&
      (ts.getModifiers(st) ?? []).some(
        (m) => m.kind === ts.SyntaxKind.DefaultKeyword
      );
    if (
      exported &&
      (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st))
    ) {
      if (
        (isDefault && exportName === "default") ||
        st.name?.text === exportName
      ) {
        return { node: st, sf };
      }
    }
    if (exported && ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === exportName) {
          return { node: d, sf };
        }
      }
    }
    if (
      ts.isExportAssignment(st) &&
      !st.isExportEquals &&
      exportName === "default"
    ) {
      const e = unwrap(st.expression);
      if (ts.isIdentifier(e)) {
        return resolveBinding(ctx, sf, e.text, seen);
      }
      return { node: st.expression, sf };
    }
    if (
      ts.isExportDeclaration(st) &&
      st.exportClause &&
      ts.isNamedExports(st.exportClause)
    ) {
      for (const el of st.exportClause.elements) {
        if (el.name.text !== exportName) {
          continue;
        }
        const orig = (el.propertyName ?? el.name).text;
        if (st.moduleSpecifier) {
          const r = ctx.resolveSpec(st.moduleSpecifier.text, abs);
          return r.file
            ? findExport(ctx, r.file, orig, seen)
            : { external: st.moduleSpecifier.text };
        }
        if (local.has(orig)) {
          return resolveBinding(ctx, sf, orig, seen);
        }
      }
    }
    if (
      ts.isExportDeclaration(st) &&
      st.exportClause &&
      ts.isNamespaceExport(st.exportClause) &&
      st.exportClause.name.text === exportName
    ) {
      return { namespace: st.moduleSpecifier.text, sf };
    }
  }
  // export * from …
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st) && !st.exportClause && st.moduleSpecifier) {
      const r = ctx.resolveSpec(st.moduleSpecifier.text, abs);
      if (r.file) {
        const hit = findExport(ctx, r.file, exportName, seen);
        if (hit) {
          return hit;
        }
      }
    }
  }
  return null;
};

// Resolves a name bound in `sf` to its declaration (following imports).
const resolveBinding = (ctx, sf, name, seen = new Set()) => {
  const b = bindingsOf(sf).get(name);
  if (!b) {
    return null;
  }
  if (b.kind === "local") {
    return { node: b.node, sf };
  }
  if (b.kind === "destructured") {
    return { destructured: b, sf };
  }
  const r = ctx.resolveSpec(b.spec, sf.fileName);
  if (!r.file) {
    return { external: b.spec };
  }
  if (b.imported === "*") {
    return { namespaceFile: r.file };
  }
  return (
    findExport(ctx, r.file, b.imported, seen) ?? {
      unresolvedExport: b.imported,
      file: r.file,
    }
  );
};

// The function that renders, from a declaration: function declarations and expressions, arrows,
// forwardRef(fn), memo(fn), React.forwardRef<…>(fn), HOCs (first argument), Object.assign(X, …).
const componentFunction = (ctx, decl, depth) => {
  let node = decl.node;
  if (node && ts.isVariableDeclaration(node)) {
    node = node.initializer;
  }
  for (let i = 0; i < 6 && node; i++) {
    node = unwrap(node);
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    ) {
      return { fn: node };
    }
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const render = node.members.find(
        (m) => ts.isMethodDeclaration(m) && m.name?.getText() === "render"
      );
      return render ? { fn: render } : { kind: "class" };
    }
    if (ts.isCallExpression(node)) {
      // `(forwardRef as forwardRefType)(function X …)` in React Aria.
      const callee = unwrap(node.expression).getText(decl.sf);
      if (
        /(?:^|\.)(?:forwardRef|memo|observer|createHideableComponent|createLeafComponent|createBranchComponent)$/.test(
          callee
        )
      ) {
        node = node.arguments.at(-1) ?? node.arguments[0];
        continue;
      }
      if (
        /(?:^|\.)assign$/.test(callee) ||
        /^with[A-Z]/.test(callee.split(".").at(-1))
      ) {
        node = node.arguments[0];
        continue;
      }
      if (/(?:^|\.)(?:styled|tw)$/.test(callee) || /^styled\./.test(callee)) {
        return { kind: "styled" };
      }
      return { kind: "call", callee };
    }
    if (ts.isIdentifier(node)) {
      return { alias: node.text };
    }
    if (ts.isPropertyAccessExpression(node)) {
      return { aliasMember: node.getText(decl.sf) };
    }
    return { kind: ts.SyntaxKind[node.kind] };
  }
  return { kind: "unknown" };
};

// Returned JSX roots of a function body (not nested functions).
const returnedRoots = (fn) => {
  const out = [];
  const pushExpr = (e) => {
    const x = unwrap(e);
    if (!x) {
      return;
    }
    if (ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x)) {
      out.push(x);
    } else if (ts.isJsxFragment(x)) {
      out.push(x);
    } else if (ts.isConditionalExpression(x)) {
      pushExpr(x.whenTrue);
      pushExpr(x.whenFalse);
    } else if (ts.isBinaryExpression(x)) {
      pushExpr(x.right);
      if (x.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) {
        pushExpr(x.left);
      }
    } else if (x.kind === ts.SyntaxKind.NullKeyword) {
      out.push("null");
    } else if (ts.isIdentifier(x) && x.text === "children") {
      out.push("children");
    } else if (ts.isPropertyAccessExpression(x) && x.name.text === "children") {
      out.push("children");
    } else {
      out.push(`expr:${ts.SyntaxKind[x.kind]}`);
    }
  };
  const body = fn.body;
  if (!body) {
    return out;
  }
  if (!ts.isBlock(body)) {
    pushExpr(body);
    return out;
  }
  const visit = (n) => {
    if (ts.isFunctionLike(n) && n !== fn) {
      return;
    }
    if (ts.isReturnStatement(n)) {
      pushExpr(n.expression);
      return;
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(body, visit);
  return out;
};

// What a local identifier used as a JSX tag inside `fn` stands for: `const Comp = asChild ? Slot :
// "button"`, `const Element = as ?? "div"`, a destructured parameter default `{ as: Tag = "a" }`.
const localTag = (fn, name, sf) => {
  let found = null;
  const fromInit = (init) => {
    const x = unwrap(init);
    if (!x) {
      return null;
    }
    if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) {
      return { strings: [x.text] };
    }
    if (ts.isConditionalExpression(x)) {
      const a = fromInit(x.whenTrue);
      const b = fromInit(x.whenFalse);
      return {
        others: [...(a?.others ?? []), ...(b?.others ?? [])],
        strings: [...(a?.strings ?? []), ...(b?.strings ?? [])],
      };
    }
    if (ts.isBinaryExpression(x)) {
      const a = fromInit(x.left);
      const b = fromInit(x.right);
      return {
        others: [...(a?.others ?? []), ...(b?.others ?? [])],
        strings: [...(a?.strings ?? []), ...(b?.strings ?? [])],
      };
    }
    return { others: [x.getText(sf)], strings: [] };
  };
  const visit = (n) => {
    if (found) {
      return;
    }
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === name
    ) {
      found = fromInit(n.initializer);
      return;
    }
    if (
      ts.isBindingElement(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === name
    ) {
      found = n.initializer
        ? fromInit(n.initializer)
        : { others: ["(prop)"], strings: [] };
      return;
    }
    if (ts.isParameter(n) && ts.isIdentifier(n.name) && n.name.text === name) {
      found = { others: ["(param)"], strings: [] };
      return;
    }
    ts.forEachChild(n, visit);
  };
  for (const p of fn.parameters ?? []) {
    visit(p);
  }
  if (!found && fn.body) {
    visit(fn.body);
  }
  return found;
};

const defCache = new Map();
// -> { kind, tag?, via[], file?, external?, rootRole? }
const analyseTag = (ctx, sf, tag, depth, via) => {
  if (isDomTag(tag)) {
    return { kind: "native", tag, via };
  }
  const f = factoryTag(tag);
  if (f) {
    return { kind: "factory", tag: f, via: [...via, tag] };
  }
  if (tag.includes(".")) {
    const [head, ...rest] = tag.split(".");
    const b = resolveBinding(ctx, sf, head);
    if (b?.external) {
      return { external: b.external, kind: "external", via: [...via, tag] };
    }
    if (b?.namespaceFile && rest.length === 1) {
      const d = findExport(ctx, b.namespaceFile, rest[0]);
      return analyseDecl(ctx, d, depth + 1, [...via, tag]);
    }
    if (b?.namespace) {
      const r = ctx.resolveSpec(b.namespace, b.sf.fileName);
      if (r.file && rest.length === 1) {
        return analyseDecl(ctx, findExport(ctx, r.file, rest[0]), depth + 1, [
          ...via,
          tag,
        ]);
      }
    }
    if (rest.at(-1) === "Provider") {
      return { kind: "provider", via: [...via, tag] };
    }
    return { kind: "unresolved", reason: "member", via: [...via, tag] };
  }
  return analyseDecl(ctx, resolveBinding(ctx, sf, tag), depth + 1, [
    ...via,
    tag,
  ]);
};

const analyseDecl = (ctx, decl, depth, via) => {
  if (!decl) {
    return { kind: "unresolved", reason: "no declaration", via };
  }
  if (decl.external) {
    return { external: decl.external, kind: "external", via };
  }
  if (decl.namespace || decl.namespaceFile || decl.unresolvedExport) {
    return { kind: "unresolved", reason: "namespace or missing export", via };
  }
  if (decl.destructured) {
    const from = decl.destructured.from.getText(decl.sf);
    return analyseTag(
      ctx,
      decl.sf,
      `${from}.${decl.destructured.property}`,
      depth,
      via
    );
  }
  if (depth > 8) {
    return { kind: "unresolved", reason: "depth", via };
  }
  const key = `${decl.sf.fileName}:${decl.node.pos}`;
  if (defCache.has(key)) {
    const hit = defCache.get(key);
    return hit === "pending"
      ? { kind: "unresolved", reason: "recursive", via }
      : { ...hit, via: [...via, ...hit.via] };
  }
  defCache.set(key, "pending");
  const result = analyseDeclUncached(ctx, decl, depth);
  result.file = relative(ctx.root, decl.sf.fileName);
  result.line =
    decl.sf.getLineAndCharacterOfPosition(decl.node.getStart(decl.sf)).line + 1;
  defCache.set(key, { ...result, via: result.via ?? [] });
  return { ...result, via: [...via, ...(result.via ?? [])] };
};

const analyseDeclUncached = (ctx, decl, depth) => {
  const fnInfo = componentFunction(ctx, decl, depth);
  if (fnInfo.alias) {
    return analyseTag(ctx, decl.sf, fnInfo.alias, depth, []);
  }
  if (fnInfo.aliasMember) {
    return analyseTag(ctx, decl.sf, fnInfo.aliasMember, depth, []);
  }
  if (!fnInfo.fn) {
    return {
      kind: "unresolved",
      reason: fnInfo.kind ?? "not a function",
      via: [],
    };
  }
  const roots = returnedRoots(fnInfo.fn);
  // Every DOM tag the component's own JSX contains (not nested functions' JSX, not other
  // components'), for wrappers whose root is a <div> around the real control.
  const domTags = new Set();
  const scan = (n) => {
    if (ts.isFunctionLike(n) && n !== fnInfo.fn) {
      return;
    }
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const t = tagText(n.tagName, decl.sf);
      if (isDomTag(t)) {
        domTags.add(t);
      } else if (factoryTag(t)) {
        domTags.add(factoryTag(t));
      }
    }
    ts.forEachChild(n, scan);
  };
  if (fnInfo.fn.body) {
    scan(fnInfo.fn.body);
  }
  const outcomes = [];
  for (const r of roots) {
    if (r === "null") {
      outcomes.push({ kind: "nothing" });
      continue;
    }
    if (r === "children") {
      outcomes.push({ kind: "passthrough" });
      continue;
    }
    if (typeof r === "string") {
      outcomes.push({ kind: "unresolved", reason: r });
      continue;
    }
    if (ts.isJsxFragment(r)) {
      outcomes.push({ kind: "fragment" });
      continue;
    }
    const opening = ts.isJsxElement(r) ? r.openingElement : r;
    const t = tagText(opening.tagName, decl.sf);
    const role = opening.attributes.properties.find(
      (p) => ts.isJsxAttribute(p) && p.name.getText(decl.sf) === "role"
    );
    const roleValue = role ? attrValue(role) : null;
    if (/\.Provider$/.test(t)) {
      outcomes.push({ kind: "provider" });
      continue;
    }
    if (!isDomTag(t) && !factoryTag(t) && !t.includes(".")) {
      const local = localTag(fnInfo.fn, t, decl.sf);
      if (local) {
        const strings = local.strings.filter((s) => isDomTag(s));
        if (strings.length > 0) {
          outcomes.push({
            kind: "polymorphic",
            others: local.others,
            rootRole: roleValue?.literal ?? (roleValue ? "(dynamic)" : null),
            tag: strings[0],
          });
          continue;
        }
        if (
          local.others.length === 1 &&
          /^[A-Z]/.test(local.others[0]) &&
          bindingsOf(decl.sf).has(local.others[0].split(".")[0])
        ) {
          outcomes.push(analyseTag(ctx, decl.sf, local.others[0], depth, []));
          continue;
        }
        outcomes.push({
          kind: "unresolved",
          reason: `local tag ${t} = ${local.others.join(" | ")}`,
        });
        continue;
      }
    }
    const a = analyseTag(ctx, decl.sf, t, depth, []);
    if (a.kind === "native" || a.kind === "factory") {
      a.rootRole = roleValue?.literal ?? (roleValue ? "(dynamic)" : null);
    }
    outcomes.push(a);
  }
  if (outcomes.length === 0) {
    return { kind: "unresolved", reason: "no JSX return", via: [] };
  }
  // A DOM-rendering outcome wins over nothing/passthrough (e.g. `if (!open) return null`).
  const rank = {
    factory: 3,
    native: 4,
    polymorphic: 3,
    external: 2,
    provider: 1,
    passthrough: 1,
    fragment: 1,
    nothing: 0,
    unresolved: 0,
  };
  outcomes.sort((a, b) => (rank[b.kind] ?? 0) - (rank[a.kind] ?? 0));
  const best = outcomes[0];
  const tags = [...new Set(outcomes.filter((o) => o.tag).map((o) => o.tag))];
  return {
    ...best,
    alternatives: tags.length > 1 ? tags : undefined,
    contains: [...domTags].sort(),
    via: best.via ?? [],
  };
};

// ── the census ─────────────────────────────────────────────────────────
const A11Y_PROPS = (name, tag) =>
  name === "alt" ||
  name.startsWith("aria-") ||
  name === "role" ||
  name === "tabIndex" ||
  (name === "htmlFor" && tag === "label") ||
  (name === "id" && FORM_CONTROLS.has(tag));

const bump = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};

const censusRepo = (name) => {
  const ctx = makeRepoResolver(name);
  const { files } = lib.jsxFiles(name);
  const s = {
    componentPropsPassed: {},
    components: { byFamily: {}, distinct: {}, usages: 0 },
    domElements: 0,
    domWithSpread: 0,
    elements: 0,
    factoryElements: 0,
    files: files.length,
    handlers: {
      keyHandler: {},
      nonInteractiveWithHandler: 0,
      nonInteractiveWithOnClick: 0,
      onClickOnComponents: 0,
      role: {},
      tabIndex: {},
    },
    props: {},
    spreadKinds: {},
  };
  const elementsOut = [];
  const mapping = new Map(); // tag text -> Set of DOM tags it renders
  for (const rel of files) {
    const abs = join(ctx.root, rel);
    const sf = parse(abs);
    const visit = (node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node;
        const tag = tagText(opening.tagName, sf);
        const line =
          sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1;
        const attrs = new Map();
        const spreads = [];
        for (const p of opening.attributes.properties) {
          if (ts.isJsxSpreadAttribute(p)) {
            spreads.push({
              end: p.getEnd(),
              kind: spreadKind(p.expression),
              start: p.getStart(sf),
            });
          } else {
            attrs.set(p.name.getText(sf), attrValue(p));
          }
        }
        s.elements++;
        const dom = isDomTag(tag);
        const factory = factoryTag(tag);
        const effectiveTag = dom ? tag : factory;
        if (factory) {
          s.factoryElements++;
        }
        if (dom || factory) {
          s.domElements++;
          if (spreads.length > 0) {
            s.domWithSpread++;
            for (const sp of spreads) {
              bump(s.spreadKinds, sp.kind);
            }
          }
          for (const [attr, v] of attrs) {
            if (!A11Y_PROPS(attr, effectiveTag)) {
              continue;
            }
            const key = attr.startsWith("aria-")
              ? [
                  "aria-label",
                  "aria-labelledby",
                  "aria-hidden",
                  "aria-describedby",
                ].includes(attr)
                ? attr
                : "aria-* (other)"
              : attr === "id"
                ? "id (form control)"
                : attr === "htmlFor"
                  ? "htmlFor (label)"
                  : attr;
            s.props[key] ??= {
              dynamic: 0,
              dynamicByCat: {},
              literal: 0,
              onElementsWithSpread: 0,
            };
            if (v.kind === "literal") {
              s.props[key].literal++;
            } else {
              s.props[key].dynamic++;
              bump(s.props[key].dynamicByCat, v.cat ?? v.kind);
            }
            if (spreads.length > 0) {
              s.props[key].onElementsWithSpread++;
            }
          }
          // alt on images: absent but spread present
          if (effectiveTag === "img") {
            s.props.alt ??= {
              dynamic: 0,
              dynamicByCat: {},
              literal: 0,
              onElementsWithSpread: 0,
            };
            s.props.alt.imgElements = (s.props.alt.imgElements ?? 0) + 1;
            if (!attrs.has("alt")) {
              s.props.alt.imgWithoutAlt = (s.props.alt.imgWithoutAlt ?? 0) + 1;
              if (spreads.length > 0) {
                s.props.alt.imgWithoutAltButSpread =
                  (s.props.alt.imgWithoutAltButSpread ?? 0) + 1;
              }
            } else if (
              attrs.get("alt").kind === "literal" &&
              attrs.get("alt").literal === ""
            ) {
              s.props.alt.emptyLiteral = (s.props.alt.emptyLiteral ?? 0) + 1;
            }
          }
          const handlers = [...attrs.keys()].filter((a) => HANDLERS.has(a));
          if (handlers.length > 0 && !isInteractiveDom(effectiveTag, attrs)) {
            s.handlers.nonInteractiveWithHandler++;
            if (attrs.has("onClick")) {
              s.handlers.nonInteractiveWithOnClick++;
              const state = (a) =>
                attrs.has(a)
                  ? attrs.get(a).kind === "literal"
                    ? "literal"
                    : "dynamic"
                  : spreads.length > 0
                    ? "absent, spread present"
                    : "absent";
              bump(s.handlers.role, state("role"));
              bump(s.handlers.tabIndex, state("tabIndex"));
              const keyState = [...KEY_HANDLERS].some((k) => attrs.has(k))
                ? "present"
                : spreads.length > 0
                  ? "absent, spread present"
                  : "absent";
              bump(s.handlers.keyHandler, keyState);
              elementsOut.push({
                file: rel,
                kind: "clickable-non-interactive",
                line,
                tag,
                role:
                  attrs.get("role")?.literal ??
                  (attrs.has("role") ? "(dynamic)" : null),
                spreads: spreads.length,
                keyHandler: keyState,
              });
            }
          }
        } else {
          // custom component
          s.components.usages++;
          for (const attr of attrs.keys()) {
            if (
              attr === "alt" ||
              attr.startsWith("aria-") ||
              [
                "role",
                "tabIndex",
                "htmlFor",
                "onClick",
                "label",
                "title",
              ].includes(attr)
            ) {
              bump(
                s.componentPropsPassed,
                attr.startsWith("aria-")
                  ? ["aria-label", "aria-labelledby", "aria-hidden"].includes(
                      attr
                    )
                    ? attr
                    : "aria-* (other)"
                  : attr
              );
            }
          }
          if (attrs.has("onClick")) {
            s.handlers.onClickOnComponents++;
          }
          const family = familyOfComponent(tag);
          let def = null;
          try {
            def = analyseTag(ctx, sf, tag, 0, []);
          } catch (error) {
            def = {
              kind: "unresolved",
              reason: `error: ${String(error.message).slice(0, 80)}`,
            };
          }
          const domTag =
            def.kind === "native" ||
            def.kind === "factory" ||
            def.kind === "polymorphic"
              ? def.tag
              : null;
          if (domTag) {
            if (!mapping.has(tag)) {
              mapping.set(tag, new Set());
            }
            mapping.get(tag).add(domTag);
          } else {
            if (!mapping.has(tag)) {
              mapping.set(tag, new Set());
            }
            mapping.get(tag).add(`(${def.kind})`);
          }
          if (family) {
            const fam = (s.components.byFamily[family] ??= {
              distinct: new Set(),
              outcomes: {},
              rendersFittingNative: 0,
              rendersOtherNative: 0,
              usages: 0,
            });
            fam.usages++;
            fam.distinct.add(
              def.file
                ? `${def.file}:${def.line}`
                : `${tag} (${def.kind}${def.external ? `: ${def.external}` : ""})`
            );
            const outcome =
              def.kind === "native" ||
              def.kind === "factory" ||
              def.kind === "polymorphic"
                ? `${def.kind}`
                : def.kind;
            bump(fam.outcomes, outcome);
            if (domTag) {
              if (FAMILY_TAGS[family].has(domTag)) {
                fam.rendersFittingNative++;
              } else {
                fam.rendersOtherNative++;
                bump(
                  (fam.otherTags ??= {}),
                  `${domTag}${def.rootRole ? ` role=${def.rootRole}` : ""}`
                );
                // A wrapper whose own JSX contains the fitting element below its root.
                if (
                  (def.contains ?? []).some((t) => FAMILY_TAGS[family].has(t))
                ) {
                  fam.fittingNativeBelowRoot =
                    (fam.fittingNativeBelowRoot ?? 0) + 1;
                }
              }
            }
            elementsOut.push({
              def: {
                contains: def.contains,
                external: def.external,
                file: def.file,
                kind: def.kind,
                line: def.line,
                reason: def.reason,
                rootRole: def.rootRole,
                tag: def.tag,
                via: def.via,
              },
              family,
              file: rel,
              kind: "component",
              line,
              tag,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  for (const fam of Object.values(s.components.byFamily)) {
    fam.distinct = fam.distinct.size;
  }
  // Names that resolve to exactly one DOM tag everywhere in the repo.
  const settingsMap = {};
  const ambiguous = [];
  for (const [tag, set] of mapping) {
    const tags = [...set];
    if (tags.length === 1 && !tags[0].startsWith("(")) {
      settingsMap[tag] = tags[0];
    } else if (tags.filter((t) => !t.startsWith("(")).length > 0) {
      ambiguous.push({ resolvesTo: tags, tag });
    }
  }
  s.components.distinct = {
    mappedToOneDomTag: Object.keys(settingsMap).length,
    names: mapping.size,
    ambiguous: ambiguous.length,
  };
  return { ambiguous, elements: elementsOut, settingsMap, summary: s };
};

// ── counterfactual lints ───────────────────────────────────────────────
const keyOf = (d) => `${d.file}:${d.line}:${dc.toOxlintName(d.rule)}`;
const diffRows = (base, alt) => {
  const seen = new Map();
  for (const d of base) {
    seen.set(keyOf(d), (seen.get(keyOf(d)) ?? 0) + 1);
  }
  const extra = [];
  for (const d of alt) {
    const k = keyOf(d);
    if (seen.get(k)) {
      seen.set(k, seen.get(k) - 1);
    } else {
      extra.push(d);
    }
  }
  const gone = [...seen.entries()].filter(([, n]) => n > 0).map(([k]) => k);
  return { extra, gone };
};
const byRule = (rows) => {
  const m = {};
  for (const d of rows) {
    bump(m, dc.toOxlintName(d.rule));
  }
  return Object.fromEntries(
    Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  );
};
// Oxlint lints in parallel, so its output order varies between runs: sort before sampling.
const sortRows = (rows) =>
  [...rows].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      String(a.rule).localeCompare(String(b.rule))
  );

// Same-length blanking of spread attributes on DOM elements.
const stripSpreads = (text, abs) => {
  const sf = ts.createSourceFile(
    abs,
    text,
    ts.ScriptTarget.Latest,
    true,
    /\.tsx$/.test(abs) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX
  );
  const ranges = [];
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = tagText(node.tagName, sf);
      if (isDomTag(tag) || factoryTag(tag)) {
        for (const p of node.attributes.properties) {
          if (ts.isJsxSpreadAttribute(p)) {
            ranges.push([p.getStart(sf), p.getEnd()]);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  let out = text;
  for (const [a, b] of ranges.sort((x, y) => y[0] - x[0])) {
    out =
      out.slice(0, a) + out.slice(a, b).replace(/[^\n]/g, " ") + out.slice(b);
  }
  return { count: ranges.length, text: out };
};

const lintCounterfactuals = async (name, settingsMap) => {
  const { files, repo } = lib.jsxFiles(name);
  const cwd = repo.root;
  const result = {};
  // Oxlint: extends core + react, as the census runs it; the mapped run adds settings.
  const baseCfg = lib.writeOxlintRoot(
    `cf-${name}-base`,
    ["core", "react"],
    {},
    { init: false }
  );
  const mapCfg = lib.writeOxlintRoot(
    `cf-${name}-mapped`,
    ["core", "react"],
    { settings: { "jsx-a11y": { components: settingsMap } } },
    { init: false }
  );
  const keep = (rule) => lib.isA11yRule(rule);
  const oxBase = lib.runOxlint({ configFile: baseCfg, cwd, files, keep });
  const oxMapped = lib.runOxlint({ configFile: mapCfg, cwd, files, keep });
  const esBase = await lib.runEslint({ crashes: [], cwd, files });
  const esMapped = await lib.runEslint({
    crashes: [],
    cwd,
    extra: [
      {
        files: ["**/*.jsx", "**/*.tsx"],
        settings: { "jsx-a11y": { components: settingsMap } },
      },
    ],
    files,
  });
  const ox = diffRows(oxBase, oxMapped);
  const es = diffRows(
    esBase.filter((d) => keep(d.rule)),
    esMapped.filter((d) => keep(d.rule))
  );
  ox.extra = sortRows(ox.extra);
  es.extra = sortRows(es.extra);
  result.mapping = {
    eslint: {
      baseline: esBase.length,
      extra: es.extra.length,
      extraByRule: byRule(es.extra),
      gone: es.gone.length,
      sample: es.extra.slice(0, 40).map((d) => ({
        code: lineAt(cwd, d.file, d.line),
        file: d.file,
        line: d.line,
        message: d.message,
        rule: d.rule,
      })),
    },
    mappedNames: Object.keys(settingsMap).length,
    oxlint: {
      baseline: oxBase.length,
      extra: ox.extra.length,
      extraByRule: byRule(ox.extra),
      gone: ox.gone.length,
      sample: ox.extra.slice(0, 40).map((d) => ({
        code: lineAt(cwd, d.file, d.line),
        file: d.file,
        line: d.line,
        message: d.message,
        rule: d.rule,
      })),
    },
  };
  // Spreads blanked out, on a copy (under out/, with the extends-only config).
  const copyRoot = join(OUT, "stripped", name);
  rmSync(copyRoot, { force: true, recursive: true });
  let stripped = 0;
  for (const rel of files) {
    const abs = join(cwd, rel);
    const { count, text } = stripSpreads(readFileSync(abs, "utf8"), abs);
    stripped += count;
    const dest = join(copyRoot, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, text);
  }
  const oxStripped = lib.runOxlint({
    configFile: baseCfg,
    cwd: copyRoot,
    files,
    keep,
  });
  const esStripped = await lib.runEslint({ crashes: [], cwd: copyRoot, files });
  const ox2 = diffRows(oxBase, oxStripped);
  const es2 = diffRows(
    esBase.filter((d) => keep(d.rule)),
    esStripped.filter((d) => keep(d.rule))
  );
  ox2.extra = sortRows(ox2.extra);
  es2.extra = sortRows(es2.extra);
  result.spreads = {
    blanked: stripped,
    eslint: {
      extra: es2.extra.length,
      extraByRule: byRule(es2.extra),
      gone: es2.gone.length,
      sample: es2.extra.slice(0, 40).map((d) => ({
        code: lineAt(cwd, d.file, d.line),
        file: d.file,
        line: d.line,
        message: d.message,
        rule: d.rule,
      })),
    },
    oxlint: {
      extra: ox2.extra.length,
      extraByRule: byRule(ox2.extra),
      gone: ox2.gone.length,
      sample: ox2.extra.slice(0, 40).map((d) => ({
        code: lineAt(cwd, d.file, d.line),
        file: d.file,
        line: d.line,
        message: d.message,
        rule: d.rule,
      })),
    },
  };
  // Keep every extra row for sampling.
  lib.writeJson(join(OUT, `${name}.counterfactual.json`), {
    mapping: { eslint: es.extra, oxlint: ox.extra },
    spreads: { eslint: es2.extra, oxlint: ox2.extra },
  });
  return result;
};
const lineCache = new Map();
const lineAt = (cwd, file, line) => {
  const abs = resolve(cwd, file);
  if (!lineCache.has(abs)) {
    lineCache.set(
      abs,
      existsSync(abs) && statSync(abs).isFile()
        ? readFileSync(abs, "utf8").split("\n")
        : []
    );
  }
  return (lineCache.get(abs)[line - 1] ?? "").trim().slice(0, 160);
};

const main = async () => {
  lib.checkPinned();
  const result = lib.readJson(RESULT, { repos: {} });
  result.generated = new Date().toISOString().slice(0, 10);
  result.note =
    'Static: syntax plus module resolution inside each clone. A DOM element is a lowercase JSX tag; a factory is `x.tag` with a lowercase DOM tag (motion.div, Primitive.button). Families are matched on the last segment of a component\'s name. `mappedToOneDomTag` names are the settings["jsx-a11y"].components used by the counterfactual lint.';
  for (const name of lib.selectedRepos()) {
    const started = Date.now();
    const { ambiguous, elements, settingsMap, summary } = censusRepo(name);
    mkdirSync(OUT, { recursive: true });
    lib.writeJson(join(OUT, `${name}.json`), {
      ambiguous,
      elements,
      settingsMap,
    });
    const entry = {
      ...summary,
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    if (lib.flag("lint")) {
      entry.counterfactual = await lintCounterfactuals(name, settingsMap);
    }
    result.repos[name] = entry;
    console.log(
      `${name}: ${summary.elements} elements, ${summary.components.usages} component usages, ${Object.keys(settingsMap).length} names mapped${entry.counterfactual ? `, mapping +${entry.counterfactual.mapping.oxlint.extra} oxlint / +${entry.counterfactual.mapping.eslint.extra} eslint, spreads +${entry.counterfactual.spreads.oxlint.extra} / +${entry.counterfactual.spreads.eslint.extra}` : ""} (${entry.seconds}s)`
    );
  }
  lib.writeJson(RESULT, result);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
