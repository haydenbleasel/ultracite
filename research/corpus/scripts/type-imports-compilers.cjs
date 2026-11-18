// What each compiler installed on this machine does with `import { type X } from "./y"`, with
// `import type { X } from "./y"` and with a mix, and whether `./y`'s side effect survives.
//
// Hayden's reason for `prefer-top-level` (17 Nov 2026): "at the time, `import { type x }` when TS
// compiles turns into `import { }` leaving a potential side effect import or at the very least a
// waste of a line. `import type` was removed entirely during compilation." This script tests that
// claim directly.
//
// --calibration: every case in calibration/type-imports/compilers/ (y.ts has a top-level side
//   effect; each other file imports from it in one way) through every compiler and mode below. Each
//   output is classified by what it does with "./y.js" (kept with names, kept as `import {} from`,
//   kept as `import "./y.js"`, dropped) and then run in a fresh Node process, which prints the
//   modules that evaluated (or the error).
//     tsc 6 (packages/cli)      full program emit, tsconfig: default, isolatedModules,
//                               verbatimModuleSyntax, and the removed importsNotUsedAsValues
//                               "preserve" and preserveValueImports (their errors recorded)
//     ts.transpileModule        default, isolatedModules, verbatimModuleSyntax
//     TypeScript 7 (Bun's)      `bun check` diagnostics in each mode (it type-checks; it doesn't emit)
//     esbuild                   transform, verbatimModuleSyntax off and on; bundle, off and on
//     Oxc (rolldown's)          transformSync, onlyRemoveTypeImports off and on; rolldown bundle
//     sucrase                   keepUnusedImports off and on
//     Bun                       Bun.Transpiler, `bun build --no-bundle`, `bun build` (bundle) and
//                               `bun file.ts` (its runtime), with verbatimModuleSyntax off and on
//                               in tsconfig.json
//     Node                      module.stripTypeScriptTypes (strip and transform modes) and
//                               `node file.ts` (its type stripping, on by default)
//   Not run, with the reason: swc, Babel's TypeScript plugin, TypeScript 7's emit, ts-rust, scriptc.
// --corpus: every import whose specifiers all carry an inline `type` in every repo (source and
//   tests), compiled with each per-file compiler in both modes; what each does with that import.
//
// Runs only this repo's hand-written cases and copies of corpus files under TMP; nothing from a
// clone runs. Usage:
//   TYPE_IMPORTS_TMP=<scratch> node research/corpus/scripts/type-imports-compilers.cjs --calibration --corpus
// Writes results/type-imports/compilers.json.
"use strict";

const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./type-imports-lib.cjs");

const { ts } = lib;
const CASES_DIR = join(lib.CALIBRATION_DIR, "compilers");
const WORK = join(lib.TMP, "compilers");
const CASES = [
  "inline",
  "inline-two",
  "top-level",
  "mixed",
  "split",
  "plain-type",
  "unused-value",
  "empty-braces",
];
const TARGET = "./y.js";

const NOT_RUN = {
  "Babel (@babel/plugin-transform-typescript)": `not run: @babel/core ${lib.versionAt(lib.storePackage("@babel+core", "@babel/core"))} is in the Bun store, but no TypeScript plugin or preset is installed`,
  scriptc: "not run (not installed; see the bibliography)",
  swc: "not run: no @swc/core or swc binary installed",
  "ts-rust": "not run (not installed; see the bibliography)",
  "TypeScript 7 emit (tsgo, @typescript/native-preview)":
    "not run: neither is installed; Bun's bundled TypeScript 7 is run with `bun check`, which type-checks without emitting",
};

// What compiled JavaScript does with the import of TARGET.
const treatment = (js) => {
  if (js == null) {
    return "no output";
  }
  const sf = ts.createSourceFile("o.js", js, ts.ScriptTarget.ESNext, true);
  const kinds = [];
  for (const st of sf.statements) {
    if (
      (ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) &&
      st.moduleSpecifier &&
      ts.isStringLiteral(st.moduleSpecifier) &&
      st.moduleSpecifier.text === TARGET
    ) {
      const c = ts.isImportDeclaration(st) ? st.importClause : null;
      if (ts.isExportDeclaration(st)) {
        kinds.push("export-from");
      } else if (!c) {
        kinds.push("side-effect import");
      } else if (
        !c.name &&
        c.namedBindings &&
        ts.isNamedImports(c.namedBindings) &&
        c.namedBindings.elements.length === 0
      ) {
        kinds.push("empty import {}");
      } else {
        kinds.push("named import");
      }
    }
  }
  return kinds.length ? kinds.join(" + ") : "dropped";
};

