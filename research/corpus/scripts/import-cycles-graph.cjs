// The import graph of each corpus repo, built with TypeScript (no installs), and what it says about
// cycles, barrels and namespace imports.
//
// Graph. One TypeScript program per repo, rooted at the measured files (collect-files.cjs), with the
// package's tsconfig options and bundler resolution. Every import-like statement of every file the
// program loads from inside the clone is a statement row:
//   kind       import | namespace | side-effect | export-named | export-star | export-star-as |
//              import-equals | dynamic (import()) | require (top-level) | require-lazy (inside a
//              function)
//   typeOnly   decl (`import type`, `export type`), inline (every specifier has `type`), none
//   survives   the specifier is still there after `ts.transpileModule` with the repo's own
//              `verbatimModuleSyntax` (and decorator) settings: TypeScript, esbuild and SWC drop
//              imports whose bindings are only used as types, or not at all, unless
//              verbatimModuleSyntax is on. .js files keep everything; .d.ts files keep nothing.
// Resolution is TypeScript's, then workspace package names and `dist/` paths mapped back to source
// (import-cycles-lib.cjs). Imports of third-party packages don't resolve and aren't edges.
//
// Edge models (which statements count as an edge, per (file, specifier)):
//   all        every static statement (no dynamic import, no require), type-only included
//   runtime    statements that survive transpilation, plus top-level require()
//   lazy       runtime + dynamic import() + require() inside functions
//   oxlint     Oxlint's import/no-cycle with Ultracite's options (ignoreTypes: true): static
//              statements except `import type`/`export type {…}` and all-inline-type imports;
//              `export type * from` still counts (Oxlint doesn't mark star exports as types)
//   eslint     import-x/no-cycle: static + dynamic import(), minus type-only statements
//   biome      noImportCycles: static + dynamic import() + require(), minus type-only statements
// (the linter models are what calibration/import-cycles measured; import-cycles-linters.cjs
// compares them with each linter's real reports, line by line)
//
// Cycles are the strongly connected components (Tarjan) with 2+ files that contain a measured file.
// Each `all` component is labelled:
//   type-only       no runtime cycle inside it
//   barrel-induced  its runtime cycles vanish when every named import is pointed at the module
//                   that declares the name (the "debarrelled" graph)
//   top-level-use   some edge inside a runtime cycle has an imported value used during module
//                   evaluation: outside any function, in a class `extends`, a static initializer
//                   or block, a decorator, a computed key, or a call at top level to a local
//                   function or class whose body uses it (followed through local functions)
//   late-use        otherwise: values are only used inside functions
// (barrel-induced takes precedence over the risk labels, but its risk label is kept too)
//
// Barrels. Every file's top-level statements are counted: value re-exports (`export … from`,
// `export *`, `export * as`, and imports whose bindings are only re-exported), type re-exports,
// and everything else. pure = only re-exports (at least one value re-export); mostly = at least 2
// value re-exports and at least half of the statements. Package entry points come from every
// package.json `exports`/`main`/`module`/`types`/`bin` mapped to source. Fan-out: for each consumer
// import through an internal barrel, the runtime closure (modules evaluated) from the barrel versus
// from the modules that declare the imported names.
//
// Usage (from the repo root):
//   node --max-old-space-size=16384 research/corpus/scripts/import-cycles-graph.cjs [--repos zod]
// Writes results/import-cycles/graph.json and out/import-cycles/graph/<repo>.json.
"use strict";

const { readFileSync } = require("node:fs");
const { basename, join, relative, resolve, sep } = require("node:path");
const { builtinModules } = require("node:module");

const ic = require("./import-cycles-lib.cjs");

const { ts } = ic;
const BUILTINS = new Set(builtinModules);
const rel = (root, f) => relative(root, f).split(sep).join("/");

const lineOf = (sf, pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

const isFunctionLike = (n) =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) ||
  ts.isGetAccessorDeclaration(n) ||
  ts.isSetAccessorDeclaration(n) ||
  ts.isConstructorDeclaration(n);

const isStatic = (n) =>
  Boolean(ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Static);

// Is this node evaluated when its module is evaluated (not deferred inside a function body or an
// instance-property initializer)?
const atModuleEvaluation = (node) => {
  let n = node;
  while (n.parent) {
    const p = n.parent;
    if (isFunctionLike(p) && n !== p.name) {
      // parameter defaults and bodies are both deferred; decorators on the function aren't, and
      // neither is the body of a function expression that's invoked on the spot (an IIFE)
      if (ts.isDecorator(n)) {
        n = p;
        continue;
      }
      let q = p.parent;
      while (q && ts.isParenthesizedExpression(q)) {
        q = q.parent;
      }
      const invoked =
        (ts.isFunctionExpression(p) || ts.isArrowFunction(p)) &&
        q &&
        ts.isCallExpression(q) &&
        (q.expression === p ||
          (ts.isParenthesizedExpression(q.expression) &&
            q.expression.expression === p));
      if (invoked) {
        n = q;
        continue;
      }
      return false;
    }
    if (ts.isPropertyDeclaration(p) && p.initializer === n && !isStatic(p)) {
      return false;
    }
    if (ts.isClassStaticBlockDeclaration(p)) {
      n = p;
      continue;
    }
    n = p;
  }
  return true;
};

// Is the identifier in a type position (or an `export { x }` list, which is a live binding)?
const inTypePosition = (id) => {
  let n = id;
  while (n.parent) {
    if (ts.isTypeNode(n) && !ts.isExpressionWithTypeArguments(n)) {
      return true;
    }
    if (ts.isExpressionWithTypeArguments(n)) {
      // `implements X` is a type; `extends X` on a class is a value; on an interface a type
      const clause = n.parent;
      if (ts.isHeritageClause(clause)) {
        if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          return true;
        }
        if (ts.isInterfaceDeclaration(clause.parent)) {
          return true;
        }
      }
      return false;
    }
    if (ts.isTypeQueryNode(n) || ts.isImportTypeNode(n)) {
      return true;
    }
    // interfaces and type aliases are erased, computed keys in their members included
    if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) {
      return true;
    }
    if (ts.isExportSpecifier(n) || ts.isExportAssignment(n)) {
      return ts.isExportSpecifier(n);
    }
    if (ts.isStatement(n) || ts.isSourceFile(n)) {
      return false;
    }
    n = n.parent;
  }
  return false;
};

