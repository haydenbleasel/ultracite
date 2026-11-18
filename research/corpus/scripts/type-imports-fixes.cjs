// What the type-import fixes do to real code, on copies of every repo.
//
// Each linter's fix path, the way `ultracite fix` runs it, with the topic's rules as Ultracite
// sets them (so no other rule's fix changes the files):
//   oxlint   consistent-type-imports, no-import-type-side-effects, consistent-type-specifier-style
//            ("prefer-top-level"), import/no-duplicates and no-duplicate-imports
//            ({ allowSeparateTypeImports: true }) with `oxlint --fix`, then Oxfmt
//   eslint   the same rules in typescript-eslint, import-x and ESLint (verifyAndFix: up to ten
//            passes, as `eslint --fix`), then Prettier
//   biome    useImportType and useExportType with organizeImports on (as Biome core), `biome check
//            --write` with the formatter
// The baseline is the same copy run through the path's formatter alone, so the line counts are the
// fix's.
//
// For every file a fix changes:
//   lines        added and removed against the baseline (`git diff --no-index --numstat`, on the
//                copies)
//   imports      each declaration before and after (specifier, `import type`/inline/none, names),
//                classified: converted to `import type`, split into a value and a type declaration,
//                inline `type` added, merged, removed
//   reports      the path's rules on the fixed copy: what's left, what's new (a split that writes a
//                second `import type` of a module no-duplicates then reports), and whether a second
//                fix pass changes the file again
//   emitted      the original and the fixed file compiled each way in COMPILE (the TypeScript
//                program with the repo's settings, ts.transpileModule with the repo's flags and
//                with verbatimModuleSyntax, esbuild, Oxc, Node's type stripping, Bun): the module
//                specifiers each output loads, and side-effect imports that disappear or appear
//   cycles       runtime import cycles (strongly connected components of the files each output
//                loads, resolved with the census's program) before and after, per compiler
//   metadata     every decorated class's `design:*` metadata, compiled with emitDecoratorMetadata
//                (the repo's own setting, or hypothetically on), before and after
//   typecheck    TypeScript's diagnostics on the changed files before and after (the census's
//                program with the fixed files swapped in), with each repo's share of resolved imports
//
// Usage: TYPE_IMPORTS_TMP=<scratch> node --max-old-space-size=16384 research/corpus/scripts/type-imports-fixes.cjs [--repos zod] [--paths oxlint,eslint,biome] [--settle]
// Writes results/type-imports/fixes.json and out/type-imports/fixes/<repo>.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join, relative, resolve, sep } = require("node:path");

const lib = require("./type-imports-lib.cjs");

const { ts } = lib;
const WORK = join(lib.TMP, "fixes");

const OX_RULES = {
  "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
  "import/no-duplicates": "error",
  "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
  "typescript/consistent-type-imports": "error",
  "typescript/no-import-type-side-effects": "error",
};
const ES_RULES = {
  "@typescript-eslint/consistent-type-imports": "error",
  "@typescript-eslint/no-import-type-side-effects": "error",
  "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
  "import-x/no-duplicates": "error",
  "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
};
const BIOME_RULES = {
  assist: { actions: { source: { organizeImports: "on" } }, enabled: true },
  linter: {
    enabled: true,
    rules: {
      recommended: false,
      style: { useExportType: "error", useImportType: "error" },
    },
  },
};

const COMPILE = [
  ["transpileModule", "repo flags"],
  ["transpileModule", "verbatimModuleSyntax"],
  ["esbuild", "default"],
  ["esbuild", "verbatimModuleSyntax"],
  ["oxc", "default"],
  ["oxc", "onlyRemoveTypeImports"],
  ["node-strip", "strip"],
];
const flagsFor = (mode, repoFlags) =>
  mode === "repo flags"
    ? {
        experimentalDecorators: Boolean(repoFlags.experimentalDecorators),
        isolatedModules: Boolean(repoFlags.isolatedModules),
        emitDecoratorMetadata: Boolean(repoFlags.emitDecoratorMetadata),
        verbatimModuleSyntax: Boolean(repoFlags.verbatimModuleSyntax),
      }
    : /verbatim|onlyRemove/.test(mode)
      ? {
          experimentalDecorators: Boolean(repoFlags.experimentalDecorators),
          verbatimModuleSyntax: true,
        }
      : { experimentalDecorators: Boolean(repoFlags.experimentalDecorators) };

