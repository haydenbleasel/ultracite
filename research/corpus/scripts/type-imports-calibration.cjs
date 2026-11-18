// The hand-written cases in calibration/type-imports/ (cases/ and the modules in lib/ they import,
// each of which records that it evaluated) through every linter configuration, every fix pass,
// TypeScript in each tsconfig mode and every per-file compiler, and then run.
//
//   lint      Oxlint (each variant in OXLINT_VARIANTS alone; `ultracite init`'s config with core,
//             and with core + nestjs), ESLint (each ESLINT_VARIANT through the census pass; the
//             census pass with parserOptions emitDecoratorMetadata/experimentalDecorators; the
//             Ultracite core and core + nestjs presets), Biome (each BIOME_VARIANT alone; the core
//             and core + nestjs presets), with every message and help text
//   fix       `ultracite fix` per linter on a copy (Oxlint --fix then Oxfmt, ESLint --fix then
//             Prettier, Biome check --write), and Oxlint's --fix-dangerously and Biome's --unsafe;
//             what each case becomes and what's still reported
//   compile   for the cases as written and after each fix: the TypeScript program (tsc) in each
//             MODE, ts.transpileModule, esbuild, Oxc, sucrase, Node's type stripping and Bun's
//             transpiler; each output's imports, and the output run in a fresh Node process: the
//             modules that evaluated, in order, the decorator metadata, the case's value or the error
//
// Runs only this repo's hand-written files, on copies under TMP. Usage:
//   TYPE_IMPORTS_TMP=<scratch> node research/corpus/scripts/type-imports-calibration.cjs
// Writes results/type-imports/calibration.json.
"use strict";

const {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative } = require("node:path");

const lib = require("./type-imports-lib.cjs");

const { ts } = lib;
const CAL = lib.CALIBRATION_DIR;
const WORK = join(lib.TMP, "calibration");
const CASE_FILES = readdirSync(join(CAL, "cases"))
  .filter((f) => /^c\d+.*\.tsx?$/.test(f))
  .sort();
const LIB_FILES = readdirSync(join(CAL, "lib"))
  .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts"))
  .sort();
const caseName = (f) => f.replace(/\.tsx?$/, "");

// tsconfig modes for the TypeScript program and ts.transpileModule
const MODES = {
  default: {},
  isolatedModules: { isolatedModules: true },
  verbatimModuleSyntax: { verbatimModuleSyntax: true },
  experimentalDecorators: { experimentalDecorators: true },
  decoratorMetadata: {
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
  },
  "decoratorMetadata+verbatim": {
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    verbatimModuleSyntax: true,
  },
};
// per-file compilers and the flags each runs with
const COMPILERS = [
  ["transpileModule", "default", {}],
  ["transpileModule", "verbatimModuleSyntax", { verbatimModuleSyntax: true }],
  ["transpileModule", "decoratorMetadata", MODES.decoratorMetadata],
  ["esbuild", "default", { experimentalDecorators: true }],
  [
    "esbuild",
    "verbatimModuleSyntax",
    { experimentalDecorators: true, verbatimModuleSyntax: true },
  ],
  ["oxc", "default", { experimentalDecorators: true }],
  [
    "oxc",
    "onlyRemoveTypeImports",
    { experimentalDecorators: true, verbatimModuleSyntax: true },
  ],
  ["oxc", "decoratorMetadata", MODES.decoratorMetadata],
  ["sucrase", "default", {}],
  ["node-strip", "strip", {}],
];

const copyState = (dir) => {
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(CAL, "cases"), join(dir, "cases"), { recursive: true });
  cpSync(join(CAL, "lib"), join(dir, "lib"), { recursive: true });
  return dir;
};
const allFiles = () => [
  ...CASE_FILES.map((f) => `cases/${f}`),
  ...LIB_FILES.map((f) => `lib/${f}`),
];

// ── linting ────────────────────────────────────────────────────────────
const byCase = (diags, fileOf) => {
  const out = {};
  for (const d of diags) {
    const f = fileOf(d);
    const m = /cases\/(c\d+[^/]*)\.tsx?$/.exec(f ?? "");
    if (!m) {
      continue;
    }
    out[m[1]] ??= [];
    out[m[1]].push({
      help: lib.scrub(d.help ?? null),
      line: d.line,
      message: lib.scrub(d.message),
      rule: d.rule,
      ...(d.fix ? { fix: d.fix } : {}),
      ...(d.suggestions?.length ? { suggestions: d.suggestions } : {}),
    });
  }
  return out;
};
const TOPIC_RULE =
  /consistent-type-(?:imports|exports|specifier-style)|no-import-type-side-effects|no-duplicates|no-duplicate-imports|useImportType|useExportType|noUnusedImports|no-unused-(?:vars|imports)|noUnusedVariables|unused-imports|TS\d+|noTypeOnlyImportAttributes|organizeImports/;
