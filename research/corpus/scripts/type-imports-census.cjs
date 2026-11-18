// How real code imports types: every import and export declaration in every file of every repo
// (source and tests apart), each imported binding's use, what it is at its source, where each
// specifier resolves, and whether a module imported only for types has top-level side effects;
// plus each repo's tsconfig settings and how its build compiles TypeScript.
//
// Per file (type-imports-lib.cjs `inventory`, one ESLint Linter pass with typescript-eslint's
// parser and scope analysis):
//   imports        form (value, `import type`, inline, mixed, side-effect), clause (named,
//                  default, namespace, default+named), each binding's references classified as
//                  consistent-type-imports classifies them, JSX uses, decorator-metadata positions
//   import-equals  `import x = require()` and `import x = A.B`, with their use
//   exports        `export … from` (and its kind), `export *`, `export * as`, `export type *`,
//                  local `export { x }` lists (and what each name is), exported type declarations
//   types          `import('x')` types, with and without `typeof`
//   other          dynamic `import()`, `require()`, decorators, enums, namespaces, classes
// Per repo (one TypeScript program over source and tests, import-cycles-lib.cjs's resolution):
//   every import specifier's target (a file in the clone, a workspace package, a package outside
//   the clone, a Node built-in, unresolved), every binding's symbol at its source (value, type,
//   both, a namespace module, unresolved; class, enum, const enum, function, variable, interface,
//   type alias), and every local target's top-level side effects (sideEffectsOf). For a module
//   imported only for types (no binding of it is used as a value, no side-effect import of it):
//   that target's side effects, or the package's `sideEffects` when the package is in the clone.
// Per file, the nearest tsconfig.json and its `extends` chain (FLAGS); per repo, its build tool.
//
// Usage (from the repo root):
//   node --max-old-space-size=16384 research/corpus/scripts/type-imports-census.cjs [--repos zod]
// Writes results/type-imports/census.json and out/type-imports/census/<repo>.jsonl.
"use strict";

const { readFileSync } = require("node:fs");
const { join, relative, sep } = require("node:path");

const lib = require("./type-imports-lib.cjs");

const { ts } = lib;
const rel = (root, f) => relative(root, f).split(sep).join("/");

// How each repo's own build compiles its TypeScript, read from the files named (at the pinned
// commit; type-imports-markers.cjs checks each `evidence` string is in its file).
const BUILD = {
  astro: {
    evidence: "astro-scripts build",
    file: "packages/astro/package.json",
    perFile: true,
    tool: "esbuild (astro-scripts build), then tsc -b for declarations",
  },
  excalidraw: {
    evidence: "node ../../scripts/buildPackage.js",
    file: "packages/excalidraw/package.json",
    perFile: true,
    tool: "esbuild (scripts/buildPackage.js); the app with Vite",
  },
  hono: {
    evidence: "vp pack",
    file: "package.json",
    perFile: true,
    tool: "vp pack (Vite+, rolldown with Oxc)",
  },
  "next.js": {
    evidence: "taskr release",
    file: "packages/next/package.json",
    perFile: true,
    tool: "taskr with SWC",
  },
  radix: {
    evidence: '"build": "radix-build"',
    file: "packages/react/primitive/package.json",
    perFile: null,
    tool: "radix-build (internal/builder, outside the sparse clone)",
  },
  "react-aria": {
    evidence: "parcel build",
    file: "package.json",
    perFile: true,
    tool: "Parcel (SWC)",
  },
  shadcn: {
    evidence: "next build",
    file: "apps/v4/package.json",
    perFile: true,
    tool: "Next.js (SWC)",
  },
  supabase: {
    evidence: "next build",
    file: "apps/studio/package.json",
    perFile: true,
    tool: "Next.js (SWC); a Vite build too",
  },
  trpc: {
    evidence: '"build": "tsdown"',
    file: "packages/server/package.json",
    perFile: true,
    tool: "tsdown (rolldown with Oxc)",
  },
  ultracite: {
    evidence: "Bun.build",
    file: "packages/cli/build.ts",
    perFile: true,
    tool: "Bun.build",
  },
  vite: {
    evidence: "rolldown --config rolldown.config.ts",
    file: "packages/vite/package.json",
    perFile: true,
    tool: "rolldown (Oxc)",
  },
  vscode: {
    evidence: "npm run gulp compile",
    file: "package.json",
    perFile: false,
    tool: "gulp compile (the TypeScript compiler over the program); an esbuild transpile for watch",
  },
  zod: {
    evidence: "zshy --project tsconfig.build.json",
    file: "packages/zod/package.json",
    perFile: false,
    tool: "zshy (the TypeScript compiler API)",
  },
};