// ── statements ─────────────────────────────────────────────────────────
const collectStatements = (sf) => {
  const rows = [];
  const add = (node, specNode, props) => {
    rows.push({
      line: lineOf(sf, node.getStart(sf)),
      specLine: lineOf(sf, specNode.getStart(sf)),
      specifier: specNode.text,
      ...props,
      node,
    });
  };
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const c = st.importClause;
      if (!c) {
        add(st, st.moduleSpecifier, { kind: "side-effect", typeOnly: "none" });
        continue;
      }
      const nb = c.namedBindings;
      const kind = nb && ts.isNamespaceImport(nb) ? "namespace" : "import";
      const elements = nb && ts.isNamedImports(nb) ? nb.elements : [];
      let typeOnly = "none";
      if (c.isTypeOnly) {
        typeOnly = "decl";
      } else if (
        !c.name &&
        elements.length > 0 &&
        elements.every((e) => e.isTypeOnly)
      ) {
        typeOnly = "inline";
      }
      add(st, st.moduleSpecifier, {
        emptyNamed:
          !c.name && nb && ts.isNamedImports(nb) && elements.length === 0,
        kind,
        typeOnly,
      });
    } else if (
      ts.isExportDeclaration(st) &&
      st.moduleSpecifier &&
      ts.isStringLiteral(st.moduleSpecifier)
    ) {
      const ec = st.exportClause;
      let kind = "export-named";
      if (!ec) {
        kind = "export-star";
      } else if (ts.isNamespaceExport(ec)) {
        kind = "export-star-as";
      }
      let typeOnly = "none";
      if (st.isTypeOnly) {
        typeOnly = "decl";
      } else if (
        ec &&
        ts.isNamedExports(ec) &&
        ec.elements.length > 0 &&
        ec.elements.every((e) => e.isTypeOnly)
      ) {
        typeOnly = "inline";
      }
      add(st, st.moduleSpecifier, { kind, typeOnly });
    } else if (
      ts.isImportEqualsDeclaration(st) &&
      ts.isExternalModuleReference(st.moduleReference) &&
      ts.isStringLiteral(st.moduleReference.expression)
    ) {
      add(st, st.moduleReference.expression, {
        kind: "import-equals",
        typeOnly: st.isTypeOnly ? "decl" : "none",
      });
    }
  }
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        add(node, node.arguments[0], { kind: "dynamic", typeOnly: "none" });
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      ) {
        add(node, node.arguments[0], {
          kind: atModuleEvaluation(node) ? "require" : "require-lazy",
          typeOnly: "none",
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return rows;
};

// Specifiers still present after TypeScript's own import elision.
const survivingSpecifiers = (file, text, transpileOptions) => {
  if (/\.d\.[cm]?ts$/.test(file)) {
    return new Set();
  }
  let out = text;
  if (/\.[cm]?tsx?$/.test(file)) {
    out = ts.transpileModule(text, {
      compilerOptions: transpileOptions,
      fileName: file,
    }).outputText;
  }
  const js = ts.createSourceFile(
    `${file}.out.${/x$/.test(file) ? "jsx" : "js"}`,
    out,
    ts.ScriptTarget.ESNext,
    true,
    /x$/.test(file) ? ts.ScriptKind.JSX : ts.ScriptKind.JS
  );
  const keep = new Set();
  for (const st of js.statements) {
    if (
      (ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) &&
      st.moduleSpecifier &&
      ts.isStringLiteral(st.moduleSpecifier)
    ) {
      keep.add(st.moduleSpecifier.text);
    }
  }
  return keep;
};

// ── models ─────────────────────────────────────────────────────────────
const STATIC_KINDS = new Set([
  "import",
  "namespace",
  "side-effect",
  "export-named",
  "export-star",
  "export-star-as",
  "import-equals",
]);
const inModel = {
  all: (s) => STATIC_KINDS.has(s.kind),
  biome: (s) =>
    (STATIC_KINDS.has(s.kind) ||
      ["dynamic", "require", "require-lazy"].includes(s.kind)) &&
    s.typeOnly === "none",
  eslint: (s) =>
    (STATIC_KINDS.has(s.kind) || s.kind === "dynamic") && s.typeOnly === "none",
  lazy: (s) =>
    (STATIC_KINDS.has(s.kind) && s.survives) ||
    ["dynamic", "require", "require-lazy"].includes(s.kind),
  oxlint: (s) =>
    STATIC_KINDS.has(s.kind) &&
    (s.typeOnly === "none" ||
      (s.kind === "export-star" && s.typeOnly === "decl")),
  runtime: (s) =>
    (STATIC_KINDS.has(s.kind) && s.survives) || s.kind === "require",
};
const MODELS = Object.keys(inModel);

// ── main analysis ──────────────────────────────────────────────────────
const analyse = (name) => {
  const { repo, files: measuredRel } = ic.collect(name);
  const root = resolve(repo.root);
  const sha = ic.gitHead(root);
  const measured = new Set(measuredRel.map((f) => join(root, f)));
  const { options, parsed } = ic.compilerOptionsFor(
    root,
    ic.SETUP[name].tsconfig
  );
  const verbatim = Boolean(parsed.verbatimModuleSyntax);
  const transpileOptions = {
    emitDecoratorMetadata: Boolean(parsed.emitDecoratorMetadata),
    experimentalDecorators: Boolean(parsed.experimentalDecorators),
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    verbatimModuleSyntax: verbatim,
  };
  const host = ts.createCompilerHost(options, true);
  const { packages, resolveSpec } = ic.makeResolver(root, options, host);
  host.resolveModuleNameLiterals = (literals, containingFile) =>
    literals.map((lit) => {
      const r = resolveSpec(lit.text, containingFile);
      if (!r.file) {
        return { resolvedModule: undefined };
      }
      let extension;
      try {
        extension = ts.extensionFromPath(r.file);
      } catch {
        return { resolvedModule: undefined };
      }
      return {
        resolvedModule: {
          extension,
          isExternalLibraryImport: false,
          resolvedFileName: r.file,
        },
      };
    });
  const program = ts.createProgram({ host, options, rootNames: [...measured] });
  const checker = program.getTypeChecker();

  const inClone = (f) =>
    f.startsWith(root + sep) && !f.includes(`${sep}node_modules${sep}`);
  const sfs = program.getSourceFiles().filter((sf) => inClone(sf.fileName));
  const nodeSet = new Set(sfs.map((sf) => sf.fileName));
  const sfByFile = new Map(sfs.map((sf) => [sf.fileName, sf]));

  // statements and resolution
  const resolution = {
    dist: 0,
    external: 0,
    fallback: 0,
    resolved: 0,
    unresolved: 0,
  };
  const unresolvedRelative = [];
  const statements = new Map(); // file -> rows
  for (const sf of sfs) {
    const file = sf.fileName;
    const rows = collectStatements(sf);
    const survivors = survivingSpecifiers(file, sf.text, transpileOptions);
    for (const s of rows) {
      const r = resolveSpec(s.specifier, file);
      s.how = r.how;
      s.target = r.file && nodeSet.has(r.file) ? r.file : null;
      if (r.file && !nodeSet.has(r.file)) {
        // resolved to a file the program didn't load (e.g. JSON): not part of the JS graph
        s.how = `${r.how}-nonjs`;
      }
      s.survives = STATIC_KINDS.has(s.kind) && survivors.has(s.specifier);
      if (measured.has(file)) {
        resolution[r.how] = (resolution[r.how] ?? 0) + 1;
        if (r.how === "unresolved" && unresolvedRelative.length < 15) {
          unresolvedRelative.push(`${rel(root, file)} -> ${s.specifier}`);
        }
      }
    }
    statements.set(file, rows);
  }

  // adjacency per model: (from -> Set(to)), plus the statements behind each edge
  const succ = Object.fromEntries(MODELS.map((m) => [m, new Map()]));
  for (const [file, rows] of statements) {
    for (const m of MODELS) {
      succ[m].set(file, new Set());
    }
    for (const s of rows) {
      if (!s.target) {
        continue;
      }
      for (const m of MODELS) {
        if (inModel[m](s)) {
          succ[m].get(file).add(s.target);
        }
      }
    }
  }
  const nodes = [...nodeSet].sort();
  const succList = (m) => {
    const cache = new Map();
    return (v) => {
      let x = cache.get(v);
      if (!x) {
        x = [...(succ[m].get(v) ?? [])].filter((w) => w !== v).sort();
        cache.set(v, x);
      }
      return x;
    };
  };
  const components = {};
  const compOf = {};
  for (const m of MODELS) {
    const comps = ic
      .scc(nodes, succList(m))
      .filter((c) => c.length > 1)
      .map((c) => c.sort());
    components[m] = comps;
    compOf[m] = new Map();
    comps.forEach((c, i) => {
      for (const f of c) {
        compOf[m].set(f, i);
      }
    });
  }
  const selfLoops = [];
  for (const [file, rows] of statements) {
    for (const s of rows) {
      if (s.target === file) {
        selfLoops.push({
          file: rel(root, file),
          kind: s.kind,
          line: s.specLine,
          specifier: s.specifier,
        });
      }
    }
  }

  // ── barrels ──────────────────────────────────────────────────────────
  const entries = new Set();
  const wildcardEntries = new Set();
  const ownPackages = packages.filter((p) =>
    [...measured].some((f) => f.startsWith(p.root + sep))
  );
  for (const pkg of ownPackages) {
    const { files, wildcard } = ic.entryFiles(pkg);
    for (const f of files) {
      entries.add(f);
    }
    for (const f of wildcard) {
      wildcardEntries.add(f);
    }
  }
  for (const extra of ic.ENTRY_EXTRA[name] ?? []) {
    entries.add(join(root, extra));
  }
  const barrelOf = new Map();
  for (const sf of sfs) {
    const file = sf.fileName;
    if (/\.d\.[cm]?ts$/.test(file)) {
      continue;
    }
    const importBindings = new Map(); // local name -> import statement
    for (const st of sf.statements) {
      if (
        ts.isImportDeclaration(st) &&
        st.importClause &&
        !st.importClause.isTypeOnly
      ) {
        const c = st.importClause;
        if (c.name) {
          importBindings.set(c.name.text, st);
        }
        if (c.namedBindings) {
          if (ts.isNamespaceImport(c.namedBindings)) {
            importBindings.set(c.namedBindings.name.text, st);
          } else {
            for (const el of c.namedBindings.elements) {
              if (!el.isTypeOnly) {
                importBindings.set(el.name.text, st);
              }
            }
          }
        }
      }
    }
    // names re-exported through a local `export { a, b }` list
    const reexportedLocals = new Set();
    for (const st of sf.statements) {
      if (
        ts.isExportDeclaration(st) &&
        !st.moduleSpecifier &&
        st.exportClause &&
        ts.isNamedExports(st.exportClause)
      ) {
        for (const el of st.exportClause.elements) {
          reexportedLocals.add((el.propertyName ?? el.name).text);
        }
      }
    }
    // an import is "re-exported" if every one of its bindings is in a local export list and is
    // used nowhere else in the file
    const usedElsewhere = new Set();
    const scan = (n) => {
      if (ts.isIdentifier(n) && importBindings.has(n.text)) {
        const p = n.parent;
        const inImport =
          p &&
          (ts.isImportSpecifier(p) ||
            ts.isImportClause(p) ||
            ts.isNamespaceImport(p));
        const inLocalExport =
          p && ts.isExportSpecifier(p) && !p.parent.parent.moduleSpecifier;
        if (!inImport && !inLocalExport) {
          usedElsewhere.add(n.text);
        }
      }
      ts.forEachChild(n, scan);
    };
    scan(sf);
    const counts = {
      exportNamed: 0,
      exportNamedSpecifiers: 0,
      exportStar: 0,
      exportStarAs: 0,
      importReexported: 0,
      localExportLists: 0,
      other: 0,
      plainImports: 0,
      typeReexports: 0,
    };
    const reexportTargets = new Set();
    for (const st of sf.statements) {
      if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
        const ec = st.exportClause;
        const allTypes =
          st.isTypeOnly ||
          (ec &&
            ts.isNamedExports(ec) &&
            ec.elements.length > 0 &&
            ec.elements.every((e) => e.isTypeOnly));
        if (allTypes) {
          counts.typeReexports++;
          continue;
        }
        if (!ec) {
          counts.exportStar++;
        } else if (ts.isNamespaceExport(ec)) {
          counts.exportStarAs++;
        } else {
          counts.exportNamed++;
          counts.exportNamedSpecifiers += ec.elements.filter(
            (e) => !e.isTypeOnly
          ).length;
        }
        const r = resolveSpec(st.moduleSpecifier.text, file);
        if (r.file) {
          reexportTargets.add(r.file);
        }
      } else if (ts.isImportDeclaration(st)) {
        const c = st.importClause;
        const names = [];
        if (c?.name) {
          names.push(c.name.text);
        }
        if (c?.namedBindings) {
          if (ts.isNamespaceImport(c.namedBindings)) {
            names.push(c.namedBindings.name.text);
          } else {
            names.push(
              ...c.namedBindings.elements
                .filter((e) => !e.isTypeOnly)
                .map((e) => e.name.text)
            );
          }
        }
        if (
          c &&
          !c.isTypeOnly &&
          names.length > 0 &&
          names.every((n) => reexportedLocals.has(n) && !usedElsewhere.has(n))
        ) {
          counts.importReexported++;
          const r = resolveSpec(st.moduleSpecifier.text, file);
          if (r.file) {
            reexportTargets.add(r.file);
          }
        } else {
          counts.plainImports++;
        }
      } else if (ts.isExportDeclaration(st) && !st.moduleSpecifier) {
        const els =
          st.exportClause && ts.isNamedExports(st.exportClause)
            ? st.exportClause.elements
            : [];
        if (
          els.length > 0 &&
          els.every((e) => importBindings.has((e.propertyName ?? e.name).text))
        ) {
          counts.localExportLists++;
        } else if (els.length === 0) {
          // `export {}`: a module marker
        } else {
          counts.other++;
        }
      } else {
        counts.other++;
      }
    }
    const valueReexports =
      counts.exportNamed +
      counts.exportStar +
      counts.exportStarAs +
      counts.importReexported;
    const reexportStatements = valueReexports + counts.typeReexports;
    const share =
      reexportStatements / Math.max(1, reexportStatements + counts.other);
    let tier = null;
    if (
      valueReexports >= 1 &&
      counts.other === 0 &&
      counts.plainImports === 0
    ) {
      tier = "pure";
    } else if (valueReexports >= 2 && share >= 0.5) {
      tier = "mostly";
    }
    const hasValueExportFrom =
      counts.exportNamed + counts.exportStar + counts.exportStarAs > 0;
    if (valueReexports > 0 || counts.typeReexports > 0) {
      barrelOf.set(file, {
        ...counts,
        biomePredicted: hasValueExportFrom,
        entry: entries.has(file),
        index: /^index\.[cm]?[jt]sx?$/.test(basename(file)),
        reexportTargets: [...reexportTargets],
        share: Math.round(share * 100) / 100,
        tier,
        valueReexports,
        wildcardEntry: wildcardEntries.has(file),
      });
    }
  }
  const isBarrel = (f) => Boolean(barrelOf.get(f)?.tier);

  // ── closures (runtime static edges) ──────────────────────────────────
  const closureCache = new Map();
  const closure = (start, m = "runtime") => {
    const key = `${m}\0${start}`;
    const hit = closureCache.get(key);
    if (hit) {
      return hit;
    }
    const seen = new Set([start]);
    const stack = [start];
    while (stack.length > 0) {
      const v = stack.pop();
      for (const w of succ[m].get(v) ?? []) {
        if (!seen.has(w)) {
          seen.add(w);
          stack.push(w);
        }
      }
    }
    closureCache.set(key, seen);
    return seen;
  };
  const reaches = (from, to, m) => closure(from, m).has(to);

  // ── declaring module of each imported name (for debarrelling and fan-out) ─
  const resolveAlias = (sym) => {
    let cur = sym;
    for (let i = 0; i < 20 && cur && cur.flags & ts.SymbolFlags.Alias; i++) {
      try {
        cur = checker.getAliasedSymbol(cur);
      } catch {
        return null;
      }
    }
    return cur;
  };
  const declaringFiles = (s) => {
    // -> Set of files declaring the statement's named/default bindings, or null if unknown
    const st = s.node;
    if (!ts.isImportDeclaration(st) || !st.importClause) {
      return null;
    }
    const c = st.importClause;
    if (c.namedBindings && ts.isNamespaceImport(c.namedBindings)) {
      // `import * as ns`: the declarations of the members it reads (`ns.x`); unknown if the
      // namespace object itself escapes or is indexed dynamically
      const sf = st.getSourceFile();
      const nsSym = checker.getSymbolAtLocation(c.namedBindings.name);
      const out = new Set();
      let unknown = false;
      const visit = (n) => {
        if (unknown || ts.isImportDeclaration(n)) {
          return;
        }
        if (
          ts.isIdentifier(n) &&
          n.text === c.namedBindings.name.text &&
          checker.getSymbolAtLocation(n) === nsSym
        ) {
          const p = n.parent;
          if (ts.isQualifiedName(p) || inTypePosition(n)) {
            // a type reference: no runtime dependency
          } else if (ts.isPropertyAccessExpression(p) && p.expression === n) {
            const member = checker.getSymbolAtLocation(p.name);
            const target = member && resolveAlias(member);
            const file = target?.declarations?.[0]?.getSourceFile().fileName;
            if (file && nodeSet.has(file)) {
              out.add(file);
            } else {
              unknown = true;
            }
          } else {
            unknown = true;
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
      return unknown || out.size === 0 ? null : out;
    }
    const nameNodes = [];
    if (c.name) {
      nameNodes.push(c.name);
    }
    if (c.namedBindings && ts.isNamedImports(c.namedBindings)) {
      for (const el of c.namedBindings.elements) {
        if (!el.isTypeOnly) {
          nameNodes.push(el.name);
        }
      }
    }
    if (nameNodes.length === 0) {
      return null;
    }
    const out = new Set();
    for (const n of nameNodes) {
      const sym = checker.getSymbolAtLocation(n);
      const target = sym && resolveAlias(sym);
      const decl = target?.declarations?.[0];
      const file = decl?.getSourceFile().fileName;
      if (!file || !nodeSet.has(file)) {
        return null;
      }
      out.add(file);
    }
    return out;
  };

  // debarrelled runtime graph
  const debarrelled = new Map();
  for (const [file, rows] of statements) {
    const set = new Set();
    for (const s of rows) {
      if (!s.target || !inModel.runtime(s)) {
        continue;
      }
      if (s.kind === "import" || s.kind === "namespace") {
        const decl = declaringFiles(s);
        if (decl) {
          for (const d of decl) {
            if (d !== file) {
              set.add(d);
            }
          }
          continue;
        }
      }
      set.add(s.target);
    }
    debarrelled.set(file, set);
  }
  const debarrelledComps = ic
    .scc(nodes, (v) =>
      [...(debarrelled.get(v) ?? [])].filter((w) => w !== v).sort()
    )
    .filter((c) => c.length > 1);
  const debarrelledOf = new Map();
  debarrelledComps.forEach((c, i) => {
    for (const f of c) {
      debarrelledOf.set(f, i);
    }
  });

  // ── is reading this imported binding during module evaluation a TDZ risk? ─
  // let/const/class/enum bindings are uninitialised until their module has evaluated (TDZ), and a
  // var is undefined. A function declaration is initialised when the module is instantiated, so
  // calling it early is safe unless its body reads its own module's state (or another import),
  // which is the case in subject A (isValidPlacement reads the const `placements`).
  const riskCache = new Map();
  const isTopLevelState = (decl) => {
    if (ts.isVariableDeclaration(decl)) {
      const stmt = decl.parent?.parent;
      return Boolean(
        stmt && ts.isVariableStatement(stmt) && ts.isSourceFile(stmt.parent)
      );
    }
    return (
      (ts.isClassDeclaration(decl) || ts.isEnumDeclaration(decl)) &&
      ts.isSourceFile(decl.parent)
    );
  };
  const bindingRisk = (sym, depth = 0) => {
    const target = resolveAlias(sym);
    if (riskCache.has(target)) {
      return riskCache.get(target);
    }
    const decl = target?.declarations?.[0];
    let out = { kind: "unknown", risky: true };
    if (decl && ts.isFunctionDeclaration(decl) && decl.body) {
      riskCache.set(target, { kind: "function", risky: false }); // recursion guard
      let reads = false;
      const visit = (n) => {
        if (reads) {
          return;
        }
        if (ts.isIdentifier(n) && !inTypePosition(n)) {
          const s2 = checker.getSymbolAtLocation(n);
          const d2 = s2?.declarations?.[0];
          if (
            d2 &&
            d2.getSourceFile() === decl.getSourceFile() &&
            isTopLevelState(d2)
          ) {
            reads = true;
            return;
          }
          if (
            s2 &&
            s2.flags & ts.SymbolFlags.Alias &&
            depth < 3 &&
            bindingRisk(s2, depth + 1).risky
          ) {
            reads = true;
            return;
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(decl.body);
      out = { kind: "function", risky: reads };
    } else if (decl) {
      out = { kind: ts.SyntaxKind[decl.kind], risky: true };
    }
    riskCache.set(target, out);
    return out;
  };
  const isCalled = (n) => {
    const p = n.parent;
    return Boolean(
      p &&
      (((ts.isCallExpression(p) || ts.isNewExpression(p)) &&
        p.expression === n) ||
        (ts.isTaggedTemplateExpression(p) && p.tag === n) ||
        ts.isDecorator(p))
    );
  };

  // ── top-level use detection for runtime cycle edges ──────────────────
  const usageOf = (file, s) => {
    // How the statement's bindings are used in `file`: { topLevel: [...], late: n, typeOnly: n }
    const sf = sfByFile.get(file);
    const st = s.node;
    const out = { indirect: [], late: 0, topLevel: [], type: 0 };
    if (ts.isExportDeclaration(st)) {
      out.reexport = true;
      return out;
    }
    if (!ts.isImportDeclaration(st) || !st.importClause) {
      out.sideEffect = true;
      return out;
    }
    const c = st.importClause;
    const aliasSyms = new Set();
    const add = (n) => {
      const sym = checker.getSymbolAtLocation(n);
      if (sym) {
        aliasSyms.add(sym);
      }
    };
    if (c.name) {
      add(c.name);
    }
    if (c.namedBindings) {
      if (ts.isNamespaceImport(c.namedBindings)) {
        add(c.namedBindings.name);
      } else {
        for (const el of c.namedBindings.elements) {
          if (!el.isTypeOnly) {
            add(el.name);
          }
        }
      }
    }
    // Local callables. A function's body runs when it's called; a class's constructor, instance
    // initializers and `extends` expression run on `new`; a static member runs when it's called.
    // A callable is tainted when the code that runs uses an imported binding, directly or through
    // another tainted callable. `class X extends Local` runs nothing of Local, so it isn't a use.
    const fnBodies = new Map();
    const classParts = new Map();
    const addClass = (sym, cls) => {
      const ctor = [];
      const statics = new Map();
      for (const h of cls.heritageClauses ?? []) {
        if (h.token === ts.SyntaxKind.ExtendsKeyword) {
          ctor.push(...h.types);
        }
      }
      for (const m of cls.members) {
        if (ts.isConstructorDeclaration(m) && m.body) {
          ctor.push(m.body);
        } else if (ts.isPropertyDeclaration(m) && m.initializer) {
          if (isStatic(m)) {
            statics.set(m.name.getText(sf), m.initializer);
          } else {
            ctor.push(m.initializer);
          }
        } else if (
          (ts.isMethodDeclaration(m) ||
            ts.isGetAccessorDeclaration(m) ||
            ts.isSetAccessorDeclaration(m)) &&
          isStatic(m) &&
          m.body
        ) {
          statics.set(m.name.getText(sf), m.body);
        }
      }
      classParts.set(sym, { ctor, statics });
    };
    for (const top of sf.statements) {
      if (ts.isFunctionDeclaration(top) && top.name && top.body) {
        const sym = checker.getSymbolAtLocation(top.name);
        if (sym) {
          fnBodies.set(sym, top.body);
        }
      } else if (ts.isClassDeclaration(top) && top.name) {
        const sym = checker.getSymbolAtLocation(top.name);
        if (sym) {
          addClass(sym, top);
        }
      } else if (ts.isVariableStatement(top)) {
        for (const d of top.declarationList.declarations) {
          if (!ts.isIdentifier(d.name) || !d.initializer) {
            continue;
          }
          const sym = checker.getSymbolAtLocation(d.name);
          if (!sym) {
            continue;
          }
          if (
            ts.isArrowFunction(d.initializer) ||
            ts.isFunctionExpression(d.initializer)
          ) {
            fnBodies.set(sym, d.initializer.body);
          } else if (ts.isClassExpression(d.initializer)) {
            addClass(sym, d.initializer);
          }
        }
      }
    }
    const refsIn = (node, target) => {
      let found = false;
      const v = (n) => {
        if (found) {
          return;
        }
        if (ts.isIdentifier(n) && !inTypePosition(n)) {
          const sym =
            n.parent &&
            ts.isShorthandPropertyAssignment(n.parent) &&
            n.parent.name === n
              ? checker.getShorthandAssignmentValueSymbol(n.parent)
              : checker.getSymbolAtLocation(n);
          if (sym && target(sym)) {
            found = true;
            return;
          }
        }
        ts.forEachChild(n, v);
      };
      v(node);
      return found;
    };
    const taintedFn = new Set();
    const taintedCtor = new Set();
    const taintedStatic = new Map(); // sym -> Set(member names)
    const isTaintedRef = (sym) =>
      aliasSyms.has(sym) ||
      taintedFn.has(sym) ||
      taintedCtor.has(sym) ||
      taintedStatic.has(sym);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [sym, body] of fnBodies) {
        if (!taintedFn.has(sym) && refsIn(body, isTaintedRef)) {
          taintedFn.add(sym);
          changed = true;
        }
      }
      for (const [sym, parts] of classParts) {
        if (
          !taintedCtor.has(sym) &&
          parts.ctor.some((n) => refsIn(n, isTaintedRef))
        ) {
          taintedCtor.add(sym);
          changed = true;
        }
        for (const [member, body] of parts.statics) {
          const set = taintedStatic.get(sym) ?? new Set();
          if (!set.has(member) && refsIn(body, isTaintedRef)) {
            set.add(member);
            taintedStatic.set(sym, set);
            changed = true;
          }
        }
      }
    }
    const visit = (n) => {
      if (ts.isImportDeclaration(n)) {
        return;
      }
      if (ts.isIdentifier(n)) {
        const sym =
          n.parent &&
          ts.isShorthandPropertyAssignment(n.parent) &&
          n.parent.name === n
            ? checker.getShorthandAssignmentValueSymbol(n.parent)
            : checker.getSymbolAtLocation(n);
        if (sym && aliasSyms.has(sym)) {
          if (inTypePosition(n)) {
            out.type++;
          } else if (atModuleEvaluation(n)) {
            const r = bindingRisk(sym);
            // a function declaration only referenced (not called) is already initialised
            const risky =
              r.kind === "function" ? isCalled(n) && r.risky : r.risky;
            out.topLevel.push({
              binding: r.kind,
              line: lineOf(sf, n.getStart(sf)),
              name: n.text,
              risky,
              text: n.parent.getText(sf).slice(0, 120),
            });
          } else {
            out.late++;
          }
        } else if (sym && atModuleEvaluation(n)) {
          // a call at module evaluation of a local callable whose executed code uses the import
          const p = n.parent;
          const callee = (x) =>
            (ts.isCallExpression(x.parent) ||
              ts.isTaggedTemplateExpression(x.parent)) &&
            (x.parent.expression === x || x.parent.tag === x);
          let fires = false;
          if (taintedFn.has(sym) && (callee(n) || ts.isDecorator(p))) {
            fires = true;
          } else if (
            taintedCtor.has(sym) &&
            ts.isNewExpression(p) &&
            p.expression === n
          ) {
            fires = true;
          } else if (
            taintedStatic.has(sym) &&
            ts.isPropertyAccessExpression(p) &&
            p.expression === n &&
            taintedStatic.get(sym).has(p.name.text) &&
            (callee(p) || !ts.isCallExpression(p.parent))
          ) {
            fires = true;
          }
          if (fires) {
            const risky = [...aliasSyms].some((a) => bindingRisk(a).risky);
            out.indirect.push({
              line: lineOf(sf, n.getStart(sf)),
              name: n.text,
              risky,
              text: n.parent.getText(sf).slice(0, 120),
            });
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return out;
  };

  // ── cycles ───────────────────────────────────────────────────────────
  const usageCache = new Map();
  const usage = (file, s) => {
    let u = usageCache.get(s);
    if (!u) {
      u = usageOf(file, s);
      usageCache.set(s, u);
    }
    return u;
  };
  const edgeRow = (from, s) => {
    const row = {
      from: rel(root, from),
      how: s.how,
      kind: s.kind,
      line: s.specLine,
      specifier: s.specifier,
      survives: s.survives,
      to: rel(root, s.target),
      typeOnly: s.typeOnly,
    };
    if (inModel.runtime(s)) {
      const u = usage(from, s);
      row.usage = {
        indirect: u.indirect.slice(0, 3),
        late: u.late,
        reexport: Boolean(u.reexport),
        sideEffect: Boolean(u.sideEffect),
        topLevel: u.topLevel.slice(0, 3),
        type: u.type,
      };
    }
    return row;
  };
  const riskyUse = (u) =>
    u.topLevel.some((t) => t.risky) || u.indirect.some((t) => t.risky);
  const hasTopLevel = (row) => Boolean(row.usage && riskyUse(row.usage));
  const touchesMeasured = (comp) => comp.some((f) => measured.has(f));

  // Runtime cycles: one row per runtime component.
  const cycles = [];
  for (const comp of components.runtime.filter(touchesMeasured)) {
    const set = new Set(comp);
    const edges = [];
    for (const f of comp) {
      for (const s of statements.get(f) ?? []) {
        if (
          s.target &&
          set.has(s.target) &&
          s.target !== f &&
          inModel.runtime(s)
        ) {
          edges.push(edgeRow(f, s));
        }
      }
    }
    const remaining = comp.filter((f) => debarrelledOf.has(f)).length;
    const topLevel = edges.some(hasTopLevel);
    const risk = topLevel ? "top-level-use" : "late-use";
    cycles.push({
      barrelFiles: comp.filter((f) => isBarrel(f)).map((f) => rel(root, f)),
      directTopLevel: edges.some((e) => e.usage?.topLevel.length > 0),
      edges,
      files: comp.map((f) => rel(root, f)),
      id: `${name}-r${String(cycles.length + 1).padStart(2, "0")}`,
      label: remaining === 0 ? "barrel-induced" : risk,
      measuredFiles: comp.filter((f) => measured.has(f)).length,
      remainingAfterDebarrel: remaining,
      risk,
      size: comp.length,
      throughIndex: comp.some((f) => /^index\.[cm]?[jt]sx?$/.test(basename(f))),
      topLevelEdges: edges.filter(hasTopLevel).length,
    });
  }
  // Static components with no runtime cycle inside: type-only.
  const typeOnlyComponents = components.all
    .filter(touchesMeasured)
    .filter((comp) => !comp.some((f) => compOf.runtime.has(f)))
    .map((comp) => {
      const set = new Set(comp);
      const breaking = {};
      for (const f of comp) {
        for (const s of statements.get(f) ?? []) {
          if (
            s.target &&
            set.has(s.target) &&
            inModel.all(s) &&
            !inModel.runtime(s)
          ) {
            const k = s.typeOnly === "none" ? "elided" : `type-${s.typeOnly}`;
            breaking[k] = (breaking[k] ?? 0) + 1;
          }
        }
      }
      return {
        breaking,
        files: comp.length,
        sample: comp.slice(0, 5).map((f) => rel(root, f)),
      };
    });
  // What each linter model sees that isn't a runtime cycle.
  const modelOnly = (m) =>
    components[m]
      .filter(touchesMeasured)
      .filter((comp) => !comp.some((f) => compOf.runtime.has(f)))
      .map((comp) => ({
        files: comp.length,
        sample: comp.slice(0, 4).map((f) => rel(root, f)),
      }));

  // Oxlint's real reports, from the clone root as `ultracite check` runs it, with the cycle path
  // from each diagnostic's note, classified edge by edge.
  const measuredList = [...measured].map((f) => rel(root, f)).sort();
  const ox = ic.runOxlintFull({
    configFile: ic.oxlintConfig(["core", "react"]),
    cwd: root,
    files: measuredList,
    keep: (r) =>
      [
        "import/no-cycle",
        "import/no-self-import",
        "oxc/no-barrel-file",
      ].includes(r),
  });
  if (ox.linted !== measuredList.length) {
    throw new Error(
      `${name}: oxlint linted ${ox.linted} of ${measuredList.length}`
    );
  }
  const abs = (r) => join(root, r);
  const declOrTarget = (s) => {
    if (s.kind === "import" || s.kind === "namespace") {
      const d = declaringFiles(s);
      if (d) {
        return [...d];
      }
    }
    return [s.target];
  };
  const classifyPath = (fileRel, pathRels) => {
    // The note's stack ends with the current file (the walk stops when it reaches it).
    const tail =
      pathRels.at(-1) === fileRel ? pathRels : [...pathRels, fileRel];
    const chain = [fileRel, ...tail].map(abs);
    const hops = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const [x, y] = [chain[i], chain[i + 1]];
      const stmts = (statements.get(x) ?? []).filter((s) => s.target === y);
      const lint = stmts.filter((s) => inModel.oxlint(s));
      const runtime = stmts.filter((s) => inModel.runtime(s));
      hops.push({
        from: rel(root, x),
        kinds: [
          ...new Set(
            stmts.map(
              (s) =>
                `${s.kind}${s.typeOnly === "none" ? "" : `:${s.typeOnly}`}${s.survives ? "" : ":elided"}`
            )
          ),
        ],
        lint: lint.length > 0,
        matched: stmts.length > 0,
        runtime: runtime.length > 0,
        to: rel(root, y),
        topLevel: runtime.some((s) => riskyUse(usage(x, s))),
        topLevelHoistedOnly: runtime.some((s) => {
          const u = usage(x, s);
          return (
            !riskyUse(u) && (u.topLevel.length > 0 || u.indirect.length > 0)
          );
        }),
        topLevelAt: runtime.flatMap((s) => {
          const u = usage(x, s);
          return [...u.topLevel, ...u.indirect]
            .slice(0, 2)
            .map((t) => ({ ...t, file: rel(root, x) }));
        }),
        reexportHop: stmts.some((s) =>
          ["export-named", "export-star", "export-star-as"].includes(s.kind)
        ),
      });
    }
    let label;
    if (hops.some((h) => !h.matched)) {
      label = "unmatched";
    } else if (hops.some((h) => !h.runtime)) {
      label = "type-only";
    } else {
      const f = abs(fileRel);
      const t = chain[1];
      const firstStmts = (statements.get(f) ?? []).filter(
        (s) => s.target === t && inModel.runtime(s)
      );
      const decl = firstStmts.flatMap(declOrTarget);
      const fc = debarrelledOf.get(f);
      const stillCyclic =
        fc !== undefined && decl.some((d) => debarrelledOf.get(d) === fc);
      // any runtime edge between two modules of the path counts, not only the printed hops
      const members = new Set(chain);
      const offPath = [];
      for (const x of members) {
        for (const st of statements.get(x) ?? []) {
          if (
            st.target &&
            st.target !== x &&
            members.has(st.target) &&
            inModel.runtime(st) &&
            riskyUse(usage(x, st))
          ) {
            const u = usage(x, st);
            offPath.push(
              ...[...u.topLevel, ...u.indirect]
                .filter((t) => t.risky)
                .slice(0, 1)
                .map((t) => ({
                  ...t,
                  file: rel(root, x),
                  to: rel(root, st.target),
                }))
            );
          }
        }
      }
      const printedRisk = hops.some((h) => h.topLevel);
      const risk =
        printedRisk || offPath.length > 0 ? "top-level-use" : "late-use";
      label = stillCyclic ? risk : "barrel-induced";
      return {
        hops,
        label,
        printedRisk,
        risk,
        topLevelAnywhere: offPath.slice(0, 4),
      };
    }
    return { hops, label, risk: null };
  };
  // Predicted Oxlint reports: one per (file, specifier) whose statements make an oxlint-model edge
  // inside an oxlint-model component.
  const predicted = new Map();
  for (const f of measured) {
    const seen = new Set();
    for (const s of statements.get(f) ?? []) {
      if (!STATIC_KINDS.has(s.kind) || seen.has(s.specifier)) {
        continue;
      }
      seen.add(s.specifier);
      const sameKey = (statements.get(f) ?? []).filter(
        (x) => x.specifier === s.specifier && STATIC_KINDS.has(x.kind)
      );
      if (
        !s.target ||
        s.target === f ||
        !sameKey.some((x) => inModel.oxlint(x))
      ) {
        continue;
      }
      const c = compOf.oxlint.get(f);
      if (c !== undefined && c === compOf.oxlint.get(s.target)) {
        predicted.set(`${rel(root, f)}:${s.specLine}`, {
          file: rel(root, f),
          line: s.specLine,
          specifier: s.specifier,
          to: rel(root, s.target),
        });
      }
    }
  }
  const oxCycle = ox.diagnostics.filter((d) => d.rule === "import/no-cycle");
  const actual = new Map(oxCycle.map((d) => [`${d.file}:${d.line}`, d]));
  const reports = oxCycle.map((d) => {
    const path = ic.parseCycleNote(d.note);
    const c = classifyPath(d.file, path);
    return {
      file: d.file,
      hops: c.hops,
      label: c.label,
      line: d.line,
      path,
      predicted: predicted.has(`${d.file}:${d.line}`),
      printedRisk: c.printedRisk ?? null,
      risk: c.risk,
      topLevelAnywhere: c.topLevelAnywhere ?? [],
    };
  });
  const missed = [...predicted.values()].filter(
    (p) => !actual.has(`${p.file}:${p.line}`)
  );

  // ── fan-out through internal barrels ─────────────────────────────────
  const fanout = [];
  const fanoutUnknown = [];
  for (const [file, rows] of statements) {
    for (const s of rows) {
      if (
        !s.target ||
        !isBarrel(s.target) ||
        !inModel.runtime(s) ||
        !["import", "namespace"].includes(s.kind)
      ) {
        continue;
      }
      const b = barrelOf.get(s.target);
      if (b.entry || b.wildcardEntry) {
        continue;
      }
      const decl = declaringFiles(s);
      if (!decl) {
        fanoutUnknown.push({
          barrel: rel(root, s.target),
          consumer: rel(root, file),
          kind: s.kind,
          line: s.specLine,
          measured: measured.has(file),
        });
        continue;
      }
      const viaSet = new Set(closure(s.target));
      const directSet = new Set();
      for (const d of decl) {
        for (const x of closure(d)) {
          directSet.add(x);
          viaSet.add(x);
        }
      }
      fanout.push({
        barrel: rel(root, s.target),
        consumer: rel(root, file),
        consumerMeasured: measured.has(file),
        direct: directSet.size,
        kind: s.kind,
        line: s.specLine,
        names: decl.size,
        via: viaSet.size,
      });
    }
  }

  // ── oxc/no-barrel-file: for each `export *`, 1 for the target plus every module the target
  // loads (Oxlint's module graph, all static imports and re-exports, type-only included), summed
  // over the file's `export *` statements; it fires when the sum exceeds 100.
  const loadedCount = (t) => {
    if ((succ.all.get(t)?.size ?? 0) === 0) {
      return 0;
    }
    return closure(t, "all").size - 1;
  };
  const barrelFilePredicted = [];
  for (const [file, rows] of statements) {
    if (!measured.has(file)) {
      continue;
    }
    const stars = rows.filter(
      (s) => s.kind === "export-star" && s.typeOnly === "none"
    );
    if (stars.length === 0) {
      continue;
    }
    const total = stars.reduce(
      (sum, s) => sum + 1 + (s.target ? loadedCount(s.target) : 0),
      0
    );
    const distinct = new Set();
    for (const s of stars) {
      if (s.target) {
        for (const x of closure(s.target, "all")) {
          distinct.add(x);
        }
      }
    }
    barrelFilePredicted.push({
      distinctModules: distinct.size,
      exportStars: stars.length,
      file: rel(root, file),
      total,
    });
  }
  const oxBarrel = new Map(
    ox.diagnostics
      .filter((d) => d.rule === "oxc/no-barrel-file")
      .map((d) => [
        d.file,
        Number(/(\d+) modules are loaded/.exec(d.message)?.[1]),
      ])
  );
  for (const b of barrelFilePredicted) {
    b.oxlintTotal = oxBarrel.get(b.file) ?? null;
  }

  // ── export * chains ──────────────────────────────────────────────────
  const starSucc = new Map();
  for (const [file, rows] of statements) {
    starSucc.set(
      file,
      rows
        .filter(
          (s) => s.target && s.kind === "export-star" && s.typeOnly === "none"
        )
        .map((s) => s.target)
    );
  }
  const depthMemo = new Map();
  const starDepth = (f, stack = new Set()) => {
    if (depthMemo.has(f)) {
      return depthMemo.get(f);
    }
    if (stack.has(f)) {
      return 0;
    }
    stack.add(f);
    let d = 0;
    for (const t of starSucc.get(f) ?? []) {
      d = Math.max(d, 1 + starDepth(t, stack));
    }
    stack.delete(f);
    depthMemo.set(f, d);
    return d;
  };
  const starChains = [];
  for (const f of nodes) {
    const d = starDepth(f);
    if (d >= 1 && measured.has(f)) {
      starChains.push({ depth: d, file: rel(root, f) });
    }
  }

  // ── namespace imports ────────────────────────────────────────────────
  const namespaces = [];
  for (const file of measured) {
    const sf = sfByFile.get(file);
    if (!sf) {
      continue;
    }
    for (const st of sf.statements) {
      if (
        !ts.isImportDeclaration(st) ||
        !st.importClause?.namedBindings ||
        !ts.isNamespaceImport(st.importClause.namedBindings)
      ) {
        continue;
      }
      const spec = st.moduleSpecifier.text;
      const r = resolveSpec(spec, file);
      let target = "third-party";
      if (spec.startsWith("node:") || BUILTINS.has(spec.split("/")[0])) {
        target = "node-builtin";
      } else if (r.file && r.how === "fallback") {
        target = "workspace-package";
      } else if (r.file) {
        target = "internal";
      } else if (spec.startsWith(".")) {
        target = "internal-unresolved";
      }
      const nsName = st.importClause.namedBindings.name;
      const sym = checker.getSymbolAtLocation(nsName);
      const uses = { dynamic: 0, member: 0, type: 0, whole: 0, reexported: 0 };
      const visit = (n) => {
        if (ts.isImportDeclaration(n)) {
          return;
        }
        if (ts.isIdentifier(n) && n.text === nsName.text) {
          const s2 =
            n.parent &&
            ts.isShorthandPropertyAssignment(n.parent) &&
            n.parent.name === n
              ? checker.getShorthandAssignmentValueSymbol(n.parent)
              : checker.getSymbolAtLocation(n);
          if (s2 && s2 === sym) {
            const p = n.parent;
            if (ts.isExportSpecifier(p)) {
              uses.reexported++;
            } else if (ts.isQualifiedName(p) || inTypePosition(n)) {
              uses.type++;
            } else if (ts.isPropertyAccessExpression(p) && p.expression === n) {
              uses.member++;
            } else if (ts.isElementAccessExpression(p) && p.expression === n) {
              if (ts.isStringLiteralLike(p.argumentExpression)) {
                uses.member++;
              } else {
                uses.dynamic++;
              }
            } else {
              uses.whole++;
            }
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
      let usage = "unused";
      if (uses.whole > 0 || uses.reexported > 0) {
        usage = "whole-object";
      } else if (uses.dynamic > 0) {
        usage = "dynamic-access";
      } else if (uses.member > 0) {
        usage = "member-access";
      } else if (uses.type > 0) {
        usage = "type-only-use";
      }
      namespaces.push({
        file: rel(root, file),
        importType: st.importClause.isTypeOnly,
        line: lineOf(sf, st.getStart(sf)),
        local: nsName.text,
        specifier: spec,
        target,
        targetFile: r.file ? rel(root, r.file) : null,
        targetIsBarrel: r.file ? isBarrel(r.file) : false,
        usage,
        uses,
      });
    }
  }

  // ── cycle-breaking patterns: lazy and type-only edges that close a runtime path ─
  const closers = {
    dynamic: 0,
    requireLazy: 0,
    typeDecl: 0,
    typeInline: 0,
    elided: 0,
  };
  const closerRows = [];
  for (const [file, rows] of statements) {
    if (!measured.has(file)) {
      continue;
    }
    for (const s of rows) {
      if (!s.target || s.target === file) {
        continue;
      }
      let key = null;
      if (s.kind === "dynamic") {
        key = "dynamic";
      } else if (s.kind === "require-lazy") {
        key = "requireLazy";
      } else if (STATIC_KINDS.has(s.kind) && s.typeOnly === "decl") {
        key = "typeDecl";
      } else if (STATIC_KINDS.has(s.kind) && s.typeOnly === "inline") {
        key = "typeInline";
      } else if (STATIC_KINDS.has(s.kind) && !s.survives) {
        key = "elided";
      }
      if (key && reaches(s.target, file, "runtime")) {
        closers[key]++;
        if (closerRows.length < 400) {
          closerRows.push({
            file: rel(root, file),
            kind: key,
            line: s.specLine,
            specifier: s.specifier,
            to: rel(root, s.target),
          });
        }
      }
    }
  }

  // ── summary ──────────────────────────────────────────────────────────
  const statementRows = [];
  for (const [file, rows] of statements) {
    for (const s of rows) {
      statementRows.push({
        emptyNamed: Boolean(s.emptyNamed),
        file: rel(root, file),
        how: s.how,
        pos: s.node.getStart(),
        kind: s.kind,
        line: s.line,
        measured: measured.has(file),
        specLine: s.specLine,
        specifier: s.specifier,
        survives: s.survives,
        target: s.target ? rel(root, s.target) : null,
        typeOnly: s.typeOnly,
      });
    }
  }
  const inCycle = (m) => {
    const set = new Set();
    for (const c of components[m]) {
      if (c.some((f) => measured.has(f))) {
        for (const f of c) {
          if (measured.has(f)) {
            set.add(f);
          }
        }
      }
    }
    return set.size;
  };
  const compSummary = (m) => {
    const comps = components[m].filter((c) => c.some((f) => measured.has(f)));
    return {
      components: comps.length,
      filesInCycles: inCycle(m),
      largest: Math.max(0, ...comps.map((c) => c.length)),
      shareOfFiles: ic.pct(inCycle(m), measured.size),
      sizes: comps.map((c) => c.length).sort((a, b) => b - a),
    };
  };
  const countBy = (list, key) =>
    list.reduce((acc, x) => {
      const k = typeof key === "function" ? key(x) : x[key];
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
  const measuredStatements = statementRows.filter((s) => s.measured);
  const barrels = [...barrelOf.entries()]
    .filter(([f]) => measured.has(f))
    .map(([f, b]) => ({
      file: rel(root, f),
      ...b,
      reexportTargets: b.reexportTargets.map((t) => rel(root, t)),
    }));
  const tiers = barrels.filter((b) => b.tier);
  const fanoutMeasured = fanout.filter((x) => x.consumerMeasured);
  const fanoutStats = (rows) => ({
    consumerImports: rows.length,
    barrels: new Set(rows.map((r) => r.barrel)).size,
    directMedian: ic.median(rows.map((r) => r.direct)),
    extraMax: Math.max(0, ...rows.map((r) => r.via - r.direct)),
    extraMedian: ic.median(rows.map((r) => r.via - r.direct)),
    ratioMax: Math.max(0, ...rows.map((r) => r.via / r.direct)),
    ratioMedian: ic.median(
      rows.map((r) => Math.round((r.via / r.direct) * 100) / 100)
    ),
    viaMax: Math.max(0, ...rows.map((r) => r.via)),
    viaMedian: ic.median(rows.map((r) => r.via)),
  });
  const perBarrel = new Map();
  for (const r of fanoutMeasured) {
    if (!perBarrel.has(r.barrel)) {
      perBarrel.set(r.barrel, []);
    }
    perBarrel.get(r.barrel).push(r);
  }
  const barrelFanout = [...perBarrel].map(([barrel, rows]) => ({
    barrel,
    consumers: rows.length,
    directMedian: ic.median(rows.map((r) => r.direct)),
    extraMedian: ic.median(rows.map((r) => r.via - r.direct)),
    via: Math.max(...rows.map((r) => r.via)),
  }));

  return {
    detail: {
      barrels,
      cycles,
      typeOnlyComponents,
      modelOnly: Object.fromEntries(
        ["oxlint", "eslint", "biome"].map((m) => [m, modelOnly(m)])
      ),
      oxlint: {
        missed,
        reports,
        selfImport: ox.diagnostics.filter(
          (d) => d.rule === "import/no-self-import"
        ),
        barrelFile: ox.diagnostics.filter(
          (d) => d.rule === "oxc/no-barrel-file"
        ),
      },
      barrelFilePredicted,
      fanout,
      fanoutUnknown,
      namespaces,
      closers: closerRows,
      selfLoops,
      starChains,
      statements: statementRows,
      components: Object.fromEntries(
        MODELS.map((m) => [
          m,
          components[m].map((c) => c.map((f) => rel(root, f))),
        ])
      ),
    },
    summary: {
      barrels: {
        byTier: countBy(barrels, (b) => b.tier ?? "some-reexports"),
        entryBarrels: tiers.filter((b) => b.entry).length,
        filesWithValueReexport: barrels.filter((b) => b.valueReexports > 0)
          .length,
        biomePredicted: barrels.filter((b) => b.biomePredicted).length,
        exportStarFiles: barrels.filter((b) => b.exportStar > 0).length,
        exportStarStatements: barrels.reduce((s, b) => s + b.exportStar, 0),
        exportStarAsStatements: barrels.reduce((s, b) => s + b.exportStarAs, 0),
        exportNamedStatements: barrels.reduce((s, b) => s + b.exportNamed, 0),
        importReexportedStatements: barrels.reduce(
          (s, b) => s + b.importReexported,
          0
        ),
        indexBarrels: tiers.filter((b) => b.index).length,
        internalBarrels: tiers.filter((b) => !b.entry && !b.wildcardEntry)
          .length,
        tiered: tiers.length,
        maxStarDepth: Math.max(0, ...starChains.map((c) => c.depth)),
        starChainsDepth2Plus: starChains.filter((c) => c.depth >= 2).length,
      },
      closers,
      cycles: {
        runtime: cycles.length,
        byLabel: countBy(cycles, "label"),
        byRisk: countBy(cycles, "risk"),
        barrelInducedRisk: countBy(
          cycles.filter((c) => c.label === "barrel-induced"),
          "risk"
        ),
        directTopLevel: cycles.filter(
          (c) => c.risk === "top-level-use" && c.directTopLevel
        ).length,
        withBarrel: cycles.filter((c) => c.barrelFiles.length > 0).length,
        withIndex: cycles.filter((c) => c.throughIndex).length,
        sizes: cycles.map((c) => c.size).sort((x, y) => y - x),
        typeOnlyComponents: typeOnlyComponents.length,
        typeOnlySizes: typeOnlyComponents
          .map((c) => c.files)
          .sort((x, y) => y - x),
        modelOnly: Object.fromEntries(
          ["oxlint", "eslint", "biome"].map((m) => [m, modelOnly(m).length])
        ),
      },
      oxlint: {
        noCycle: oxCycle.length,
        predicted: predicted.size,
        matched: reports.filter((r) => r.predicted).length,
        unpredicted: reports.filter((r) => !r.predicted).length,
        missed: missed.length,
        byLabel: countBy(reports, "label"),
        byRisk: countBy(
          reports.filter((r) => r.risk),
          "risk"
        ),
        topLevelPrintedHopsOnly: reports.filter((r) => r.printedRisk).length,
        hoistedOnly: reports.filter(
          (r) =>
            r.risk === "late-use" && r.hops.some((h) => h.topLevelHoistedOnly)
        ).length,
        filesReported: new Set(reports.map((r) => r.file)).size,
        pathLengths: countBy(reports, (r) =>
          r.path.at(-1) === r.file ? r.path.length : r.path.length + 1
        ),
        selfImport: ox.diagnostics.filter(
          (d) => d.rule === "import/no-self-import"
        ).length,
        barrelFile: ox.diagnostics.filter(
          (d) => d.rule === "oxc/no-barrel-file"
        ).length,
        barrelFilePredictedOver100: barrelFilePredicted.filter(
          (b) => b.total > 100
        ).length,
        barrelFileExactTotals: barrelFilePredicted.filter(
          (b) => b.oxlintTotal !== null && b.oxlintTotal === b.total
        ).length,
        exportStarFiles: barrelFilePredicted.length,
        exportStarTotalMedian: ic.median(
          barrelFilePredicted.map((b) => b.total)
        ),
        exportStarTotalMax: Math.max(
          0,
          ...barrelFilePredicted.map((b) => b.total)
        ),
      },
      fanout: {
        unknown: fanoutUnknown.filter((x) => x.measured).length,
        namespaceConsumers: fanoutMeasured.filter((x) => x.kind === "namespace")
          .length,
        all: fanoutStats(fanoutMeasured),
        perBarrel: {
          barrels: barrelFanout.length,
          extraMedianOfMedians: ic.median(
            barrelFanout.map((b) => b.extraMedian)
          ),
          viaMax: Math.max(0, ...barrelFanout.map((b) => b.via)),
          viaMedian: ic.median(barrelFanout.map((b) => b.via)),
        },
      },
      files: { measured: measured.size, program: sfs.length },
      models: Object.fromEntries(MODELS.map((m) => [m, compSummary(m)])),
      namespaces: {
        byTarget: countBy(namespaces, "target"),
        byUsage: countBy(namespaces, "usage"),
        importType: namespaces.filter((n) => n.importType).length,
        total: namespaces.length,
      },
      resolution: {
        ...resolution,
        resolvedShare: ic.pct(
          resolution.resolved + resolution.fallback + resolution.dist,
          Object.values(resolution).reduce((a, b) => a + b, 0)
        ),
        unresolvedRelative,
      },
      selfLoops: selfLoops.length,
      sha,
      statements: {
        byKind: countBy(measuredStatements, "kind"),
        byTypeOnly: countBy(measuredStatements, "typeOnly"),
        internal: measuredStatements.filter((s) => s.target).length,
        internalElided: measuredStatements.filter(
          (s) =>
            s.target &&
            s.typeOnly === "none" &&
            STATIC_KINDS.has(s.kind) &&
            !s.survives
        ).length,
        total: measuredStatements.length,
      },
      verbatimModuleSyntax: verbatim,
    },
  };
};

const main = () => {
  const path = join(ic.RESULTS_DIR, "graph.json");
  const previous = ic.readJson(path, { repos: {} });
  const names = Object.keys(ic.SETUP).filter(
    (n) => ic.only().length === 0 || ic.only().includes(n)
  );
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "See the header of import-cycles-graph.cjs for the method.",
    repos: { ...previous.repos },
    setup: ic.SETUP,
    sparse: ic.SPARSE,
    tools: { typescript: ts.version },
  };
  for (const name of names) {
    const started = Date.now();
    const { detail, summary } = analyse(name);
    summary.seconds = Math.round((Date.now() - started) / 1000);
    result.repos[name] = summary;
    ic.writeJson(join(ic.OUT_DIR, "graph", `${name}.json`), detail);
    console.log(
      `${name}: ${summary.files.measured} files; runtime cycles ${summary.cycles.runtime} ${JSON.stringify(summary.cycles.byLabel)}; type-only comps ${summary.cycles.typeOnlyComponents}; oxlint ${summary.oxlint.noCycle} reports (pred ${summary.oxlint.predicted}, matched ${summary.oxlint.matched}, unpred ${summary.oxlint.unpredicted}, missed ${summary.oxlint.missed}) ${JSON.stringify(summary.oxlint.byLabel)}; models ${MODELS.map((m) => `${m}=${summary.models[m].components}/${summary.models[m].filesInCycles}`).join(" ")}; barrels ${JSON.stringify(summary.barrels.byTier)}; ns ${summary.namespaces.total}; resolved ${summary.resolution.resolvedShare}% (${summary.seconds}s)`
    );
  }
  ic.writeJson(path, result);
};

// Run as a script; func-style-cycles.cjs requires `analyse` without running main.
if (require.main === module) {
  main();
}

module.exports = { analyse };