// Runs a compiled entry (ESM) next to y.js in a fresh Node process; returns what evaluated.
const runOut = (dir, entry) => {
  writeFileSync(join(dir, "package.json"), '{ "type": "module" }\n');
  const r = lib.spawnSync(process.execPath, [entry], {
    cwd: dir,
    encoding: "utf8",
    timeout: 20_000,
  });
  return parseRun(r);
};
const parseRun = (r) => {
  const line = (r.stdout ?? "").trim().split("\n").filter(Boolean).at(-1);
  if (r.status === 0 && line) {
    try {
      const { evaluated } = JSON.parse(line);
      return { evaluated, yEvaluated: evaluated.includes("y") };
    } catch {
      // fall through
    }
  }
  const err = (r.stderr ?? "").split("\n").find((l) => /Error|error:/.test(l));
  return { error: lib.scrub(err?.trim() ?? `exit ${r.status}`) };
};
const yJs =
  '(globalThis.__evaluated ??= []).push("y");\nexport const value = 1;\n';

const writeCase = (dir, name, code) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.js`), code);
  writeFileSync(join(dir, "y.js"), yJs);
  return `${name}.js`;
};

const tsconfigFor = (flags) => ({
  compilerOptions: {
    module: "esnext",
    moduleResolution: "bundler",
    noEmitOnError: false,
    outDir: "out",
    rootDir: "src",
    skipLibCheck: true,
    strict: true,
    target: "es2022",
    types: [],
    ...flags,
  },
  include: ["src/*.ts"],
});
const TSC_MODES = {
  default: {},
  isolatedModules: { isolatedModules: true },
  verbatimModuleSyntax: { verbatimModuleSyntax: true },
  'importsNotUsedAsValues "preserve" (removed in TypeScript 5.5)': {
    importsNotUsedAsValues: "preserve",
  },
  "preserveValueImports (removed in TypeScript 5.5)": {
    isolatedModules: true,
    preserveValueImports: true,
  },
};
// packages/cli's TypeScript, the one Ultracite's ESLint parser uses
const tscBin = join(
  dirname(require.resolve("typescript/package.json", { paths: [lib.CLI] })),
  "bin/tsc"
);
const diag = (text) => {
  const seen = new Set();
  return diagAll(text).filter((d) => {
    const k = `${d.code}|${d.file}|${d.message}`;
    if (seen.has(k)) {
      return false;
    }
    seen.add(k);
    return true;
  });
};
const diagAll = (text) =>
  [
    ...text.matchAll(
      /^(?:src\/)?([^\s(]+)\((\d+),\d+\): error (TS\d+): (.*)$/gm
    ),
  ]
    .map((m) => ({ code: m[3], file: m[1], line: Number(m[2]), message: m[4] }))
    .concat(
      [
        ...text.matchAll(/^(?:tsconfig\.json[^:]*: )?error (TS\d+): (.*)$/gm),
      ].map((m) => ({ code: m[1], file: "tsconfig.json", message: m[2] }))
    );

const calibration = async () => {
  await lib.loadCompilers();
  rmSync(WORK, { force: true, recursive: true });
  mkdirSync(WORK, { recursive: true });
  const sources = Object.fromEntries(
    [...CASES, "y"].map((c) => [
      c,
      readFileSync(join(CASES_DIR, `${c}.ts`), "utf8"),
    ])
  );
  const rows = [];
  const add = (compiler, mode, c, out) =>
    rows.push({ case: c, compiler, mode, ...out });

  // tsc 6, a full program per mode
  for (const [mode, flags] of Object.entries(TSC_MODES)) {
    const dir = join(WORK, "tsc", mode.replace(/\W+/g, "-"));
    mkdirSync(join(dir, "src"), { recursive: true });
    for (const c of [...CASES, "y"]) {
      copyFileSync(join(CASES_DIR, `${c}.ts`), join(dir, "src", `${c}.ts`));
    }
    copyFileSync(
      join(CASES_DIR, "globals.d.ts"),
      join(dir, "src", "globals.d.ts")
    );
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify(tsconfigFor(flags), null, 2)
    );
    const r = lib.spawnSync(
      process.execPath,
      [tscBin, "-p", "tsconfig.json", "--pretty", "false"],
      {
        cwd: dir,
        encoding: "utf8",
      }
    );
    const diagnostics = diag(`${r.stdout}\n${r.stderr}`);
    for (const c of CASES) {
      const outFile = join(dir, "out", `${c}.js`);
      const js = existsSync(outFile) ? readFileSync(outFile, "utf8") : null;
      const runDir = join(dir, "run");
      let run = { error: "no output" };
      if (js != null) {
        run = runOut(runDir, writeCase(runDir, c, js));
      }
      add("tsc 6 (program)", mode, c, {
        diagnostics: diagnostics.filter(
          (d) => d.file === `${c}.ts` || d.file === "tsconfig.json"
        ),
        output: js,
        run,
        treatment: treatment(js),
      });
    }
  }
  // TypeScript 7 (Bun's bundled checker): diagnostics only
  for (const [mode, flags] of Object.entries(TSC_MODES).slice(0, 3)) {
    const dir = join(WORK, "ts7", mode);
    mkdirSync(join(dir, "src"), { recursive: true });
    for (const c of [...CASES, "y"]) {
      copyFileSync(join(CASES_DIR, `${c}.ts`), join(dir, "src", `${c}.ts`));
    }
    copyFileSync(
      join(CASES_DIR, "globals.d.ts"),
      join(dir, "src", "globals.d.ts")
    );
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify(tsconfigFor({ ...flags, noEmit: true }), null, 2)
    );
    const r = lib.spawnSync(
      "bun",
      ["check", "-p", "tsconfig.json", "--no-pretty", "--all"],
      {
        cwd: dir,
        encoding: "utf8",
      }
    );
    const diagnostics = diag(`${r.stdout}\n${r.stderr}`);
    for (const c of CASES) {
      add("TypeScript 7 (bun check)", mode, c, {
        diagnostics: diagnostics.filter((d) => d.file === `${c}.ts`),
        output: null,
        run: null,
        treatment: "type-check only",
      });
    }
  }
  // per-file compilers in this process
  const perFile = [
    ["ts.transpileModule", "default", "transpileModule", {}],
    [
      "ts.transpileModule",
      "isolatedModules",
      "transpileModule",
      { isolatedModules: true },
    ],
    [
      "ts.transpileModule",
      "verbatimModuleSyntax",
      "transpileModule",
      { verbatimModuleSyntax: true },
    ],
    ["esbuild (transform)", "default", "esbuild", {}],
    [
      "esbuild (transform)",
      "verbatimModuleSyntax",
      "esbuild",
      { verbatimModuleSyntax: true },
    ],
    ["Oxc (rolldown transformSync)", "default", "oxc", {}],
    [
      "Oxc (rolldown transformSync)",
      "onlyRemoveTypeImports (verbatimModuleSyntax)",
      "oxc",
      { verbatimModuleSyntax: true },
    ],
    ["sucrase", "default", "sucrase", {}],
    [
      "sucrase",
      "keepUnusedImports (its verbatimModuleSyntax)",
      "sucrase",
      { verbatimModuleSyntax: true },
    ],
    ["Node module.stripTypeScriptTypes", "strip", "node-strip", {}],
  ];
  for (const [compiler, mode, tool, flags] of perFile) {
    const dir = join(WORK, tool, mode.replace(/\W+/g, "-"));
    for (const c of CASES) {
      const r = lib.compileOne(tool, sources[c], `${c}.ts`, flags);
      const run =
        r.code == null
          ? { error: r.error }
          : runOut(dir, writeCase(dir, c, r.code));
      add(compiler, mode, c, {
        compileError: r.error ?? null,
        output: r.code,
        run,
        treatment: treatment(r.code),
      });
    }
  }
  // Node's transform mode (--experimental-transform-types)
  {
    const { stripTypeScriptTypes } = require("node:module");
    const warn = process.emitWarning;
    process.emitWarning = () => {};
    const dir = join(WORK, "node-transform");
    for (const c of CASES) {
      let code = null;
      let error = null;
      try {
        code = stripTypeScriptTypes(sources[c], { mode: "transform" });
      } catch (e) {
        error = String(e.message).split("\n")[0];
      }
      add(
        "Node module.stripTypeScriptTypes",
        "transform (--experimental-transform-types)",
        c,
        {
          compileError: error,
          output: code,
          run: code == null ? { error } : runOut(dir, writeCase(dir, c, code)),
          treatment: treatment(code),
        }
      );
    }
    process.emitWarning = warn;
  }
  // `node file.ts`: Node's own type stripping, with the specifier pointing at y.ts
  {
    const dir = join(WORK, "node-run");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), '{ "type": "module" }\n');
    writeFileSync(join(dir, "y.ts"), sources.y);
    for (const c of CASES) {
      writeFileSync(
        join(dir, `${c}.ts`),
        sources[c].replaceAll('"./y.js"', '"./y.ts"')
      );
      const r = lib.spawnSync(process.execPath, [`${c}.ts`], {
        cwd: dir,
        encoding: "utf8",
        timeout: 20_000,
      });
      add(
        "Node (node file.ts)",
        `type stripping (${process.features.typescript})`,
        c,
        {
          output: null,
          run: parseRun(r),
          treatment: "runs the source",
        }
      );
    }
  }
  // esbuild bundles
  for (const verbatim of [false, true]) {
    const src = join(WORK, "esbuild-bundle-src");
    mkdirSync(src, { recursive: true });
    for (const c of [...CASES, "y"]) {
      writeFileSync(join(src, `${c}.ts`), sources[c]);
    }
    const dir = join(WORK, `esbuild-bundle-${verbatim}`);
    for (const c of CASES) {
      let code = null;
      let error = null;
      try {
        const r = lib.esbuildApi().buildSync({
          bundle: true,
          entryPoints: [join(src, `${c}.ts`)],
          format: "esm",
          logLevel: "silent",
          tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: verbatim } },
          write: false,
        });
        code = r.outputFiles[0].text;
      } catch (e) {
        error = lib.scrub(String(e.message).split("\n")[0]);
      }
      add(
        "esbuild (bundle)",
        verbatim ? "verbatimModuleSyntax" : "default",
        c,
        {
          bundledY: code == null ? null : code.includes('push("y")'),
          compileError: error,
          output: code,
          run: code == null ? { error } : runOut(dir, writeCase(dir, c, code)),
          treatment:
            code == null
              ? "no output"
              : code.includes('push("y")')
                ? "y bundled"
                : "y not bundled",
        }
      );
    }
  }
  // rolldown bundles (Vite 8's bundler, on Oxc)
  const { rolldown } = await import(
    pathToFileURL(join(lib.ROLLDOWN_DIR, "dist/index.mjs")).href
  );
  for (const verbatim of [false, true]) {
    const src = join(WORK, "rolldown-bundle-src");
    mkdirSync(src, { recursive: true });
    for (const c of [...CASES, "y"]) {
      writeFileSync(join(src, `${c}.ts`), sources[c]);
    }
    const dir = join(WORK, `rolldown-bundle-${verbatim}`);
    for (const c of CASES) {
      let code = null;
      let error = null;
      try {
        const bundle = await rolldown({
          cwd: src,
          input: join(src, `${c}.ts`),
          logLevel: "silent",
          resolve: { extensionAlias: { ".js": [".ts", ".js"] } },
          transform: { typescript: { onlyRemoveTypeImports: verbatim } },
        });
        const out = await bundle.generate({ format: "esm" });
        code = out.output[0].code;
        await bundle.close();
      } catch (e) {
        error = lib.scrub(
          String(e.message).split("\n").slice(0, 3).join(" ").trim()
        );
      }
      add(
        "rolldown (bundle)",
        verbatim ? "onlyRemoveTypeImports" : "default",
        c,
        {
          bundledY: code == null ? null : code.includes('push("y")'),
          compileError: error,
          output: code,
          run: code == null ? { error } : runOut(dir, writeCase(dir, c, code)),
          treatment:
            code == null
              ? "no output"
              : code.includes('push("y")')
                ? "y bundled"
                : "y not bundled",
        }
      );
    }
  }
  // Bun: Bun.Transpiler, bun build --no-bundle, bun build, bun file.ts
  for (const verbatim of [false, true]) {
    const mode = verbatim ? "verbatimModuleSyntax in tsconfig.json" : "default";
    const items = CASES.map((c) => ({
      file: `${c}.ts`,
      id: c,
      text: sources[c],
    }));
    for (const trim of [null, true]) {
      const out = lib.bunCompile(items, { trim, verbatim });
      const dir = join(WORK, `bun-transpiler-${verbatim}-${trim}`);
      for (const c of CASES) {
        const r = out.get(c);
        add(
          trim
            ? "Bun.Transpiler (trimUnusedImports)"
            : "Bun.Transpiler (its defaults)",
          mode,
          c,
          {
            compileError: r.error ?? null,
            output: r.code,
            run:
              r.code == null
                ? { error: r.error }
                : runOut(dir, writeCase(dir, c, r.code)),
            treatment: treatment(r.code),
          }
        );
      }
    }
    const src = join(WORK, `bun-src-${verbatim}`);
    rmSync(src, { force: true, recursive: true });
    mkdirSync(src, { recursive: true });
    for (const c of [...CASES, "y"]) {
      writeFileSync(join(src, `${c}.ts`), sources[c]);
    }
    copyFileSync(join(CASES_DIR, "globals.d.ts"), join(src, "globals.d.ts"));
    writeFileSync(
      join(src, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { verbatimModuleSyntax: verbatim } })
    );
    for (const c of CASES) {
      const nb = lib.spawnSync("bun", ["build", "--no-bundle", `${c}.ts`], {
        cwd: src,
        encoding: "utf8",
      });
      const nbCode = nb.status === 0 ? nb.stdout : null;
      const nbDir = join(WORK, `bun-build-nobundle-${verbatim}`);
      add("bun build --no-bundle", mode, c, {
        compileError:
          nb.status === 0 ? null : lib.scrub(nb.stderr.split("\n")[0]),
        output: nbCode,
        run:
          nbCode == null
            ? { error: "no output" }
            : runOut(nbDir, writeCase(nbDir, c, nbCode)),
        treatment: treatment(nbCode),
      });
      const b = lib.spawnSync(
        "bun",
        ["build", `${c}.ts`, "--target", "node", "--format", "esm"],
        {
          cwd: src,
          encoding: "utf8",
        }
      );
      const bCode = b.status === 0 ? b.stdout : null;
      const bDir = join(WORK, `bun-build-bundle-${verbatim}`);
      add("bun build (bundle)", mode, c, {
        bundledY: bCode == null ? null : bCode.includes('push("y")'),
        compileError:
          b.status === 0 ? null : lib.scrub(b.stderr.split("\n")[0]),
        output: bCode,
        run:
          bCode == null
            ? { error: "no output" }
            : runOut(bDir, writeCase(bDir, c, bCode)),
        treatment:
          bCode == null
            ? "no output"
            : bCode.includes('push("y")')
              ? "y bundled"
              : "y not bundled",
      });
      const run = lib.spawnSync("bun", [`${c}.ts`], {
        cwd: src,
        encoding: "utf8",
        timeout: 20_000,
      });
      add("Bun (bun file.ts)", mode, c, {
        output: null,
        run: parseRun(run),
        treatment: "runs the source",
      });
    }
  }
  // the summary: per compiler and mode, the inline, inline-two, top-level, mixed and split cases
  const summary = {};
  for (const r of rows) {
    const key = `${r.compiler} | ${r.mode}`;
    summary[key] ??= {};
    summary[key][r.case] = {
      diagnostics: (r.diagnostics ?? []).map((d) => d.code),
      treatment: r.treatment,
      y:
        r.run == null
          ? null
          : r.run.error
            ? `error: ${r.run.error}`
            : r.run.yEvaluated
              ? "evaluated"
              : "not evaluated",
    };
  }
  return { cases: CASES, notRun: NOT_RUN, rows: lib.scrubDeep(rows), summary };
};

// ── the corpus: every all-inline-type import ───────────────────────────
const inlineOnlyImports = (sf) => {
  const out = [];
  const bySpec = new Map();
  for (const st of sf.statements) {
    if (
      !ts.isImportDeclaration(st) ||
      !ts.isStringLiteral(st.moduleSpecifier)
    ) {
      continue;
    }
    const spec = st.moduleSpecifier.text;
    bySpec.set(spec, (bySpec.get(spec) ?? 0) + 1);
    const c = st.importClause;
    if (
      c &&
      !c.isTypeOnly &&
      !c.name &&
      c.namedBindings &&
      ts.isNamedImports(c.namedBindings) &&
      c.namedBindings.elements.length > 0 &&
      c.namedBindings.elements.every((e) => e.isTypeOnly)
    ) {
      out.push({
        line: sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1,
        specifier: spec,
        specifiers: c.namedBindings.elements.length,
        text: st.getText(sf),
      });
    }
  }
  for (const o of out) {
    o.sameSpecifierImports = bySpec.get(o.specifier);
  }
  return out;
};
// What a compiled file keeps of an import of `spec`: the same treatment classes as above.
const treatmentOf = (js, spec, file) => {
  if (js == null) {
    return "no output";
  }
  const sf = ts.createSourceFile(
    `${file}.js`,
    js,
    ts.ScriptTarget.ESNext,
    true,
    /x$/.test(file) ? ts.ScriptKind.JSX : ts.ScriptKind.JS
  );
  const kinds = [];
  for (const st of sf.statements) {
    if (
      ts.isImportDeclaration(st) &&
      ts.isStringLiteral(st.moduleSpecifier) &&
      st.moduleSpecifier.text === spec
    ) {
      const c = st.importClause;
      kinds.push(
        !c
          ? "side-effect import"
          : !c.name &&
              c.namedBindings &&
              ts.isNamedImports(c.namedBindings) &&
              c.namedBindings.elements.length === 0
            ? "empty import {}"
            : "named import"
      );
    }
  }
  return kinds.length ? kinds.join(" + ") : "dropped";
};
const CORPUS_TOOLS = [
  ["ts.transpileModule", "default", "transpileModule", {}],
  [
    "ts.transpileModule",
    "verbatimModuleSyntax",
    "transpileModule",
    { verbatimModuleSyntax: true },
  ],
  ["esbuild", "default", "esbuild", {}],
  [
    "esbuild",
    "verbatimModuleSyntax",
    "esbuild",
    { verbatimModuleSyntax: true },
  ],
  ["Oxc", "default", "oxc", {}],
  ["Oxc", "onlyRemoveTypeImports", "oxc", { verbatimModuleSyntax: true }],
  ["sucrase", "default", "sucrase", {}],
  ["sucrase", "keepUnusedImports", "sucrase", { verbatimModuleSyntax: true }],
  ["Node stripTypeScriptTypes", "strip", "node-strip", {}],
];
const corpus = async () => {
  await lib.loadCompilers();
  const perRepo = {};
  const examples = [];
  const all = [];
  for (const name of lib.selectedRepos(lib.ALL)) {
    const root = lib.getRepo(name).root;
    const sites = [];
    const items = [];
    for (const { rel, test } of lib.filesOf(name)) {
      if (!/\.[cm]?tsx?$/.test(rel)) {
        continue;
      }
      const text = readFileSync(join(root, rel), "utf8");
      const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.ESNext, true);
      const found = inlineOnlyImports(sf);
      if (found.length === 0) {
        continue;
      }
      const results = {};
      for (const [compiler, mode, tool, flags] of CORPUS_TOOLS) {
        let r = lib.compileOne(tool, text, rel.replace(/^.*\//, ""), flags);
        let fallback = false;
        if (r.code == null && tool === "node-strip") {
          // strip-only mode rejects enums, parameter properties and namespaces anywhere in the file;
          // stripping is local, so the import statements alone show what it keeps
          r = lib.compileOne(
            tool,
            found.map((f) => f.text).join("\n"),
            "x.ts",
            flags
          );
          fallback = true;
        }
        results[`${compiler} | ${mode}`] = {
          code: r.code,
          error: r.error ?? null,
          fallback,
        };
      }
      items.push({ file: rel.replace(/^.*\//, ""), id: `${rel}`, text });
      sites.push({ found, rel, results, test });
    }
    // Bun.Transpiler in one batch per mode
    for (const verbatim of [false, true]) {
      const out = items.length
        ? lib.bunCompile(items, { verbatim })
        : new Map();
      for (const s of sites) {
        const r = out.get(s.rel) ?? { code: null, error: "missing" };
        s.results[
          `Bun.Transpiler | ${verbatim ? "verbatimModuleSyntax" : "default"}`
        ] = {
          code: r.code,
          error: r.error ?? null,
        };
      }
    }
    const counts = { files: sites.length, imports: 0, source: 0, tests: 0 };
    const byTool = {};
    for (const s of sites) {
      for (const f of s.found) {
        counts.imports += 1;
        counts[s.test ? "tests" : "source"] += 1;
        const row = {
          ambiguous: f.sameSpecifierImports > 1,
          line: f.line,
          rel: s.rel,
          repo: name,
          set: lib.setOf(name),
          specifier: f.specifier,
          test: s.test,
          treatments: {},
        };
        for (const [key, r] of Object.entries(s.results)) {
          const t =
            r.code == null
              ? `compile error`
              : f.sameSpecifierImports > 1
                ? "ambiguous (other imports of the same module)"
                : treatmentOf(r.code, f.specifier, s.rel);
          row.treatments[key] = t;
          byTool[key] ??= {};
          byTool[key][t] = (byTool[key][t] ?? 0) + 1;
        }
        all.push(row);
        if (examples.length < 12 && !s.test && !row.ambiguous) {
          examples.push({
            permalink: lib.permalink(name, s.rel, f.line),
            repo: name,
            text: f.text.slice(0, 200),
          });
        }
      }
    }
    perRepo[name] = { ...counts, byTool };
    console.log(name, JSON.stringify(counts));
  }
  // pooled over the external repos (Ultracite apart), source and tests apart
  const pool = (rows) => {
    const out = {};
    for (const r of rows) {
      for (const [k, t] of Object.entries(r.treatments)) {
        out[k] ??= {};
        out[k][t] = (out[k][t] ?? 0) + 1;
      }
    }
    return out;
  };
  const external = all.filter((r) => r.set !== "dogfood");
  return {
    examples,
    perRepo,
    pooled: {
      external: { imports: external.length, byTool: pool(external) },
      externalSource: {
        imports: external.filter((r) => !r.test).length,
        byTool: pool(external.filter((r) => !r.test)),
      },
      externalTests: {
        imports: external.filter((r) => r.test).length,
        byTool: pool(external.filter((r) => r.test)),
      },
    },
    rows: all,
  };
};

const main = async () => {
  const file = join(lib.RESULTS_DIR, "compilers.json");
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const out = {
    ...prev,
    generated: new Date().toISOString(),
    hayden:
      "at the time, `import { type x }` when TS compiles turns into `import { }` leaving a potential side effect import or at the very least a waste of a line. `import type` was removed entirely during compilation. not sure if that's still the case, especially with all the different typescript compilers out there now (ts-rust, ts7 in go, scriptc, bun build --compile) but at the time there was a solid reason.",
    tools: {
      ...lib.toolVersions(),
      // the TypeScript that `bun check` runs
      "TypeScript 7 (bundled with Bun)": lib
        .spawnSync("bun", ["-p", "process.versions.typescript"], {
          encoding: "utf8",
        })
        .stdout.trim(),
    },
  };
  if (lib.flag("calibration")) {
    out.calibration = await calibration();
    console.log(JSON.stringify(out.calibration.summary, null, 1));
  }
  if (lib.flag("corpus")) {
    const c = await corpus();
    mkdirSync(lib.OUT_DIR, { recursive: true });
    lib.writeJsonl(join(lib.OUT_DIR, "compilers-corpus.jsonl"), c.rows);
    out.corpus = { examples: c.examples, perRepo: c.perRepo, pooled: c.pooled };
    console.log(JSON.stringify(c.pooled, null, 1));
  }
  lib.writeJson(file, out);
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