// Every import declaration of a file in the program, by start line: specifier, target, and each
// binding's symbol facts.
const tsImports = (sf, checker, resolveSpec, root) => {
  const out = new Map();
  for (const st of sf.statements) {
    if (
      !ts.isImportDeclaration(st) ||
      !ts.isStringLiteral(st.moduleSpecifier)
    ) {
      continue;
    }
    const line = sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1;
    const spec = st.moduleSpecifier.text;
    const r = resolveSpec(spec, sf.fileName);
    const names = [];
    const c = st.importClause;
    if (c?.name) {
      names.push(c.name);
    }
    if (c?.namedBindings) {
      if (ts.isNamespaceImport(c.namedBindings)) {
        names.push(c.namedBindings.name);
      } else {
        names.push(...c.namedBindings.elements.map((e) => e.name));
      }
    }
    const bindings = {};
    for (const n of names) {
      const f = lib.symbolFacts(checker, n);
      bindings[n.text] = {
        ambient: f.ambient ?? null,
        constEnum: f.constEnum ?? false,
        decl: f.decl,
        declFile:
          f.declFile && f.declFile.startsWith(root + sep)
            ? rel(root, f.declFile)
            : f.declFile
              ? "(outside the clone)"
              : null,
        is: f.is,
      };
    }
    out.set(`${line}`, {
      bindings,
      how: r.how,
      target:
        r.file && r.file.startsWith(root + sep) ? rel(root, r.file) : null,
    });
  }
  return out;
};

const emptyCounts = () => ({
  bindings: {
    byMarker: {},
    byUsage: {},
    reportable: 0,
    reportableBySource: {},
    total: 0,
    typeOnlyBySource: {},
  },
  decorators: { files: 0, metadataRefs: 0, metadataRefsWithFlag: 0, total: 0 },
  dynamicImports: 0,
  exports: {
    exportedTypeDeclarations: 0,
    localListTypeNamesWithoutType: 0,
    localListsWithTypeNames: 0,
    namedFrom: 0,
    namedFromType: 0,
    namedFromInlineType: 0,
    star: 0,
    starAs: 0,
    starType: 0,
    typeListLocal: 0,
  },
  files: 0,
  importEquals: { alias: 0, require: 0, requireType: 0, requireTypeOnlyUse: 0 },
  importTypes: { qualified: 0, total: 0, typeof: 0 },
  imports: { byClause: {}, byForm: {}, total: 0, withAttributes: 0 },
  lines: 0,
  requires: 0,
  typeOnlyModules: {
    byTarget: {},
    examples: [],
    total: 0,
  },
});
const bump = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};
const clauseOf = (imp) => {
  const kinds = imp.specifiers.map((s) => s.kind);
  if (kinds.length === 0) {
    return "none";
  }
  const has = (k) => kinds.includes(k);
  if (has("default") && has("namespace")) {
    return "default+namespace";
  }
  if (has("default") && has("named")) {
    return "default+named";
  }
  if (has("namespace")) {
    return "namespace";
  }
  if (has("default")) {
    return "default";
  }
  return "named";
};

