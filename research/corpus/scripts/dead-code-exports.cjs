// What a single-file linter can't see: exported symbols nothing else uses, and files nothing
// imports. Uses this repo's TypeScript (no installs) to build one program per repo and resolve
// every reference to every export of the measured files.
//
// Method, per repo:
//   universe   every .ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs file under the reference roots below
//              (the measured package plus its tests, and sibling packages that consume it), minus
//              node_modules, dist and build output, and minified or huge files. .astro, .vue,
//              .svelte, .mdx and .html files are scanned with a regex for `import … from '…'` so
//              components that import from source still count.
//   resolution TypeScript's own module resolution with the measured package's tsconfig options
//              (paths included), forced to `moduleResolution: bundler` with allowJs. When that
//              fails, a fallback maps workspace package names (any package.json in the repo) and
//              their `exports` subpaths to source files: `dist/types/x.d.ts`, `dist/x.js`,
//              `dist/cjs/x.js` -> `src/x.ts` (or the package root), as the build would.
//   references every identifier in the universe whose name matches an export is resolved with the
//              checker, aliases followed to the declaration. A use in another file counts; the
//              identifiers inside import/export declarations don't (they're wiring). Namespace
//              (`ns.x`) and type references count.
//   entries    the package's public entry points: every string in package.json `exports` (all
//              conditions), `main`, `module`, `types` and `bin`, mapped to source as above, plus a
//              short per-repo list (ENTRY_EXTRA) for entries the mapping can't infer. Every symbol
//              the checker lists among an entry's exports (`export *` followed) is public API.
//   strings    a file whose path stem (relative to its package, without extension) appears in any
//              string literal of the universe is "loaded by name" (astro's client directives,
//              vite's client entry).
//
// Each export of a measured file (declared in that file, not a re-export) is classified, first
// match wins:
//   used-in-source    used by another measured source file
//   public-api        reachable from a package entry point
//   used-elsewhere    used only by files outside the measured set (tests, other packages, the app)
//   dynamic           its module is the target of import()/require() or is loaded by name
//   own-file-only     used only inside its own file (the `export` is unnecessary)
//   unreferenced      no reference found
// and every `unreferenced` name is grepped as a whole word in every other text file of the clone,
// so a reference TypeScript didn't resolve (a .astro template, a config, docs) is visible.
//
// next.js and vscode are sparse clones of one directory: references from the rest of the
// repository are invisible, so they're reported as not measurable rather than as dead.
//
// Usage (from the repo root):
//   node --max-old-space-size=16384 research/corpus/scripts/dead-code-exports.cjs [--repos zod,hono]
// Writes results/dead-code/exports.json and out/dead-code/exports/<repo>.json.
"use strict";

const {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative, resolve, sep, extname } = require("node:path");

const lib = require("./dead-code-lib.cjs");
const { collect, getRepo } = require("./collect-files.cjs");

const { ts } = lib;
const OUT = join(lib.OUT_DIR, "exports");

// Where references can come from, per repo (relative to the clone root), and the tsconfig that
// supplies compiler options.
const SETUP = {
  astro: {
    roots: ["packages/astro"],
    tsconfig: "packages/astro/tsconfig.json",
  },
  excalidraw: {
    roots: ["packages", "excalidraw-app", "examples"],
    tsconfig: "tsconfig.json",
  },
  hono: {
    roots: ["src", "benchmarks", "runtime-tests", "perf-measures"],
    tsconfig: "tsconfig.json",
  },
  trpc: { roots: ["packages"], tsconfig: "tsconfig.json" },
  vite: {
    roots: ["packages"],
    tsconfig: "packages/vite/src/node/tsconfig.json",
  },
  zod: {
    roots: ["packages", "play.ts"],
    tsconfig: "packages/zod/tsconfig.json",
  },
};
const NOT_MEASURABLE = {
  "next.js":
    "sparse clone of packages/next/src only: the rest of the repository (and package.json) is absent, so references and entry points can't be seen",
  vscode:
    "sparse clone of src/vs/editor/common only: the rest of VS Code, which imports it, is absent",
};
// Entry points the package.json mapping can't infer, read from each repo's build config.
const ENTRY_EXTRA = {
  vite: [
    // packages/vite/rolldown.config.ts: node entries and the module runner
    "packages/vite/src/node/index.ts",
    "packages/vite/src/node/cli.ts",
    "packages/vite/src/node/internal.ts",
    "packages/vite/src/module-runner/index.ts",
    // served to the browser by path (CLIENT_ENTRY / ENV_ENTRY in src/node/constants.ts)
    "packages/vite/src/client/client.ts",
    "packages/vite/src/client/env.ts",
  ],
};