const lintAll = async (dir, { full = true } = {}) => {
  const files = allFiles();
  const caseFiles = CASE_FILES.map((f) => `cases/${f}`);
  const out = {};
  // Oxlint, each variant alone
  if (full) {
    for (const [v, rules] of Object.entries(lib.OXLINT_VARIANTS)) {
      const config = lib.writeOxlintRules(
        lib.CONFIG_DIR,
        `cal-${v.replace(/\W+/g, "-")}`,
        rules
      );
      out[`oxlint | ${v}`] = byCase(
        lib.runOxlint({ configFile: config, cwd: dir, files: caseFiles }),
        (d) => d.file
      );
    }
  }
  for (const presets of [["core"], ["core", "nestjs"]]) {
    const config = lib.oxlintPresetConfig(presets);
    const r = lib.spawnSync(
      process.execPath,
      [
        lib.oxlintBin,
        "-c",
        config,
        "--disable-nested-config",
        "--format",
        "json",
        ...caseFiles,
      ],
      { cwd: dir, encoding: "utf8", maxBuffer: 1 << 30 }
    );
    const report = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
    const ds = report.diagnostics.map((d) => ({
      file: d.filename,
      help: d.help ?? null,
      line: d.labels?.[0]?.span?.line ?? null,
      message: d.message,
      rule: lib.dc.oxlintRule(d.code),
    }));
    out[`oxlint | ultracite ${presets.join("+")}`] = byCase(
      ds.filter((d) => TOPIC_RULE.test(d.rule)),
      (d) => d.file
    );
  }
  // ESLint: the census pass and the presets
  if (full) {
    for (const v of Object.keys(lib.ESLINT_VARIANTS)) {
      const res = {};
      for (const f of caseFiles) {
        const inv = lib.inventory(readFileSync(join(dir, f), "utf8"), f, {
          variants: [v],
        });
        res[f] = inv.error
          ? [{ message: inv.error, rule: "parse" }]
          : inv.eslint;
      }
      out[`eslint | ${v}`] = byCase(
        Object.entries(res).flatMap(([f, ms]) =>
          ms.map((m) => ({ ...m, file: f }))
        ),
        (d) => d.file
      );
    }
    const withMeta = [];
    for (const f of caseFiles) {
      for (const m of lib.lintText(
        readFileSync(join(dir, f), "utf8"),
        f,
        lib.ESLINT_VARIANTS["consistent-type-imports"],
        {
          parserOptions: {
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
          },
        }
      )) {
        withMeta.push({ ...m, file: f });
      }
    }
    out[
      "eslint | consistent-type-imports with parserOptions emitDecoratorMetadata"
    ] = byCase(withMeta, (d) => d.file);
  }
  for (const presets of [["core"], ["core", "nestjs"]]) {
    // inline config honoured, as `ultracite check` does
    const eslint = await lib.eslintPreset({ cwd: dir, inline: true, presets });
    const results = await eslint.lintFiles(caseFiles);
    const meta = eslint.getRulesMetaForResults(results);
    const ds = results.flatMap((r) =>
      r.messages.map((m) => ({
        file: relative(dir, r.filePath),
        fix: m.fix ? "fix" : null,
        help: m.ruleId ? meta[m.ruleId]?.docs?.description : null,
        line: m.line,
        message: m.message,
        rule: m.ruleId ?? "parse",
        suggestions: (m.suggestions ?? []).map((s) => s.desc),
      }))
    );
    out[`eslint | ultracite ${presets.join("+")}`] = byCase(
      ds.filter((d) => TOPIC_RULE.test(d.rule) || d.rule === "parse"),
      (d) => d.file
    );
  }
  // Biome
  if (full) {
    for (const v of Object.keys(lib.BIOME_VARIANTS)) {
      const configDir = lib.biomeVariantConfig(lib.CONFIG_DIR, v);
      const ds = lib.runBiome({ configDir, cwd: dir, files: caseFiles });
      const notes = lib.biomeNotes({ configDir, cwd: dir, files: caseFiles });
      const noteAt = new Map(
        notes.map((n) => [`${n.file}:${n.line}:${n.rule}`, n.notes])
      );
      out[`biome | ${v}`] = byCase(
        ds.map((d) => ({
          ...d,
          help: (noteAt.get(`${d.file}:${d.line}:${d.rule}`) ?? []).join(" "),
        })),
        (d) => d.file
      );
    }
  }
  for (const presets of [["core"], ["core", "nestjs"]]) {
    const configDir = lib.biomePresetConfig(presets, { lintOnly: true });
    const ds = lib.runBiome({ configDir, cwd: dir, files: caseFiles });
    out[`biome | ultracite ${presets.join("+")}`] = byCase(
      ds.filter((d) => TOPIC_RULE.test(d.rule) || /^parse|syntax/.test(d.rule)),
      (d) => d.file
    );
  }
  return out;
};