const main = () => {
  const names = lib.selectedRepos(lib.ALL);
  lib.checkPinned(names);
  const out = {
    build: BUILD,
    generated: new Date().toISOString(),
    repos: {},
    tools: lib.toolVersions(),
  };
  for (const name of names) {
    const t0 = Date.now();
    const repo = lib.getRepo(name);
    const root = repo.root.replace(/\/$/, "");
    const files = lib.filesOf(name);
    const packages = lib.ic.findPackages(root);
    // tsconfig per file
    const tsconfigs = new Map();
    const configOf = (relFile) => {
      const f = lib.nearestTsconfig(root, relFile);
      if (!f) {
        return null;
      }
      if (!tsconfigs.has(f)) {
        const chain = lib.tsconfigChain(f, root, packages);
        tsconfigs.set(f, {
          chain,
          effective: lib.effectiveFlags(chain),
          file: rel(root, f),
          files: { source: 0, tests: 0 },
          missingBase: chain.filter((c) => c.missing).map((c) => c.missing),
        });
      }
      return tsconfigs.get(f);
    };
    // the TypeScript program
    const tsRels = files.map((f) => f.rel);
    const {
      program,
      resolveSpec,
      packages: pkgs,
    } = lib.repoProgram(name, tsRels);
    const checker = program.getTypeChecker();
    const sideEffectCache = new Map();
    const sideEffectsOfRel = (targetRel) => {
      if (!sideEffectCache.has(targetRel)) {
        const sf = program.getSourceFile(join(root, targetRel));
        sideEffectCache.set(targetRel, sf ? lib.sideEffectsOf(sf) : null);
      }
      return sideEffectCache.get(targetRel);
    };
    const rows = [];
    const counts = { source: emptyCounts(), tests: emptyCounts() };
    let parseErrors = 0;
    let joinMisses = 0;
    for (const { rel: relFile, test } of files) {
      const text = readFileSync(join(root, relFile), "utf8");
      const inv = lib.inventory(text, relFile);
      const cfg = configOf(relFile);
      if (cfg) {
        cfg.files[test ? "tests" : "source"] += 1;
      }
      if (inv.error) {
        parseErrors += 1;
        rows.push({ error: inv.error, rel: relFile, test });
        continue;
      }
      const sf = program.getSourceFile(join(root, relFile));
      const facts = sf ? tsImports(sf, checker, resolveSpec, root) : new Map();
      const c = counts[test ? "tests" : "source"];
      c.files += 1;
      c.lines += inv.lines;
      const flags = cfg?.effective ?? {};
      const decoratorMeta = Boolean(
        flags.emitDecoratorMetadata && flags.experimentalDecorators
      );
      // imports
      const bySpecifier = new Map();
      for (const imp of inv.imports) {
        const f = facts.get(`${imp.line}`);
        if (!f && sf) {
          joinMisses += 1;
        }
        imp.target = f?.target ?? null;
        imp.how = f?.how ?? null;
        if (!imp.target) {
          imp.package = lib.packageSideEffects(pkgs, imp.source);
        }
        c.imports.total += 1;
        bump(c.imports.byForm, imp.form);
        bump(c.imports.byClause, clauseOf(imp));
        if (imp.attributes) {
          c.imports.withAttributes += 1;
        }
        for (const s of imp.specifiers) {
          s.source = f?.bindings?.[s.local] ?? null;
          c.bindings.total += 1;
          bump(c.bindings.byUsage, s.usage);
          const marker =
            imp.importKind === "type"
              ? "import type"
              : s.inlineType
                ? "inline type"
                : "none";
          bump(c.bindings.byMarker, marker);
          // what consistent-type-imports reports: a binding with no marker used only as a type
          if (marker === "none" && s.usage === "type") {
            c.bindings.reportable += 1;
            bump(c.bindings.reportableBySource, s.source?.is ?? "unresolved");
          }
          if (s.usage === "type" || marker !== "none") {
            bump(c.bindings.typeOnlyBySource, s.source?.is ?? "unresolved");
          }
          if (s.metadata.length) {
            c.decorators.metadataRefs += s.metadata.length;
            if (decoratorMeta) {
              c.decorators.metadataRefsWithFlag += s.metadata.length;
            }
          }
        }
        const key = imp.source;
        if (!bySpecifier.has(key)) {
          bySpecifier.set(key, []);
        }
        bySpecifier.get(key).push(imp);
      }
      // modules imported only for types (after a full conversion nothing of them remains)
      const typeOnlyModules = [];
      for (const [spec, imps] of bySpecifier) {
        const runtimeUse = imps.some(
          (imp) =>
            imp.form === "side-effect" ||
            imp.specifiers.some(
              (s) =>
                imp.importKind !== "type" &&
                !s.inlineType &&
                !["type", "unused"].includes(s.usage)
            )
        );
        const anyTypeUse = imps.some((imp) =>
          imp.specifiers.some(
            (s) =>
              s.usage === "type" || imp.importKind === "type" || s.inlineType
          )
        );
        if (runtimeUse || !anyTypeUse) {
          continue;
        }
        const target = imps[0].target;
        let effects;
        if (target) {
          const se = sideEffectsOfRel(target);
          effects = se ? `local: ${se.label}` : "local: not in the program";
        } else if (lib.BUILTINS.has(spec)) {
          effects = "builtin";
        } else if (imps[0].package?.how === "workspace") {
          const v = imps[0].package.sideEffects;
          effects = `workspace package: sideEffects ${JSON.stringify(v)}`;
        } else if (spec.startsWith(".")) {
          effects = "local: unresolved";
        } else {
          effects = "package outside the clone: unknown";
        }
        const marked = imps.every((imp) =>
          imp.specifiers.every(
            (s) =>
              imp.importKind === "type" || s.inlineType || s.usage === "unused"
          )
        );
        typeOnlyModules.push({
          effects,
          marked,
          spec,
          target,
          withSideEffects:
            /local: (statements|declarations-run-code|side-effect-imports)/.test(
              effects
            ),
        });
        c.typeOnlyModules.total += 1;
        bump(
          c.typeOnlyModules.byTarget,
          `${effects}${marked ? " (already marked)" : " (unmarked)"}`
        );
        if (
          !marked &&
          /local: (statements|declarations-run-code)/.test(effects) &&
          c.typeOnlyModules.examples.length < 25
        ) {
          c.typeOnlyModules.examples.push({
            effects: sideEffectsOfRel(target),
            file: relFile,
            line: imps[0].line,
            permalink: lib.permalink(name, relFile, imps[0].line),
            spec,
            target,
          });
        }
      }
      // import-equals
      for (const ie of inv.importEquals) {
        bump(c.importEquals, ie.kind);
        if (ie.kind === "require" && ie.importKind === "type") {
          c.importEquals.requireType += 1;
        }
        if (ie.kind === "require" && ie.usage === "type") {
          c.importEquals.requireTypeOnlyUse += 1;
        }
      }
      // exports
      for (const ex of inv.exports) {
        if (ex.kind === "star") {
          c.exports.star += 1;
          if (ex.exportKind === "type") {
            c.exports.starType += 1;
          }
        } else if (ex.kind === "star-as") {
          c.exports.starAs += 1;
        } else if (ex.kind === "named-from") {
          c.exports.namedFrom += 1;
          if (ex.exportKind === "type") {
            c.exports.namedFromType += 1;
          } else if (ex.specifiers.some((s) => s.exportKind === "type")) {
            c.exports.namedFromInlineType += 1;
          }
        } else if (ex.kind === "named-local") {
          if (ex.exportKind === "type") {
            c.exports.typeListLocal += 1;
          }
          const typeNames = ex.specifiers.filter(
            (s) =>
              s.binding &&
              (s.binding.kind === "type" ||
                (s.binding.kind === "import" && s.binding.typeOnly))
          );
          if (typeNames.length) {
            c.exports.localListsWithTypeNames += 1;
            c.exports.localListTypeNamesWithoutType += typeNames.filter(
              (s) => ex.exportKind !== "type" && s.exportKind !== "type"
            ).length;
          }
        }
      }
      c.exports.exportedTypeDeclarations += inv.declarations.exportedType;
      c.importTypes.total += inv.importTypes.length;
      c.importTypes.typeof += inv.importTypes.filter((x) => x.typeof).length;
      c.importTypes.qualified += inv.importTypes.filter(
        (x) => x.qualifier
      ).length;
      c.dynamicImports += inv.dynamicImports.length;
      c.requires += inv.requires.length;
      c.decorators.total += inv.decorators.length;
      if (inv.decorators.length) {
        c.decorators.files += 1;
      }
      rows.push({
        declarations: inv.declarations,
        decorators: inv.decorators.length,
        dynamicImports: inv.dynamicImports,
        eslint: inv.eslint,
        exports: inv.exports,
        flags,
        importEquals: inv.importEquals,
        importTypes: inv.importTypes,
        imports: inv.imports,
        lines: inv.lines,
        rel: relFile,
        test,
        tsconfig: cfg?.file ?? null,
        typeOnlyModules,
      });
    }
    lib.writeJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`), rows);
    const sideEffectSummary = {};
    for (const [, se] of sideEffectCache) {
      bump(sideEffectSummary, se?.label ?? "not in the program");
    }
    out.repos[name] = {
      build: BUILD[name] ?? null,
      counts,
      joinMisses,
      parseErrors,
      set: lib.setOf(name),
      sha: lib.shaOf(name),
      targetsSideEffects: sideEffectSummary,
      tsconfigs: [...tsconfigs.values()],
    };
    console.log(
      `${name}: ${files.length} files, ${counts.source.imports.total} source imports, ${counts.source.bindings.reportable} reportable bindings, ${joinMisses} join misses, ${parseErrors} parse errors (${Math.round((Date.now() - t0) / 1000)} s)`
    );
  }
  lib.writeJson(join(lib.RESULTS_DIR, "census.json"), lib.scrubDeep(out));
};

main();