const SOURCE_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".astro",
  ".turbo",
  "out",
]);
const OTHER_EXT = /\.(?:astro|vue|svelte|mdx|html)$/;

const walk = (dir, out = { code: [], other: [] }) => {
  if (!existsSync(dir)) {
    return out;
  }
  if (statSync(dir).isFile()) {
    out.code.push(dir);
    return out;
  }
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isSymbolicLink() || SKIP_DIRS.has(e.name)) {
      continue;
    }
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      walk(abs, out);
    } else if (SOURCE_EXT.test(e.name) && !/\.d\.[cm]?ts$/.test(e.name)) {
      const size = statSync(abs).size;
      if (size < 1_000_000) {
        out.code.push(abs);
      }
    } else if (/\.d\.[cm]?ts$/.test(e.name)) {
      out.code.push(abs);
    } else if (OTHER_EXT.test(e.name)) {
      out.other.push(abs);
    }
  }
  return out;
};

// ── workspace packages and entry mapping ───────────────────────────────
const findPackages = (root) => {
  const pkgs = [];
  const visit = (dir, depth) => {
    if (depth > 4) {
      return;
    }
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (
        e.isSymbolicLink() ||
        SKIP_DIRS.has(e.name) ||
        e.name.startsWith(".")
      ) {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        visit(abs, depth + 1);
      } else if (e.name === "package.json") {
        try {
          const json = JSON.parse(readFileSync(abs, "utf8"));
          if (json.name) {
            pkgs.push({ json, name: json.name, root: dir });
          }
        } catch {
          // not JSON
        }
      }
    }
  };
  visit(root, 0);
  return pkgs;
};