// Every import declaration of a file: { specifier, kind: type|inline|mixed|none|side-effect, names }.
const importDecls = (text, rel) => {
  const sf = ts.createSourceFile(
    rel,
    text,
    ts.ScriptTarget.ESNext,
    true,
    /x$/.test(rel) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const out = [];
  for (const st of sf.statements) {
    if (
      !ts.isImportDeclaration(st) ||
      !ts.isStringLiteral(st.moduleSpecifier)
    ) {
      continue;
    }
    const c = st.importClause;
    if (!c) {
      out.push({
        kind: "side-effect",
        names: [],
        specifier: st.moduleSpecifier.text,
      });
      continue;
    }
    const names = [];
    let inline = 0;
    let value = 0;
    if (c.name) {
      names.push(`default:${c.name.text}`);
      value += 1;
    }
    if (c.namedBindings) {
      if (ts.isNamespaceImport(c.namedBindings)) {
        names.push(`*:${c.namedBindings.name.text}`);
        value += 1;
      } else {
        for (const e of c.namedBindings.elements) {
          names.push(
            `${e.isTypeOnly ? "type " : ""}${(e.propertyName ?? e.name).text}`
          );
          if (e.isTypeOnly) {
            inline += 1;
          } else {
            value += 1;
          }
        }
      }
    }
    out.push({
      kind: c.isTypeOnly
        ? "type"
        : inline && !value
          ? "inline"
          : inline
            ? "mixed"
            : names.length
              ? "none"
              : "empty",
      names,
      specifier: st.moduleSpecifier.text,
    });
  }
  return out;
};
// How a file's imports changed, per module specifier.
const classifyChange = (before, after) => {
  const kinds = {};
  const specs = new Set([...before, ...after].map((d) => d.specifier));
  for (const s of specs) {
    const b = before.filter((d) => d.specifier === s);
    const a = after.filter((d) => d.specifier === s);
    const sig = (ds) =>
      ds
        .map((d) => `${d.kind}[${d.names.slice().sort().join(",")}]`)
        .sort()
        .join(" ");
    if (sig(b) === sig(a)) {
      continue;
    }
    let k;
    if (a.length === 0) {
      k = "removed";
    } else if (b.length === 0) {
      k = "added";
    } else if (a.length > b.length) {
      k =
        a.some((d) => d.kind === "type") &&
        a.some((d) => d.kind === "none" || d.kind === "mixed")
          ? "split into value + type"
          : "split";
    } else if (a.length < b.length) {
      k = "merged";
    } else if (
      a.every((d) => d.kind === "type") &&
      b.some((d) => d.kind !== "type")
    ) {
      k = b.some((d) => d.kind === "inline")
        ? "inline -> import type"
        : "converted to import type";
    } else if (
      a.some((d) => d.kind === "mixed" || d.kind === "inline") &&
      b.every((d) => d.kind !== "mixed" && d.kind !== "inline")
    ) {
      k = "inline type added";
    } else if (
      a.some((d) => d.kind === "type") &&
      !b.some((d) => d.kind === "type")
    ) {
      k = "converted to import type";
    } else {
      k = "reordered or renamed specifiers";
    }
    kinds[k] = (kinds[k] ?? 0) + 1;
  }
  return kinds;
};
// Two or more declarations of the same kind from one module (what no-duplicates reports).
const duplicateGroups = (decls) => {
  const m = new Map();
  for (const d of decls) {
    if (d.kind === "side-effect") {
      continue;
    }
    const k = `${d.specifier}|${d.kind === "type" ? "type" : "value"}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.values()].filter((n) => n > 1).length;
};

const numstat = (a, b) => {
  const r = lib.spawnSync(
    "git",
    ["diff", "--no-index", "--numstat", "--no-renames", a, b],
    {
      encoding: "utf8",
      maxBuffer: 1 << 30,
    }
  );
  const out = new Map();
  for (const line of r.stdout.split("\n")) {
    const m = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(line);
    if (!m) {
      continue;
    }
    // git prints "<common>/{baseline => fixed}/<rel>"
    const rel = /\}\/(.*)$/.exec(m[3])?.[1];
    if (!rel) {
      continue;
    }
    out.set(rel, {
      added: Number(m[1]) || 0,
      removed: Number(m[2]) || 0,
    });
  }
  return out;
};
// simple line diff when numstat paths don't map
const lineDiff = (a, b) => {
  const A = a.split("\n");
  const B = b.split("\n");
  const count = new Map();
  for (const l of A) {
    count.set(l, (count.get(l) ?? 0) + 1);
  }
  let common = 0;
  for (const l of B) {
    const c = count.get(l) ?? 0;
    if (c > 0) {
      common += 1;
      count.set(l, c - 1);
    }
  }
  return { added: B.length - common, removed: A.length - common };
};

// The design:* metadata in compiled output, with TypeScript's temporaries (_a, _b, …) renamed so
// a shifted temporary isn't a difference.
const metadataOfJs = (js) =>
  js == null
    ? []
    : [
        ...js.matchAll(
          /__metadata\("design:(paramtypes|type|returntype)",\s*([^)]*\)?)\)/g
        ),
      ].map(
        (m) =>
          `${m[1]}: ${m[2]
            .replace(/\b_[a-z]{1,2}\b/g, "_")
            .replace(/\s+/g, " ")
            .slice(0, 200)}`
      );

const sccs = (edges) => {
  const nodes = [
    ...new Set([
      ...edges.keys(),
      ...[...edges.values()].flatMap((s) => [...s]),
    ]),
  ].sort();
  return lib.ic
    .scc(nodes, (v) => [...(edges.get(v) ?? [])].filter((w) => w !== v).sort())
    .filter((c) => c.length > 1);
};

const fixPath = async (path, dir, rels) => {
  if (path === "oxlint") {
    const config = lib.writeOxlintRules(lib.CONFIG_DIR, "fix-topic", OX_RULES);
    const CHUNK = 400;
    for (let i = 0; i < rels.length; i += CHUNK) {
      lib.spawnSync(
        process.execPath,
        [
          lib.oxlintBin,
          "-c",
          config,
          "--disable-nested-config",
          "--fix",
          ...rels.slice(i, i + CHUNK),
        ],
        {
          cwd: dir,
          encoding: "utf8",
          maxBuffer: 1 << 30,
        }
      );
    }
    await lib.formatFiles({ cwd: dir, files: rels, tool: "oxfmt" });
  } else if (path === "eslint") {
    for (const rel of rels) {
      const f = join(dir, rel);
      const text = readFileSync(f, "utf8");
      const r = lib.fixText(text, rel, ES_RULES);
      if (r.fixed) {
        writeFileSync(f, r.output);
      }
    }
    const CHUNK = 400;
    for (let i = 0; i < rels.length; i += CHUNK) {
      await lib.formatFiles({
        cwd: dir,
        files: rels.slice(i, i + CHUNK),
        tool: "prettier",
      });
    }
  } else {
    const configDir = join(lib.CONFIG_DIR, "biome-fix-topic");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "biome.json"),
      JSON.stringify(
        {
          files: { ignoreUnknown: true, maxSize: 10_000_000 },
          javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
          root: true,
          vcs: { enabled: false },
          ...BIOME_RULES,
        },
        null,
        2
      )
    );
    const CHUNK = 400;
    for (let i = 0; i < rels.length; i += CHUNK) {
      lib.biomeRun(
        [
          "check",
          "--write",
          "--max-diagnostics=none",
          ...rels.slice(i, i + CHUNK),
        ],
        { configDir, cwd: dir }
      );
    }
  }
};
const formatOnly = async (path, dir, rels) => {
  const CHUNK = 400;
  if (path === "oxlint") {
    await lib.formatFiles({ cwd: dir, files: rels, tool: "oxfmt" });
  } else if (path === "eslint") {
    for (let i = 0; i < rels.length; i += CHUNK) {
      await lib.formatFiles({
        cwd: dir,
        files: rels.slice(i, i + CHUNK),
        tool: "prettier",
      });
    }
  } else {
    const configDir = join(lib.CONFIG_DIR, "biome-format-only");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "biome.json"),
      JSON.stringify(
        {
          assist: { enabled: false },
          files: { ignoreUnknown: true, maxSize: 10_000_000 },
          javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
          linter: { enabled: false },
          root: true,
          vcs: { enabled: false },
        },
        null,
        2
      )
    );
    for (let i = 0; i < rels.length; i += CHUNK) {
      lib.biomeRun(["format", "--write", ...rels.slice(i, i + CHUNK)], {
        configDir,
        cwd: dir,
      });
    }
  }
};
const relint = (path, dir, rels) => {
  if (path === "oxlint") {
    const config = lib.writeOxlintRules(lib.CONFIG_DIR, "fix-topic", OX_RULES);
    return lib
      .runOxlint({ configFile: config, cwd: dir, files: rels })
      .map((d) => ({ file: d.file, line: d.line, rule: d.rule }));
  }
  if (path === "eslint") {
    return rels.flatMap((rel) =>
      lib
        .lintText(readFileSync(join(dir, rel), "utf8"), rel, ES_RULES)
        .map((m) => ({ file: rel, line: m.line, rule: m.rule ?? "parse" }))
    );
  }
  const configDir = join(lib.CONFIG_DIR, "biome-relint-topic");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    join(configDir, "biome.json"),
    JSON.stringify(
      {
        assist: { enabled: false },
        files: { ignoreUnknown: true, maxSize: 10_000_000 },
        formatter: { enabled: false },
        javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
        linter: BIOME_RULES.linter,
        root: true,
        vcs: { enabled: false },
      },
      null,
      2
    )
  );
  return lib
    .runBiome({ configDir, cwd: dir, files: rels })
    .filter((d) => !/^(?:parse|suppressions\/)/.test(d.rule))
    .map((d) => ({ file: d.file, line: d.line, rule: d.rule }));
};

// What a second fix pass changed in a file the first pass didn't settle: its import declarations
// ("imports": the lint fixes undo or redo each other), only whitespace ("formatting": the formatter
// isn't idempotent on that file), or other code.
const settleKind = (first, second, rel) => {
  if (first.replace(/\s+/g, "") === second.replace(/\s+/g, "")) {
    return "formatting";
  }
  return JSON.stringify(importDecls(first, rel)) ===
    JSON.stringify(importDecls(second, rel))
    ? "other code"
    : "imports";
};
const settleKinds = (fixDir, againDir, rels) => {
  const kinds = {};
  for (const rel of rels) {
    const k = settleKind(
      readFileSync(join(fixDir, rel), "utf8"),
      readFileSync(join(againDir, rel), "utf8"),
      rel
    );
    kinds[k] = (kinds[k] ?? 0) + 1;
  }
  return kinds;
};

// --settle: recompute notConvergedKinds from the copies a full run left in $TYPE_IMPORTS_TMP/fixes
// and patch fixes.json, without fixing again.
const settleOnly = () => {
  const outFile = join(lib.RESULTS_DIR, "fixes.json");
  const out = lib.readJson(outFile, null);
  for (const [name, repo] of Object.entries(out.repos)) {
    const detail = lib.readJson(
      join(lib.OUT_DIR, "fixes", `${name}.json`),
      null
    );
    for (const [path, x] of Object.entries(repo.paths ?? {})) {
      const rels = (detail?.paths?.[path]?.files ?? []).map((f) => f.rel);
      const fixDir = join(WORK, name, path, "fixed");
      const againDir = join(WORK, name, path, "again");
      const unsettled = rels.filter(
        (rel) =>
          existsSync(join(againDir, rel)) &&
          readFileSync(join(againDir, rel), "utf8") !==
            readFileSync(join(fixDir, rel), "utf8")
      );
      x.notConvergedKinds = settleKinds(fixDir, againDir, unsettled);
      console.log(
        name,
        path,
        unsettled.length,
        JSON.stringify(x.notConvergedKinds)
      );
    }
  }
  lib.writeJson(outFile, lib.scrubDeep(out));
};

const main = async () => {
  if (lib.flag("settle")) {
    settleOnly();
    return;
  }
  await lib.loadCompilers();
  const names = lib.selectedRepos(lib.ALL);
  const paths = (lib.arg("paths", "") || "oxlint,eslint,biome").split(",");
  lib.checkPinned(names);
  const file = join(lib.RESULTS_DIR, "fixes.json");
  const out =
    existsSync(file) && names.length < lib.ALL.length
      ? lib.readJson(file)
      : { repos: {} };
  out.generated = new Date().toISOString();
  out.tools = lib.toolVersions();
  out.rules = { biome: BIOME_RULES, eslint: ES_RULES, oxlint: OX_RULES };
  out.compile = COMPILE;
  for (const name of names) {
    const t0 = Date.now();
    const rows = lib
      .readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`))
      .filter((r) => !r.error);
    const rels = rows.map((r) => r.rel);
    const rowOf = new Map(rows.map((r) => [r.rel, r]));
    const root = lib.getRepo(name).root;
    const census = lib.readJson(join(lib.RESULTS_DIR, "census.json")).repos[
      name
    ];
    const original = new Map(
      rels.map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
    );
    // the program, for resolution, type-checking and emit
    const base = lib.repoProgram(name, rels, {
      extraOptions: { noEmit: false },
    });
    const resolveTo = (spec, rel) => {
      const r = base.resolveSpec(spec, join(base.root, rel));
      return r.file && r.file.startsWith(base.root + sep)
        ? relative(base.root, r.file).split(sep).join("/")
        : null;
    };
    const progEmit = (program, rel) => {
      const sf = program.getSourceFile(join(base.root, rel));
      if (!sf) {
        return null;
      }
      let js = null;
      program.emit(sf, (f, text) => {
        if (/\.[cm]?jsx?$/.test(f)) {
          js = text;
        }
      });
      return js;
    };
    const diagsOf = (program, relsToCheck) => {
      const outD = {};
      for (const rel of relsToCheck) {
        const sf = program.getSourceFile(join(base.root, rel));
        if (!sf) {
          continue;
        }
        for (const d of [
          ...program.getSyntacticDiagnostics(sf),
          ...program.getSemanticDiagnostics(sf),
        ]) {
          outD[d.code] = (outD[d.code] ?? 0) + 1;
        }
      }
      return outD;
    };
    const repo = { paths: {}, resolution: null, set: lib.setOf(name) };
    const repoDetail = { paths: {} };
    for (const path of paths) {
      const baseDir = lib.copyFiles(
        root,
        join(WORK, name, path, "baseline"),
        rels
      );
      const fixDir = lib.copyFiles(root, join(WORK, name, path, "fixed"), rels);
      await formatOnly(path, baseDir, rels);
      await fixPath(path, fixDir, rels);
      const fixed = new Map(
        rels.map((rel) => [rel, readFileSync(join(fixDir, rel), "utf8")])
      );
      const formatted = new Map(
        rels.map((rel) => [rel, readFileSync(join(baseDir, rel), "utf8")])
      );
      // files whose imports changed (the formatter alone can change other lines)
      const changed = rels.filter((rel) => {
        const b = importDecls(original.get(rel), rel);
        const a = importDecls(fixed.get(rel), rel);
        return (
          JSON.stringify(b) !== JSON.stringify(a) ||
          formatted.get(rel) !== fixed.get(rel)
        );
      });
      const ns = numstat(baseDir, fixDir);
      // second pass: does the fix change the file again?
      const againDir = lib.copyFiles(
        fixDir,
        join(WORK, name, path, "again"),
        changed
      );
      await fixPath(path, againDir, changed);
      const notConverged = changed.filter(
        (rel) => readFileSync(join(againDir, rel), "utf8") !== fixed.get(rel)
      );
      // reports before and after
      const before = relint(path, baseDir, rels);
      const after = relint(path, fixDir, rels);
      const countBy = (ds) =>
        ds.reduce((o, d) => ({ ...o, [d.rule]: (o[d.rule] ?? 0) + 1 }), {});
      const perFile = (ds) => {
        const m = new Map();
        for (const d of ds) {
          const k = `${d.file}|${d.rule}`;
          m.set(k, (m.get(k) ?? 0) + 1);
        }
        return m;
      };
      const pb = perFile(before);
      const introduced = {};
      for (const [k, n] of perFile(after)) {
        const extra = n - (pb.get(k) ?? 0);
        if (extra > 0) {
          const rule = k.split("|")[1];
          introduced[rule] = (introduced[rule] ?? 0) + extra;
        }
      }
      // per changed file
      const files = [];
      const changeKinds = {};
      const lines = { added: 0, removed: 0 };
      let dupFilesAfter = 0;
      let dupFilesBefore = 0;
      for (const rel of changed) {
        const b = importDecls(original.get(rel), rel);
        const a = importDecls(fixed.get(rel), rel);
        const kinds = classifyChange(b, a);
        for (const [k, n] of Object.entries(kinds)) {
          changeKinds[k] = (changeKinds[k] ?? 0) + n;
        }
        const st = ns.get(rel) ?? lineDiff(formatted.get(rel), fixed.get(rel));
        lines.added += st.added;
        lines.removed += st.removed;
        const db = duplicateGroups(b);
        const da = duplicateGroups(a);
        if (db) {
          dupFilesBefore += 1;
        }
        if (da) {
          dupFilesAfter += 1;
        }
        files.push({
          dupAfter: da,
          dupBefore: db,
          kinds,
          lines: st,
          rel,
          test: rowOf.get(rel)?.test ?? false,
        });
      }
      // compiled imports, before and after, for changed TypeScript files
      const tsChanged = changed.filter(
        (rel) => lib.isTsFile(rel) && !/\.d\.[cm]?ts$/.test(rel)
      );
      const overlay = new Map(
        tsChanged.map((rel) => [resolve(join(base.root, rel)), fixed.get(rel)])
      );
      const fixedProg = lib.repoProgram(name, rels, {
        extraOptions: { noEmit: false },
        overlay,
      });
      const emitted = {};
      const sideEffects = {};
      const edgeDelta = {};
      const metadata = { files: 0, changedSlots: 0, examples: [] };
      const items = [];
      for (const rel of tsChanged) {
        const flags = rowOf.get(rel)?.flags ?? {};
        const variants = {};
        variants["tsc program (repo settings)"] = [
          progEmit(base.program, rel),
          progEmit(fixedProg.program, rel),
        ];
        for (const [tool, mode] of COMPILE) {
          const f = flagsFor(mode, flags);
          const fileName = rel.replace(/^.*\//, "");
          let b = lib.compileOne(tool, original.get(rel), fileName, f);
          let a = lib.compileOne(tool, fixed.get(rel), fileName, f);
          if (tool === "node-strip" && (b.code == null || a.code == null)) {
            // strip-only mode rejects enums, parameter properties, namespaces and JSX anywhere in
            // the file; stripping is local, so the import and export statements alone show what
            // it keeps
            const heads = (t) =>
              ts
                .createSourceFile(
                  "x.ts",
                  t,
                  ts.ScriptTarget.ESNext,
                  true,
                  /x$/.test(rel) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
                )
                .statements.filter(
                  (s) =>
                    ts.isImportDeclaration(s) ||
                    (ts.isExportDeclaration(s) && s.moduleSpecifier)
                )
                .map((s) => s.getText())
                .join("\n");
            b = lib.compileOne(tool, heads(original.get(rel)), "x.ts", f);
            a = lib.compileOne(tool, heads(fixed.get(rel)), "x.ts", f);
          }
          variants[`${tool} | ${mode}`] = [b.code, a.code];
        }
        items.push({ rel, variants });
        // decorator metadata, compiled with emitDecoratorMetadata (hypothetical unless the repo sets it)
        if (
          /@[A-Za-z_$]/.test(original.get(rel)) &&
          (rowOf.get(rel)?.decorators ?? 0) > 0
        ) {
          const f = {
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
          };
          const mb = metadataOfJs(
            lib.compileOne(
              "transpileModule",
              original.get(rel),
              rel.replace(/^.*\//, ""),
              f
            ).code
          );
          const ma = metadataOfJs(
            lib.compileOne(
              "transpileModule",
              fixed.get(rel),
              rel.replace(/^.*\//, ""),
              f
            ).code
          );
          metadata.files += 1;
          const diff =
            ma.filter((x, i) => x !== mb[i]).length +
            Math.abs(ma.length - mb.length);
          if (diff) {
            metadata.changedSlots += diff;
            if (metadata.examples.length < 5) {
              metadata.examples.push({
                after: ma.slice(0, 3),
                before: mb.slice(0, 3),
                permalink: lib.permalink(name, rel, 1),
                repoFlags: rowOf.get(rel)?.flags ?? {},
              });
            }
          }
        }
      }
      // Bun, one batch per version
      const bunB = lib.bunCompile(
        tsChanged.map((rel) => ({
          file: rel.replace(/^.*\//, ""),
          id: rel,
          text: original.get(rel),
        })),
        { trim: true }
      );
      const bunA = lib.bunCompile(
        tsChanged.map((rel) => ({
          file: rel.replace(/^.*\//, ""),
          id: rel,
          text: fixed.get(rel),
        })),
        { trim: true }
      );
      for (const it of items) {
        it.variants["bun | trimUnusedImports"] = [
          bunB.get(it.rel)?.code ?? null,
          bunA.get(it.rel)?.code ?? null,
        ];
      }
      for (const it of items) {
        for (const [k, [b, a]] of Object.entries(it.variants)) {
          emitted[k] ??= {
            appeared: 0,
            compileErrors: 0,
            disappeared: 0,
            files: 0,
            filesChanged: 0,
            sideEffectAppeared: 0,
            sideEffectDisappeared: 0,
            examples: [],
          };
          const e = emitted[k];
          e.files += 1;
          if (b == null || a == null) {
            e.compileErrors += 1;
            continue;
          }
          const lb = lib.importsOfJs(b);
          const la = lib.importsOfJs(a);
          const ms = (rows2) => rows2.map((r) => r.specifier);
          const diffCount = (x, y) => {
            const m = new Map();
            for (const s of x) {
              m.set(s, (m.get(s) ?? 0) + 1);
            }
            let n = 0;
            const lost = [];
            for (const s of y) {
              const c = m.get(s) ?? 0;
              if (c > 0) {
                m.set(s, c - 1);
              }
            }
            for (const [s, c] of m) {
              if (c > 0) {
                n += c;
                lost.push(s);
              }
            }
            return { lost, n };
          };
          // specifiers loaded before and not after (a module that no longer evaluates from here)
          const gone = diffCount(new Set(ms(lb)), [...new Set(ms(la))]);
          const came = diffCount(new Set(ms(la)), [...new Set(ms(lb))]);
          const seB = lb
            .filter((r) => r.kind === "side-effect")
            .map((r) => r.specifier);
          const seA = la
            .filter((r) => r.kind === "side-effect")
            .map((r) => r.specifier);
          e.disappeared += gone.n;
          e.appeared += came.n;
          e.sideEffectDisappeared += diffCount(seB, seA).n;
          e.sideEffectAppeared += diffCount(seA, seB).n;
          if (gone.n || came.n) {
            e.filesChanged += 1;
            if (e.examples.length < 6) {
              e.examples.push({
                appeared: came.lost,
                disappeared: gone.lost,
                permalink: lib.permalink(name, it.rel, 1),
                rel: it.rel,
              });
            }
            const tgt = (specs) =>
              specs.map((s) => resolveTo(s, it.rel)).filter(Boolean);
            edgeDelta[k] ??= { added: [], removed: [] };
            for (const t of tgt(gone.lost)) {
              edgeDelta[k].removed.push([it.rel, t]);
            }
            for (const t of tgt(came.lost)) {
              edgeDelta[k].added.push([it.rel, t]);
            }
          }
          sideEffects[k] = {
            appeared: e.sideEffectAppeared,
            disappeared: e.sideEffectDisappeared,
          };
        }
      }
      // runtime cycles per compiler: the original's runtime edges (every file, compiled the same
      // way), then the fixed files' edges swapped in
      const cycles = {};
      for (const [k] of Object.entries(emitted)) {
        if (!edgeDelta[k]) {
          cycles[k] = { changed: false };
          continue;
        }
        const [tool, mode] = k.split(" | ");
        const edges = new Map();
        for (const rel of rels) {
          let code;
          if (k.startsWith("tsc program")) {
            code = lib.isTsFile(rel)
              ? progEmit(base.program, rel)
              : original.get(rel);
          } else if (tool === "bun") {
            code = null;
          } else {
            code = lib.isTsFile(rel)
              ? lib.compileOne(
                  tool,
                  original.get(rel),
                  rel.replace(/^.*\//, ""),
                  flagsFor(mode, rowOf.get(rel)?.flags ?? {})
                ).code
              : original.get(rel);
          }
          if (code == null) {
            continue;
          }
          let rows2;
          try {
            rows2 = lib.importsOfJs(code);
          } catch {
            continue;
          }
          edges.set(
            rel,
            new Set(
              rows2.map((r) => resolveTo(r.specifier, rel)).filter(Boolean)
            )
          );
        }
        const beforeC = sccs(edges);
        for (const [from, to] of edgeDelta[k].removed) {
          edges.get(from)?.delete(to);
        }
        for (const [from, to] of edgeDelta[k].added) {
          if (!edges.has(from)) {
            edges.set(from, new Set());
          }
          edges.get(from).add(to);
        }
        const afterC = sccs(edges);
        cycles[k] = {
          after: {
            components: afterC.length,
            files: afterC.reduce((s, c) => s + c.length, 0),
          },
          before: {
            components: beforeC.length,
            files: beforeC.reduce((s, c) => s + c.length, 0),
          },
          edgesAdded: edgeDelta[k].added.length,
          edgesRemoved: edgeDelta[k].removed.length,
        };
      }
      // type-check the changed files before and after
      const typecheck = {
        after: diagsOf(fixedProg.program, tsChanged),
        before: diagsOf(base.program, tsChanged),
      };
      // TS2307/TS2792 (a module that doesn't resolve) count once per import declaration, so a
      // split of an unresolved import adds one; they're kept apart
      const newCodes = {};
      for (const code of new Set([
        ...Object.keys(typecheck.after),
        ...Object.keys(typecheck.before),
      ])) {
        const d = (typecheck.after[code] ?? 0) - (typecheck.before[code] ?? 0);
        if (d) {
          newCodes[
            ["2307", "2792"].includes(code)
              ? `${code} (unresolved module, per declaration)`
              : code
          ] = d;
        }
      }
      repo.paths[path] = {
        changeKinds,
        changedFiles: changed.length,
        changedSource: files.filter((f) => !f.test).length,
        changedTests: files.filter((f) => f.test).length,
        cycles,
        duplicateGroupFiles: { after: dupFilesAfter, before: dupFilesBefore },
        emitted: Object.fromEntries(
          Object.entries(emitted).map(([k, v]) => [k, v])
        ),
        introduced,
        lines,
        metadata,
        notConverged: notConverged.length,
        notConvergedKinds: settleKinds(fixDir, againDir, notConverged),
        notConvergedExamples: notConverged
          .slice(0, 5)
          .map((rel) => lib.permalink(name, rel, 1)),
        reportsAfter: countBy(after),
        reportsBefore: countBy(before),
        typecheckDelta: newCodes,
      };
      repoDetail.paths[path] = { files, notConverged };
      console.log(
        `${name} ${path}: ${changed.length} files changed, +${lines.added}/-${lines.removed}, after ${JSON.stringify(countBy(after))}, introduced ${JSON.stringify(introduced)}, not converged ${notConverged.length}, tc ${JSON.stringify(newCodes)}`
      );
    }
    repo.resolution =
      lib.readJson(join(lib.RESULTS_DIR, "linters.json"), {}).repos?.[name]
        ?.typed?.resolution ?? null;
    repo.flags =
      census?.tsconfigs?.map((t) => ({
        effective: t.effective,
        file: t.file,
        files: t.files,
      })) ?? null;
    out.repos[name] = repo;
    mkdirSync(join(lib.OUT_DIR, "fixes"), { recursive: true });
    lib.writeJson(
      join(lib.OUT_DIR, "fixes", `${name}.json`),
      lib.scrubDeep(repoDetail)
    );
    lib.writeJson(file, lib.scrubDeep(out));
    console.log(`${name}: ${Math.round((Date.now() - t0) / 1000)} s`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