// ── compiling and running ──────────────────────────────────────────────
const tscBin = join(
  dirname(require.resolve("typescript/package.json", { paths: [lib.CLI] })),
  "bin/tsc"
);
const runCase = (runDir, name) => {
  const r = lib.spawnSync(process.execPath, [join("cases", `${name}.js`)], {
    cwd: runDir,
    encoding: "utf8",
    timeout: 20_000,
  });
  const line = (r.stdout ?? "").trim().split("\n").filter(Boolean).at(-1);
  if (r.status === 0 && line) {
    try {
      return JSON.parse(line);
    } catch {
      // fall through
    }
  }
  const err =
    (r.stderr ?? "").split("\n").find((l) => /Error|error/.test(l)) ??
    `exit ${r.status}`;
  return { error: lib.scrub(err.trim()).slice(0, 240) };
};
const importsSummary = (code) =>
  code == null
    ? null
    : lib
        .importsOfJs(code)
        .map(
          (i) =>
            `${i.kind}${i.names.length ? ` {${i.names.join(",")}}` : ""} ${i.specifier}`
        );
const compileState = async (stateDir, label) => {
  const out = {};
  const sources = Object.fromEntries(
    allFiles().map((f) => [f, readFileSync(join(stateDir, f), "utf8")])
  );
  // the TypeScript program, per mode
  for (const [mode, flags] of Object.entries(MODES)) {
    const runDir = join(WORK, "run", label, `tsc-${mode}`);
    rmSync(runDir, { force: true, recursive: true });
    mkdirSync(runDir, { recursive: true });
    const tsconfig = join(stateDir, `tsconfig.${mode}.json`);
    writeFileSync(
      tsconfig,
      JSON.stringify({
        compilerOptions: {
          module: "esnext",
          moduleResolution: "bundler",
          noEmitOnError: false,
          outDir: runDir,
          rootDir: stateDir,
          skipLibCheck: true,
          strict: true,
          target: "es2022",
          types: ["node"],
          typeRoots: [join(lib.ULTRACITE, "node_modules/@types")],
          useDefineForClassFields: true,
          ...flags,
        },
        include: ["cases/*.ts", "cases/*.tsx", "lib/*.ts"],
      })
    );
    const r = lib.spawnSync(
      process.execPath,
      [tscBin, "-p", tsconfig, "--pretty", "false"],
      {
        cwd: stateDir,
        encoding: "utf8",
      }
    );
    writeFileSync(join(runDir, "package.json"), '{ "type": "module" }\n');
    const diags = {};
    for (const m of `${r.stdout}`.matchAll(
      /^cases\/(c\d+[^(]*)\.tsx?\((\d+),\d+\): error (TS\d+): (.*)$/gm
    )) {
      diags[m[1]] ??= [];
      diags[m[1]].push({ code: m[3], line: Number(m[2]), message: m[4] });
    }
    for (const f of CASE_FILES) {
      const name = caseName(f);
      const js = join(runDir, "cases", `${name}.js`);
      const code = existsSync(js) ? readFileSync(js, "utf8") : null;
      out[`tsc | ${mode}`] ??= {};
      out[`tsc | ${mode}`][name] = {
        diagnostics: diags[name] ?? [],
        imports: importsSummary(code),
        run: code == null ? { error: "no output" } : runCase(runDir, name),
      };
    }
  }
  // per-file compilers
  for (const [tool, mode, flags] of COMPILERS) {
    const runDir = join(WORK, "run", label, `${tool}-${mode}`);
    rmSync(runDir, { force: true, recursive: true });
    mkdirSync(join(runDir, "cases"), { recursive: true });
    mkdirSync(join(runDir, "lib"), { recursive: true });
    writeFileSync(join(runDir, "package.json"), '{ "type": "module" }\n');
    const results = {};
    for (const f of allFiles()) {
      const r = lib.compileOne(tool, sources[f], f.replace(/^.*\//, ""), flags);
      writeFileSync(
        join(runDir, f.replace(/\.tsx?$/, ".js")),
        r.code ?? "throw new Error('no output');\n"
      );
      results[f] = r;
    }
    out[`${tool} | ${mode}`] = {};
    for (const f of CASE_FILES) {
      const name = caseName(f);
      const r = results[`cases/${f}`];
      out[`${tool} | ${mode}`][name] = {
        compileError: r.error ?? null,
        imports: importsSummary(r.code),
        run: r.code == null ? { error: r.error } : runCase(runDir, name),
      };
    }
  }
  // Bun's transpiler, one batch
  {
    const runDir = join(WORK, "run", label, "bun");
    rmSync(runDir, { force: true, recursive: true });
    mkdirSync(join(runDir, "cases"), { recursive: true });
    mkdirSync(join(runDir, "lib"), { recursive: true });
    writeFileSync(join(runDir, "package.json"), '{ "type": "module" }\n');
    const items = allFiles().map((f) => ({
      file: f.replace(/^.*\//, ""),
      id: f,
      text: sources[f],
    }));
    const res = lib.bunCompile(items, { trim: true });
    for (const f of allFiles()) {
      writeFileSync(
        join(runDir, f.replace(/\.tsx?$/, ".js")),
        res.get(f)?.code ?? "throw new Error('no output');\n"
      );
    }
    out["bun | trimUnusedImports"] = {};
    for (const f of CASE_FILES) {
      const name = caseName(f);
      const r = res.get(`cases/${f}`);
      out["bun | trimUnusedImports"][name] = {
        compileError: r?.error ?? null,
        imports: importsSummary(r?.code ?? null),
        run: r?.code == null ? { error: r?.error } : runCase(runDir, name),
      };
    }
  }
  return out;
};

// ── fix passes ─────────────────────────────────────────────────────────
const FIXES = [
  ["oxlint", false],
  ["oxlint", true],
  ["eslint", false],
  ["biome", false],
  ["biome", true],
];
const diffCases = (stateDir) => {
  const out = {};
  for (const f of CASE_FILES) {
    const before = readFileSync(join(CAL, "cases", f), "utf8");
    const after = readFileSync(join(stateDir, "cases", f), "utf8");
    if (before !== after) {
      // only the import and export lines (the rest is the formatter's)
      const pick = (t) =>
        t
          .split("\n")
          .filter((l) => /^\s*(?:import|export|\} from|type )/.test(l));
      out[caseName(f)] = { after: pick(after), before: pick(before) };
    }
  }
  return out;
};

const main = async () => {
  await lib.loadCompilers();
  rmSync(WORK, { force: true, recursive: true });
  const out = {
    cases: CASE_FILES.map((f) => ({
      file: `cases/${f}`,
      summary: (
        readFileSync(join(CAL, "cases", f), "utf8")
          .split("\n")
          .find((l) => l.startsWith("//")) ?? ""
      ).replace(/^\/\/\s*/, ""),
    })),
    compilers: COMPILERS.map(([t, m, f]) => ({ flags: f, mode: m, tool: t })),
    generated: new Date().toISOString(),
    modes: MODES,
    tools: lib.toolVersions(),
  };
  const original = copyState(join(WORK, "state", "original"));
  out.lint = await lintAll(original);
  console.log("linted");
  out.compile = { original: await compileState(original, "original") };
  console.log("compiled the original");
  out.fixes = {};
  for (const [linter, unsafe] of FIXES) {
    const label = `${linter}${unsafe ? "-unsafe" : ""}`;
    const dir = copyState(join(WORK, "state", label));
    const presets = ["core"];
    const r = await lib.ultraciteFix({
      cwd: dir,
      files: allFiles(),
      linter,
      presets,
      unsafe,
    });
    out.fixes[label] = {
      changed: diffCases(dir),
      exit: r,
      lintAfter: await lintAll(dir, { full: false }),
    };
    out.compile[label] = await compileState(dir, label);
    console.log(`fixed with ${label}`);
  }
  lib.writeJson(join(lib.RESULTS_DIR, "calibration.json"), lib.scrubDeep(out));
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