const TS_EXTS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const probe = (base) => {
  const stem = base.replace(/\.d\.[cm]?ts$/, "").replace(/\.[cm]?[jt]sx?$/, "");
  for (const candidate of [
    ...TS_EXTS.map((x) => stem + x),
    ...TS_EXTS.map((x) => join(stem, `index${x}`)),
  ]) {
    if (
      existsSync(candidate) &&
      statSync(candidate).isFile() &&
      !/\.d\.[cm]?ts$/.test(candidate)
    ) {
      return candidate;
    }
  }
  return null;
};
// A built path (dist/…) back to the source file that produced it.
const toSource = (pkgRoot, target) => {
  if (typeof target !== "string" || target.includes("*")) {
    return null;
  }
  const rel = target.replace(/^\.\//, "");
  const direct = probe(join(pkgRoot, rel));
  if (direct && !/(?:^|\/)dist\//.test(rel)) {
    return direct;
  }
  const stripped = rel.replace(
    /^dist\/(?:types\/|cjs\/|esm\/|prod\/|dev\/|node\/)?/,
    ""
  );
  const nodeKept = rel.replace(/^dist\//, "");
  for (const base of [
    join(pkgRoot, "src", stripped),
    join(pkgRoot, "src", nodeKept),
    join(pkgRoot, stripped),
    join(dirname(pkgRoot), stripped),
  ]) {
    const hit = probe(base);
    if (hit) {
      return hit;
    }
  }
  return null;
};
const exportTargets = (exp) => {
  const out = [];
  const visit = (v, key) => {
    if (typeof v === "string") {
      out.push({ key, target: v });
    } else if (Array.isArray(v)) {
      for (const x of v) {
        visit(x, key);
      }
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        visit(x, k.startsWith(".") ? k : key);
      }
    }
  };
  visit(exp, ".");
  return out;
};
const entryFiles = (pkg) => {
  const files = new Set();
  const wildcard = new Set();
  const unmapped = [];
  const targets = [
    ...exportTargets(pkg.json.exports ?? {}),
    ...["main", "module", "types", "typings", "browser"]
      .filter((k) => typeof pkg.json[k] === "string")
      .map((k) => ({ key: k, target: pkg.json[k] })),
    ...Object.values(
      typeof pkg.json.bin === "object"
        ? pkg.json.bin
        : pkg.json.bin
          ? { bin: pkg.json.bin }
          : {}
    ).map((t) => ({ key: "bin", target: t })),
  ];
  for (const { key, target } of targets) {
    if (/package\.json$|\.css$|\.json$/.test(target)) {
      continue;
    }
    if (target.includes("*")) {
      // wildcard subpath: every source file under the mapped directory is public
      const dirTarget = target
        .slice(0, target.indexOf("*"))
        .replace(/^\.\//, "");
      const strippedDir = dirTarget.replace(/^dist\/(?:types\/)?/, "");
      for (const base of [
        join(pkg.root, "src", strippedDir),
        join(pkg.root, strippedDir),
        join(dirname(pkg.root), strippedDir),
      ]) {
        if (existsSync(base) && statSync(base).isDirectory()) {
          for (const f of walk(base).code) {
            if (!/\.d\.[cm]?ts$/.test(f)) {
              wildcard.add(f);
            }
          }
          break;
        }
      }
      continue;
    }
    const src = toSource(pkg.root, target);
    if (src) {
      files.add(src);
    } else {
      unmapped.push(`${key}: ${target}`);
    }
  }
  return {
    files: [...files],
    unmapped: [...new Set(unmapped)],
    wildcard: [...wildcard],
  };
};

// ── main ───────────────────────────────────────────────────────────────
const analyse = (name) => {
  const repo = getRepo(name);
  const root = resolve(repo.root);
  const setup = SETUP[name];
  const measured = new Set(collect(name).files.map((f) => join(root, f)));
  const universe = { code: new Set(), other: [] };
  for (const r of setup.roots) {
    const w = walk(join(root, r));
    for (const f of w.code) {
      universe.code.add(f);
    }
    universe.other.push(...w.other);
  }
  for (const f of measured) {
    universe.code.add(f);
  }
  const packages = findPackages(root);
  const byName = new Map(packages.map((p) => [p.name, p]));

  // compiler options
  const tsconfigPath = join(root, setup.tsconfig);
  const { config: raw } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    raw ?? {},
    ts.sys,
    dirname(tsconfigPath)
  );
  const options = {
    ...parsed.options,
    allowImportingTsExtensions: true,
    allowJs: true,
    checkJs: false,
    composite: false,
    declaration: false,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    types: [],
  };
  delete options.incremental;
  delete options.tsBuildInfoFile;
  delete options.rootDir;
  delete options.outDir;

  // fallback resolution for workspace package names
  const fallback = (spec) => {
    const parts = spec.startsWith("@")
      ? spec.split("/").slice(0, 2)
      : spec.split("/").slice(0, 1);
    const pkgName = parts.join("/");
    const pkg = byName.get(pkgName);
    if (!pkg) {
      return null;
    }
    const sub = spec.slice(pkgName.length);
    const subKey = sub ? `.${sub}` : ".";
    const exp = pkg.json.exports;
    let target = null;
    if (exp && typeof exp === "object") {
      const entry =
        exp[subKey] ??
        (subKey === "." && typeof exp.import === "string" ? exp : null);
      if (entry) {
        const t = exportTargets(entry).map((x) => x.target);
        target =
          t.find((x) => /src\//.test(x)) ??
          t.find((x) => /\.d\.[cm]?ts$/.test(x)) ??
          t[0];
      } else {
        // wildcard
        for (const [k, v] of Object.entries(exp)) {
          if (k.includes("*")) {
            const prefix = k.slice(0, k.indexOf("*"));
            if (subKey.startsWith(prefix)) {
              const rest = subKey.slice(prefix.length);
              const t = exportTargets(v).map((x) => x.target)[0];
              if (t) {
                target = t.replaceAll("*", rest);
              }
            }
          }
        }
      }
    } else if (typeof exp === "string" && subKey === ".") {
      target = exp;
    }
    if (!target && subKey === ".") {
      target =
        pkg.json.source ??
        pkg.json.types ??
        pkg.json.module ??
        pkg.json.main ??
        "./src/index.ts";
    }
    if (!target) {
      target = `./src${sub}`;
    }
    return (
      toSource(pkg.root, target) ??
      probe(join(pkg.root, "src", sub)) ??
      probe(join(pkg.root, sub))
    );
  };

  const host = ts.createCompilerHost(options, true);
  const resolutionStats = {
    distMapped: 0,
    fallback: 0,
    resolved: 0,
    unresolved: 0,
    unresolvedBare: {},
    unresolvedRelative: 0,
    unresolvedRelativeSamples: [],
  };
  // A relative import of built output (`../dist/core/x.js`, as astro's tests do) maps back to src.
  const distToSource = (spec, containingFile) => {
    const abs = resolve(dirname(containingFile), spec);
    const m = /^(.*?)[\\/]dist[\\/](.*)$/.exec(abs);
    if (!m) {
      return null;
    }
    return toSource(m[1], `./dist/${m[2].split(sep).join("/")}`);
  };
  const edges = new Map(); // target file -> Set(source file)
  const addEdge = (from, to) => {
    if (!to) {
      return;
    }
    if (!edges.has(to)) {
      edges.set(to, new Set());
    }
    edges.get(to).add(from);
  };
  host.resolveModuleNameLiterals = (
    literals,
    containingFile,
    _redirect,
    opts
  ) =>
    literals.map((lit) => {
      const spec = lit.text;
      const r = ts.resolveModuleName(spec, containingFile, opts, host);
      let file = r.resolvedModule?.resolvedFileName;
      if (file && file.includes(`${sep}node_modules${sep}`)) {
        // resolved into this repo's own node_modules (outside the clone); not a reference
        resolutionStats.resolved++;
        return r;
      }
      if (!file && spec.startsWith(".")) {
        const mapped = distToSource(spec, containingFile);
        if (mapped) {
          resolutionStats.distMapped++;
          addEdge(containingFile, mapped);
          return {
            resolvedModule: {
              extension: ts.extensionFromPath(mapped),
              isExternalLibraryImport: false,
              resolvedFileName: mapped,
            },
          };
        }
      }
      if (!file && !spec.startsWith(".") && !spec.startsWith("/")) {
        const fb = fallback(spec);
        if (fb) {
          resolutionStats.fallback++;
          addEdge(containingFile, fb);
          return {
            resolvedModule: {
              extension: ts.extensionFromPath(fb),
              isExternalLibraryImport: false,
              resolvedFileName: fb,
            },
          };
        }
      }
      if (file) {
        resolutionStats.resolved++;
        addEdge(containingFile, file);
      } else {
        resolutionStats.unresolved++;
        if (spec.startsWith(".")) {
          resolutionStats.unresolvedRelative++;
          if (resolutionStats.unresolvedRelativeSamples.length < 12) {
            resolutionStats.unresolvedRelativeSamples.push(
              `${relative(root, containingFile)} -> ${spec}`
            );
          }
        } else {
          const p = spec.startsWith("@")
            ? spec.split("/").slice(0, 2).join("/")
            : spec.split("/")[0];
          resolutionStats.unresolvedBare[p] =
            (resolutionStats.unresolvedBare[p] ?? 0) + 1;
        }
      }
      return r;
    });

  const program = ts.createProgram({
    host,
    options,
    rootNames: [...universe.code],
  });
  const checker = program.getTypeChecker();

  // exports of measured files
  const exportsByFile = new Map();
  const exportNames = new Set();
  // Symbols are keyed by their declaration in a measured file, so an interface merged with module
  // augmentations elsewhere (hono's ContextVariableMap) is still the same export.
  const symbolKey = (sym) => {
    const decls = sym?.declarations ?? [];
    const d =
      decls.find((x) => measured.has(x.getSourceFile().fileName)) ?? decls[0];
    return d ? `${d.getSourceFile().fileName}:${d.pos}` : sym;
  };
  for (const file of measured) {
    if (!/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(file)) {
      continue;
    }
    const sf = program.getSourceFile(file);
    if (!sf) {
      continue;
    }
    const modSym = checker.getSymbolAtLocation(sf);
    if (!modSym) {
      exportsByFile.set(file, []);
      continue;
    }
    const list = [];
    for (const exp of checker.getExportsOfModule(modSym)) {
      let target = exp;
      if (exp.flags & ts.SymbolFlags.Alias) {
        try {
          target = checker.getAliasedSymbol(exp);
        } catch {
          continue;
        }
      }
      const decl = target.declarations?.[0];
      if (!decl || decl.getSourceFile() !== sf) {
        continue; // a re-export: wiring, not a declaration of this file
      }
      const isType =
        !(target.flags & ts.SymbolFlags.Value) &&
        Boolean(
          target.flags &
          (ts.SymbolFlags.Type |
            ts.SymbolFlags.Interface |
            ts.SymbolFlags.TypeAlias)
        );
      list.push({
        declLine: sf.getLineAndCharacterOfPosition(decl.getStart()).line + 1,
        exportName: exp.name,
        isType,
        localName: target.name,
        symbol: target,
      });
      exportNames.add(exp.name);
      exportNames.add(target.name);
    }
    exportsByFile.set(file, list);
  }
  const symToExport = new Map();
  for (const [file, list] of exportsByFile) {
    for (const e of list) {
      symToExport.set(symbolKey(e.symbol), { ...e, file, uses: new Set() });
    }
  }

  // Local names bound by imports (`import x from`, `import { a as b }`, `import * as ns`) are what
  // the use sites spell, so they join the names to resolve.
  for (const sf of program.getSourceFiles()) {
    if (!universe.code.has(sf.fileName) && !measured.has(sf.fileName)) {
      continue;
    }
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && st.importClause) {
        const c = st.importClause;
        if (c.name) {
          exportNames.add(c.name.text);
        }
        if (c.namedBindings) {
          if (ts.isNamespaceImport(c.namedBindings)) {
            exportNames.add(c.namedBindings.name.text);
          } else {
            for (const el of c.namedBindings.elements) {
              exportNames.add(el.name.text);
            }
          }
        }
      }
    }
  }

  // references
  const dynamicTargets = new Set();
  const strings = new Set();
  const inWiring = (node) => {
    let n = node.parent;
    while (n) {
      if (
        ts.isImportDeclaration(n) ||
        ts.isExportDeclaration(n) ||
        ts.isImportEqualsDeclaration(n) ||
        ts.isExportAssignment(n)
      ) {
        return !ts.isExportAssignment(n);
      }
      if (ts.isSourceFile(n) || ts.isBlock(n)) {
        return false;
      }
      n = n.parent;
    }
    return false;
  };
  const resolveSym = (s) => {
    let cur = s;
    for (let i = 0; i < 10 && cur && cur.flags & ts.SymbolFlags.Alias; i++) {
      try {
        cur = checker.getAliasedSymbol(cur);
      } catch {
        return null;
      }
    }
    return cur;
  };
  for (const sf of program.getSourceFiles()) {
    const file = sf.fileName;
    if (!universe.code.has(file) && !measured.has(file)) {
      continue;
    }
    const visit = (node) => {
      if (ts.isStringLiteralLike(node)) {
        strings.add(node.text);
      }
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        const sym = checker.getSymbolAtLocation(node.arguments[0]);
        const target =
          sym?.valueDeclaration?.getSourceFile?.()?.fileName ??
          sym?.declarations?.[0]?.getSourceFile?.()?.fileName;
        if (target) {
          dynamicTargets.add(target);
          addEdge(file, target);
        }
      }
      // `typeof import("./x")`: the module is loaded at runtime by some other means (astro's
      // dev server loads createAstroServerApp through Vite's module loader).
      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        const target = resolve(dirname(file), node.argument.literal.text);
        const hit = probe(target);
        if (hit) {
          dynamicTargets.add(hit);
        }
      }
      const isDeclarationName =
        ts.isIdentifier(node) &&
        node.parent &&
        "name" in node.parent &&
        node.parent.name === node &&
        ts.isDeclaration(node.parent) &&
        !ts.isShorthandPropertyAssignment(node.parent);
      if (
        ts.isIdentifier(node) &&
        exportNames.has(node.text) &&
        !isDeclarationName
      ) {
        // `{ getBody }`: the shorthand's name resolves to the property; its value is the import.
        const s =
          node.parent &&
          ts.isShorthandPropertyAssignment(node.parent) &&
          node.parent.name === node
            ? checker.getShorthandAssignmentValueSymbol(node.parent)
            : checker.getSymbolAtLocation(node);
        const r = s && resolveSym(s);
        const hit = r && symToExport.get(symbolKey(r));
        if (hit && !inWiring(node)) {
          hit.uses.add(file);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  // .astro/.vue/.svelte/.mdx/.html: regex imports (file edges and named imports by name)
  const otherNamed = [];
  for (const f of universe.other) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(
      /import\s+(?:type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+[\w$]+)?\s*from\s*["']([^"']+)["']/g
    )) {
      const spec = m[3];
      let target = null;
      if (spec.startsWith(".")) {
        target = probe(resolve(dirname(f), spec));
      } else {
        target = fallback(spec);
      }
      if (target) {
        addEdge(f, target);
        const names = (m[2] ?? "")
          .split(",")
          .map((x) =>
            x
              .trim()
              .split(/\s+as\s+/)[0]
              .replace(/^type\s+/, "")
          )
          .filter(Boolean);
        if (m[1]) {
          names.push("default");
        }
        otherNamed.push({ from: f, names, target });
      }
    }
    for (const m of text.matchAll(/["'`]([^"'`\n]{3,200})["'`]/g)) {
      strings.add(m[1]);
    }
  }
  for (const { from, names, target } of otherNamed) {
    for (const e of exportsByFile.get(target) ?? []) {
      if (names.includes(e.exportName)) {
        symToExport.get(symbolKey(e.symbol)).uses.add(from);
      }
    }
  }

  // entry points
  const ownPackages = packages.filter((p) =>
    [...measured].some((f) => f.startsWith(p.root + sep))
  );
  const entries = new Set();
  const wildcardEntries = new Set();
  const unmappedEntries = [];
  for (const pkg of ownPackages) {
    const { files, unmapped, wildcard } = entryFiles(pkg);
    for (const f of files) {
      entries.add(f);
    }
    for (const f of wildcard) {
      wildcardEntries.add(f);
    }
    unmappedEntries.push(...unmapped.map((u) => `${pkg.name} ${u}`));
  }
  for (const extra of ENTRY_EXTRA[name] ?? []) {
    entries.add(join(root, extra));
  }
  const publicSymbols = new Set();
  const wildcardSymbols = new Set();
  const collectPublic = (entryList, target) => {
    for (const entry of entryList) {
      const sf = program.getSourceFile(entry);
      const modSym = sf && checker.getSymbolAtLocation(sf);
      if (!modSym) {
        continue;
      }
      const seenModules = new Set();
      const addModule = (sym) => {
        if (seenModules.has(sym)) {
          return;
        }
        seenModules.add(sym);
        for (const exp of checker.getExportsOfModule(sym)) {
          const r = resolveSym(exp);
          if (!r) {
            continue;
          }
          target.add(symbolKey(r));
          // `export * as ns from "./x"`: everything x exports is public too
          if (
            r.flags & ts.SymbolFlags.ValueModule &&
            r.valueDeclaration &&
            ts.isSourceFile(r.valueDeclaration)
          ) {
            addModule(r);
          }
        }
      };
      addModule(modSym);
    }
  };
  collectPublic(entries, publicSymbols);
  collectPublic(
    [...wildcardEntries].filter((f) => !entries.has(f)),
    wildcardSymbols
  );

  // files loaded by name: the path stem relative to its package appears in a string
  const stringList = [...strings];
  const loadedByName = (file) => {
    const pkg = packages
      .filter((p) => file.startsWith(p.root + sep))
      .sort((a, b) => b.root.length - a.root.length)[0];
    const relPkg = relative(pkg?.root ?? root, file)
      .split(sep)
      .join("/");
    const stem = relPkg.replace(/\.[cm]?[jt]sx?$/, "");
    const stemNoSrc = stem.replace(/^src\//, "");
    if (
      stemNoSrc.split("/").length < 2 &&
      /^(index|main|types|utils|util|constants)$/.test(stemNoSrc)
    ) {
      return null;
    }
    return stringList.find((s) => s.includes(stemNoSrc)) ?? null;
  };

  // classify exports
  const rows = [];
  for (const e of symToExport.values()) {
    const others = [...e.uses].filter((u) => u !== e.file);
    const usedInSource = others.some((u) => measured.has(u));
    const isPublic = publicSymbols.has(symbolKey(e.symbol));
    const isWildcard = !isPublic && wildcardSymbols.has(symbolKey(e.symbol));
    const ownUse = e.uses.has(e.file);
    let category;
    if (usedInSource) {
      category = "used-in-source";
    } else if (isPublic) {
      category = "public-api";
    } else if (others.length > 0) {
      category = "used-elsewhere";
    } else if (
      dynamicTargets.has(e.file) ||
      (![...(edges.get(e.file) ?? [])].some((f) => f !== e.file) &&
        loadedByName(e.file))
    ) {
      category = "dynamic";
    } else if (ownUse || hasLocalUse(e)) {
      category = "own-file-only";
    } else {
      category = "unreferenced";
    }
    rows.push({
      category,
      exportName: e.exportName,
      publicVia: isPublic ? "entry" : isWildcard ? "wildcard-subpath" : null,
      file: relative(root, e.file).split(sep).join("/"),
      isType: e.isType,
      line: e.declLine,
      usedBy: others
        .slice(0, 5)
        .map((u) => relative(root, u).split(sep).join("/")),
    });
  }
  // local uses: the symbol referenced within its own file outside its declaration
  function hasLocalUse(e) {
    const sf = program.getSourceFile(e.file);
    let found = false;
    const decls = new Set(e.symbol.declarations ?? []);
    const visit = (node) => {
      if (found) {
        return;
      }
      if (
        ts.isIdentifier(node) &&
        node.text === e.localName &&
        !decls.has(node.parent)
      ) {
        const s = checker.getSymbolAtLocation(node);
        if (
          s &&
          resolveSym(s) === e.symbol &&
          !(node.parent && decls.has(node.parent))
        ) {
          found = true;
          return;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    return found;
  }

  // classify files
  const fileRows = [];
  for (const file of measured) {
    const incoming = [...(edges.get(file) ?? [])].filter((f) => f !== file);
    let category;
    if (entries.has(file)) {
      category = "entry";
    } else if (incoming.some((f) => measured.has(f))) {
      category = "imported-by-source";
    } else if (wildcardEntries.has(file) && incoming.length === 0) {
      category = "wildcard-subpath-only";
    } else if (incoming.some((f) => measured.has(f))) {
      category = "imported-by-source";
    } else if (incoming.length > 0) {
      category = "imported-elsewhere";
    } else if (loadedByName(file)) {
      category = "loaded-by-name";
    } else {
      category = "unreferenced";
    }
    fileRows.push({
      category,
      file: relative(root, file).split(sep).join("/"),
      importedBy: incoming
        .slice(0, 5)
        .map((u) => relative(root, u).split(sep).join("/")),
      loadedBy: category === "loaded-by-name" ? loadedByName(file) : undefined,
    });
  }

  // whole-word grep for unreferenced export names and unreferenced files across the clone
  const textFiles = [];
  const collectText = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isSymbolicLink() || SKIP_DIRS.has(e.name)) {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        collectText(abs);
      } else if (
        /\.(?:[cm]?[jt]sx?|astro|vue|svelte|mdx?|html|json|ya?ml)$/.test(
          e.name
        ) &&
        statSync(abs).size < 2_000_000
      ) {
        textFiles.push(abs);
      }
    }
  };
  collectText(root);
  const texts = new Map(textFiles.map((f) => [f, readFileSync(f, "utf8")]));
  for (const r of rows.filter((x) => x.category === "unreferenced")) {
    const re = new RegExp(`\\b${lib.escapeRegExp(r.exportName)}\\b`);
    const abs = join(root, r.file);
    r.textualReferences = [...texts]
      .filter(([f, t]) => f !== abs && re.test(t))
      .map(([f]) => relative(root, f).split(sep).join("/"))
      .slice(0, 5);
  }
  for (const r of fileRows.filter((x) => x.category === "unreferenced")) {
    const stem = r.file
      .split("/")
      .pop()
      .replace(/\.[cm]?[jt]sx?$/, "");
    const re = new RegExp(
      `["'/]${lib.escapeRegExp(stem)}(?:\\.[cm]?[jt]sx?)?["']`
    );
    const abs = join(root, r.file);
    r.textualReferences = [...texts]
      .filter(([f, t]) => f !== abs && re.test(t))
      .map(([f]) => relative(root, f).split(sep).join("/"))
      .slice(0, 5);
  }

  const count = (list, key) =>
    list.reduce((acc, x) => {
      acc[x[key]] = (acc[x[key]] ?? 0) + 1;
      return acc;
    }, {});
  const totalSpecs =
    resolutionStats.resolved +
    resolutionStats.fallback +
    resolutionStats.unresolved;
  return {
    detail: { files: fileRows, exports: rows },
    summary: {
      entries: [...entries]
        .map((f) => relative(root, f).split(sep).join("/"))
        .sort(),
      wildcardEntries: wildcardEntries.size,
      exports: {
        byCategory: count(rows, "category"),
        byCategoryTypes: count(
          rows.filter((r) => r.isType),
          "category"
        ),
        byCategoryValues: count(
          rows.filter((r) => !r.isType),
          "category"
        ),
        total: rows.length,
        unreferencedWithNoTextualReference: rows.filter(
          (r) =>
            r.category === "unreferenced" && r.textualReferences.length === 0
        ).length,
        wildcardOnly: count(
          rows.filter((r) => r.publicVia === "wildcard-subpath"),
          "category"
        ),
      },
      files: {
        byCategory: count(fileRows, "category"),
        total: fileRows.length,
        unreferencedWithNoTextualReference: fileRows.filter(
          (r) =>
            r.category === "unreferenced" && r.textualReferences.length === 0
        ).length,
      },
      resolution: {
        ...resolutionStats,
        resolvedShare: lib.pct(
          resolutionStats.resolved + resolutionStats.fallback,
          totalSpecs
        ),
        relativeResolvedShare: null,
        unresolvedBare: Object.fromEntries(
          Object.entries(resolutionStats.unresolvedBare)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
        ),
      },
      unmappedEntries,
      universe: { code: universe.code.size, other: universe.other.length },
    },
  };
};

const main = () => {
  mkdirSync(OUT, { recursive: true });
  const path = join(lib.RESULTS_DIR, "exports.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { repos: {} };
  const only = (lib.arg("repos", "") || "").split(",").filter(Boolean);
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    notMeasurable: NOT_MEASURABLE,
    note: "See the header of dead-code-exports.cjs for the method. 'unreferenced' means no reference TypeScript could resolve; textualReferences lists files that mention the name anyway.",
    repos: { ...previous.repos },
    setup: SETUP,
    tools: { typescript: ts.version },
  };
  for (const name of Object.keys(SETUP).filter(
    (n) => only.length === 0 || only.includes(n)
  )) {
    const started = Date.now();
    const { detail, summary } = analyse(name);
    summary.seconds = Math.round((Date.now() - started) / 1000);
    result.repos[name] = summary;
    writeFileSync(join(OUT, `${name}.json`), JSON.stringify(detail, null, 1));
    console.log(
      `${name}: exports ${JSON.stringify(summary.exports.byCategory)} files ${JSON.stringify(summary.files.byCategory)} resolution ${summary.resolution.resolvedShare}% (rel unresolved ${summary.resolution.unresolvedRelative}) entries ${summary.entries.length} unmapped ${summary.unmappedEntries.length} (${summary.seconds}s)`
    );
  }
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
};

main();
void extname;
