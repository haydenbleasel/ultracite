// The import-graph rules in Oxlint, ESLint and Biome, as Ultracite configures them.
//
//   --calibration  runs calibration/import-cycles/ (each case in its own directory, so cases can't
//                  reach each other) through
//                    Oxlint  the root config `ultracite init` writes: core + react, and core + react
//                            + js-plugins (sonarjs, react-doctor)
//                    ESLint  Ultracite's core preset, and core + react
//                    Biome   core + type-aware (where noImportCycles lives), and core alone
//                  and keeps every message, Oxlint help and note (the cycle path), and Biome's
//                  terminal advice, which its JSON reporter leaves out.
//   --autofix      runs each fix pass `ultracite fix` uses on copies of the cases (oxlint --fix and
//                  --fix-dangerously, eslint --fix, biome check --write and --write --unsafe),
//                  records what changed, and re-lints the cycle cases with the same linter.
//   --corpus       runs ESLint's import rules on each clone (cwd = clone root, as `ultracite check`
//                  would) and Biome's on a copy of the files the graph loaded plus every
//                  tsconfig/package.json (Biome's project rules need its config at the root), then
//                  compares every cycle report with the graph's prediction for that linter's edge
//                  model (import-cycles-graph.cjs), and the barrel and namespace rules with the
//                  graph's counts. Also runs Ultracite's Oxlint fix pass (oxlint --fix) on a copy
//                  of each repo and counts the no-cycle reports that remain.
//
// Usage (from the repo root):
//   node --max-old-space-size=12288 research/corpus/scripts/import-cycles-linters.cjs --calibration --autofix --corpus [--repos zod]
// Writes results/import-cycles/linters.json (merging the sections it ran).
"use strict";

const { execFileSync } = require("node:child_process");
const {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} = require("node:fs");
const { dirname, join, relative, sep } = require("node:path");

const ic = require("./import-cycles-lib.cjs");

const CAL = ic.CALIBRATION_DIR;
const CODE = /\.(?:[cm]?[jt]sx?)$/;

// ── calibration ────────────────────────────────────────────────────────
const caseOf = (file) => {
  const parts = file.split("/");
  if (parts[0] === "namespace") {
    return `namespace/${parts[1].replace(/\.[cm]?[jt]sx?$/, "")}`;
  }
  return `${parts[0]}/${parts[1]}`;
};

const eslintKeep = (rule) =>
  ic.isEslintImportRule(rule) || /^unicorn\/no-barrel-files$/.test(rule);
const oxlintKeep = (rule) =>
  /^(?:import\/|oxc\/no-barrel-file$|unicorn\/(?:prefer-export-from|import-style)$|sonarjs\/no-wildcard-import$|react-doctor\/no-barrel-import$|no-restricted-imports$|typescript\/(?:consistent-type-imports|no-import-type-side-effects)$)/.test(
    rule
  ) &&
  !/^import\/(?:newline-after-import|first|no-duplicates|consistent-type-specifier-style)$/.test(
    rule
  );
const biomeKeep = (rule) =>
  /(?:noImportCycles|noBarrelFile|noReExportAll|noNamespaceImport|noDynamicNamespaceImportAccess|noExportedImports|useImportType|useExportType)$/.test(
    rule
  );

const lintCalibration = async (dir) => {
  const files = ic.listFiles(dir).filter((f) => !f.endsWith(".d.ts"));
  const rows = [];
  for (const presets of [
    ["core", "react"],
    ["core", "react", "js-plugins"],
  ]) {
    const { diagnostics } = ic.runOxlintFull({
      configFile: ic.oxlintConfig(presets),
      cwd: dir,
      files,
      keep: oxlintKeep,
    });
    for (const d of diagnostics) {
      rows.push({ config: `oxlint ${presets.join("+")}`, ...d });
    }
  }
  for (const presets of [["core"], ["core", "react"]]) {
    const out = await ic.runEslint({
      cwd: dir,
      files,
      keep: eslintKeep,
      presets,
    });
    for (const d of out) {
      if (eslintKeep(d.rule) || d.rule.startsWith("parse")) {
        rows.push({ config: `eslint ${presets.join("+")}`, ...d });
      }
    }
  }
  const tmp = join(ic.BIOME_TMP, "calibration");
  rmSync(tmp, { force: true, recursive: true });
  cpSync(dir, tmp, { recursive: true });
  for (const mode of ["ultracite", "ultracite-core"]) {
    const { diagnostics } = ic.runBiomeProject({
      dir: tmp,
      keep: biomeKeep,
      mode,
    });
    const advices = ic.biomeProjectAdvices({ dir: tmp, mode });
    for (const d of diagnostics) {
      const a = advices.find(
        (x) => x.file === d.file && x.line === d.line && x.rule === d.rule
      );
      rows.push({
        config: mode === "ultracite" ? "biome core+type-aware" : "biome core",
        ...d,
        notes: a?.notes ?? [],
      });
    }
  }
  return rows.map((r) => ({ ...r, case: caseOf(r.file) }));
};

const calibration = async () => {
  const rows = await lintCalibration(CAL);
  const cases = [
    ...new Set(
      ic
        .listFiles(CAL)
        .filter((f) => !f.endsWith(".d.ts"))
        .map(caseOf)
    ),
  ].sort();
  const configs = [...new Set(rows.map((r) => r.config))];
  const matrix = cases.map((c) => {
    const hits = rows.filter((r) => r.case === c);
    return {
      case: c,
      ...Object.fromEntries(
        configs.map((cfg) => [
          cfg,
          [
            ...new Set(hits.filter((h) => h.config === cfg).map((h) => h.rule)),
          ].sort(),
        ])
      ),
      lines: hits
        .map((h) => `${h.config} ${h.rule} ${h.file}:${h.line}`)
        .sort(),
    };
  });
  const messages = {};
  for (const r of rows) {
    const key = `${r.config.split(" ")[0]} ${r.rule}`;
    messages[key] ??= new Set();
    messages[key].add(
      JSON.stringify({
        help: r.help ?? undefined,
        message: (r.message ?? "").replace(/"\.\/[^"]*"/g, '"…"'),
        notes: r.notes?.length ? r.notes : undefined,
        suggestions: r.suggestions?.length ? r.suggestions : undefined,
      })
    );
  }
  const notes = rows
    .filter(
      (r) => r.rule === "import/no-cycle" && r.config === "oxlint core+react"
    )
    .map((r) => ({ file: r.file, line: r.line, note: r.note }));
  return {
    configs,
    diagnostics: rows,
    matrix,
    messages: Object.fromEntries(
      Object.entries(messages).map(([k, v]) => [
        k,
        [...v].map((x) => JSON.parse(x)).slice(0, 6),
      ])
    ),
    oxlintCycleNotes: notes,
  };
};

// ── fix passes ─────────────────────────────────────────────────────────
const snapshot = (dir) =>
  new Map(
    ic.listFiles(dir).map((f) => [f, readFileSync(join(dir, f), "utf8")])
  );
const diffSnapshots = (before, after) => {
  const changed = [];
  for (const [f, text] of after) {
    const old = before.get(f);
    if (old !== text) {
      const a = new Set((old ?? "").split("\n"));
      const b = new Set(text.split("\n"));
      changed.push({
        added: [...b].filter((l) => !a.has(l) && l.trim()),
        file: f,
        removed: [...a].filter((l) => !b.has(l) && l.trim()),
      });
    }
  }
  for (const f of before.keys()) {
    if (!after.has(f)) {
      changed.push({ deleted: true, file: f });
    }
  }
  return changed;
};

const cycleRules = (rows) =>
  rows
    .filter((r) => /no-cycle|noImportCycles/.test(r.rule))
    .map((r) => `${r.file}:${r.line}`)
    .sort();

const autofix = async () => {
  const out = {};
  const base = join(ic.BIOME_TMP, "autofix");
  const files = ic.listFiles(CAL).filter((f) => !f.endsWith(".d.ts"));
  const passes = {
    "biome check --write": (dir) => {
      ic.writeBiomeRootConfig(dir, "ultracite");
      try {
        execFileSync(
          process.execPath,
          [ic.biomeBin, "check", "--write", "--formatter-enabled=false", "."],
          { cwd: dir, stdio: "pipe" }
        );
      } catch {
        // exits non-zero when diagnostics remain
      }
    },
    "biome check --write --unsafe": (dir) => {
      ic.writeBiomeRootConfig(dir, "ultracite");
      try {
        execFileSync(
          process.execPath,
          [
            ic.biomeBin,
            "check",
            "--write",
            "--unsafe",
            "--formatter-enabled=false",
            ".",
          ],
          { cwd: dir, stdio: "pipe" }
        );
      } catch {
        // exits non-zero when diagnostics remain
      }
    },
    "eslint --fix": async (dir) => {
      const { ESLint } = require(
        require.resolve("eslint", { paths: [ic.CLI] })
      );
      const blocks = await ic.eslintBlocks({ presets: ["core"] });
      const eslint = new ESLint({
        cwd: dir,
        errorOnUnmatchedPattern: false,
        fix: true,
        ignore: false,
        overrideConfig: [
          ...blocks,
          { linterOptions: { reportUnusedDisableDirectives: "off" } },
        ],
        overrideConfigFile: true,
      });
      await ESLint.outputFixes(await eslint.lintFiles(files));
    },
    "oxlint --fix": (dir) => {
      try {
        execFileSync(
          process.execPath,
          [
            ic.oxlintBin,
            "-c",
            ic.oxlintConfig(["core", "react"]),
            "--disable-nested-config",
            "--fix",
            ...files,
          ],
          { cwd: dir, stdio: "pipe" }
        );
      } catch {
        // exits non-zero when diagnostics remain
      }
    },
    "oxlint --fix-dangerously": (dir) => {
      try {
        execFileSync(
          process.execPath,
          [
            ic.oxlintBin,
            "-c",
            ic.oxlintConfig(["core", "react"]),
            "--disable-nested-config",
            "--fix-dangerously",
            ...files,
          ],
          { cwd: dir, stdio: "pipe" }
        );
      } catch {
        // exits non-zero when diagnostics remain
      }
    },
  };
  const relint = async (pass, dir) => {
    if (pass.startsWith("oxlint")) {
      return cycleRules(
        ic.runOxlintFull({
          configFile: ic.oxlintConfig(["core", "react"]),
          cwd: dir,
          files,
          keep: (r) => r === "import/no-cycle",
        }).diagnostics
      );
    }
    if (pass.startsWith("eslint")) {
      return cycleRules(
        await ic.runEslint({
          cwd: dir,
          files,
          keep: (r) => r === "import-x/no-cycle",
          presets: ["core"],
        })
      );
    }
    return cycleRules(
      ic.runBiomeProject({
        dir,
        keep: (r) => r.endsWith("noImportCycles"),
        mode: "ultracite",
      }).diagnostics
    );
  };
  for (const [pass, run] of Object.entries(passes)) {
    // ESLint finds its resolver packages from the project directory, so its copy stays inside the
    // repo; Biome's preset ignores `**/out`, so its copy goes to the temp directory.
    const dir = join(
      pass.startsWith("biome") ? base : join(ic.OUT_DIR, "autofix"),
      pass.replace(/[^a-z]+/g, "-")
    );
    rmSync(dir, { force: true, recursive: true });
    cpSync(CAL, dir, { recursive: true });
    rmSync(join(dir, "biome.json"), { force: true });
    const before = snapshot(dir);
    const cyclesBefore = await relint(pass, dir);
    await run(dir);
    rmSync(join(dir, "biome.json"), { force: true });
    const after = snapshot(dir);
    const cyclesAfter = await relint(pass, dir);
    out[pass] = {
      changed: diffSnapshots(before, after),
      cyclesAfter: cyclesAfter.length,
      cyclesBefore: cyclesBefore.length,
      cyclesCleared: cyclesBefore.filter((x) => !cyclesAfter.includes(x)),
      cyclesNew: cyclesAfter.filter((x) => !cyclesBefore.includes(x)),
    };
    console.log(
      `${pass}: ${out[pass].changed.length} files changed; cycles ${cyclesBefore.length} -> ${cyclesAfter.length}`
    );
  }
  return out;
};

// ── corpus ─────────────────────────────────────────────────────────────
const keyOf = (file, line) => `${file}:${line}`;

const configFilesIn = (root) => {
  const out = [];
  const visit = (dir, depth) => {
    if (depth > 6) {
      return;
    }
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (
        e.isSymbolicLink() ||
        e.name === "node_modules" ||
        e.name === ".git"
      ) {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        visit(abs, depth + 1);
      } else if (
        /^(?:tsconfig.*\.json|jsconfig\.json|package\.json)$/.test(e.name)
      ) {
        out.push(relative(root, abs).split(sep).join("/"));
      }
    }
  };
  visit(root, 0);
  return out;
};

const predictFor = (detail, model) => {
  // statements of measured files whose edge is in `model` and inside a component of that model
  const comps = detail.components[model];
  const compOf = new Map();
  comps.forEach((c, i) => {
    for (const f of c) {
      compOf.set(f, i);
    }
  });
  const STATIC = new Set([
    "import",
    "namespace",
    "side-effect",
    "export-named",
    "export-star",
    "export-star-as",
    "import-equals",
  ]);
  const inModel = {
    biome: (s) =>
      (STATIC.has(s.kind) ||
        ["dynamic", "require", "require-lazy"].includes(s.kind)) &&
      s.typeOnly === "none",
    eslint: (s) =>
      (STATIC.has(s.kind) || s.kind === "dynamic") && s.typeOnly === "none",
  }[model];
  const out = new Map();
  for (const s of detail.statements) {
    if (!s.measured || !s.target || s.target === s.file || !inModel(s)) {
      continue;
    }
    const c = compOf.get(s.file);
    if (c !== undefined && c === compOf.get(s.target)) {
      out.set(keyOf(s.file, s.specLine), s);
    }
  }
  return out;
};

// eslint-plugin-import-x 4.17.1's no-cycle, step by step (lib/rules/no-cycle.js and
// lib/utils/export-map.js):
//   importers  every ImportDeclaration, `export … from`, `export *` and import() in the file, in
//              source order; an ImportDeclaration is skipped when it's `import type` or every
//              specifier is `type` (so also when it has no specifiers: side-effect imports and
//              `import {} from`)
//   edges      ExportMap dependencies: imports (type-only ones not followed), `export … from`
//              (followed even when `export type`), `export *` (not followed when `export type *`),
//              import() (followed); `export * as ns` is not a dependency; require() isn't either
//   search     breadth-first from the imported module; the set of visited modules is shared by
//              every importer in the file and cleared only at the end of the file, so an importer
//              whose path back runs through modules an earlier importer already visited is not
//              reported
//   report     at the importer's node (the statement's first line)
const simulateImportX = (detail) => {
  const byFile = new Map();
  for (const s of detail.statements) {
    if (!byFile.has(s.file)) {
      byFile.set(s.file, []);
    }
    byFile.get(s.file).push(s);
  }
  const edgeKinds = new Set([
    "import",
    "namespace",
    "side-effect",
    "export-named",
    "export-star",
    "dynamic",
  ]);
  const deps = new Map();
  const depsOf = (file) => {
    let d = deps.get(file);
    if (d) {
      return d;
    }
    d = new Map(); // target -> followed?
    for (const s of byFile.get(file) ?? []) {
      if (!s.target || !edgeKinds.has(s.kind)) {
        continue;
      }
      let followed = true;
      if (["import", "namespace", "side-effect"].includes(s.kind)) {
        followed = s.typeOnly === "none";
      } else if (s.kind === "export-star") {
        followed = s.typeOnly !== "decl";
      }
      d.set(s.target, Boolean(d.get(s.target)) || followed);
    }
    deps.set(file, d);
    return d;
  };
  const reported = new Map();
  for (const [file, rows] of byFile) {
    if (!rows.some((s) => s.measured)) {
      continue;
    }
    const traversed = new Set();
    const importers = rows
      .filter((s) =>
        [
          "import",
          "namespace",
          "side-effect",
          "export-named",
          "export-star",
          "export-star-as",
          "dynamic",
        ].includes(s.kind)
      )
      .sort((a, b) => a.pos - b.pos);
    for (const s of importers) {
      const isImportDecl = ["import", "namespace", "side-effect"].includes(
        s.kind
      );
      if (
        isImportDecl &&
        (s.typeOnly !== "none" || s.kind === "side-effect" || s.emptyNamed)
      ) {
        continue;
      }
      if (!s.target || s.target === file) {
        continue;
      }
      const queue = [s.target];
      let found = false;
      while (queue.length > 0 && !found) {
        const m = queue.shift();
        if (traversed.has(m)) {
          continue;
        }
        traversed.add(m);
        for (const [path, followed] of depsOf(m)) {
          if (traversed.has(path)) {
            continue;
          }
          if (path === file && followed) {
            found = true;
            break;
          }
          if (followed) {
            queue.push(path);
          }
        }
      }
      if (found) {
        reported.set(keyOf(s.file, s.line), s);
      }
    }
  }
  return reported;
};

// Biome reports every import statement whose target is in the cycle, including an `import type`
// of a module the file also imports by value.
const predictBiome = (detail) => {
  const pred = predictFor(detail, "biome");
  const STATIC = new Set([
    "import",
    "namespace",
    "side-effect",
    "export-named",
    "export-star",
    "export-star-as",
  ]);
  const pairs = new Set(
    [...pred.values()]
      .filter((s) => STATIC.has(s.kind))
      .map((s) => `${s.file}\0${s.target}`)
  );
  for (const s of detail.statements) {
    if (
      s.measured &&
      s.target &&
      pairs.has(`${s.file}\0${s.target}`) &&
      s.typeOnly !== "none"
    ) {
      pred.set(keyOf(s.file, s.specLine), s);
    }
  }
  return pred;
};

const explain = (detail, s) => {
  // why a predicted report is missing, from the statement and the path
  if (!s) {
    return "no statement";
  }
  if (s.kind === "dynamic") {
    return "dynamic import edge";
  }
  if (s.kind.startsWith("require")) {
    return "require edge";
  }
  if (s.how !== "resolved") {
    return `target resolved by ${s.how} mapping`;
  }
  if (!s.specifier.startsWith(".")) {
    return "path alias";
  }
  if (/^\.\.?\/?$|\/\.\.?$/.test(s.specifier)) {
    return "directory import";
  }
  return "relative import";
};

// For a predicted report the linter didn't make: is the file still in a cycle with the target when
// the model's graph keeps only plain relative edges (no path alias, workspace name or `..`/`.`
// directory import)? If not, the linter missed it because it didn't resolve one of those edges.
const needsUnresolvedEdge = (detail, model) => {
  const STATIC = new Set([
    "import",
    "namespace",
    "side-effect",
    "export-named",
    "export-star",
    "export-star-as",
  ]);
  const inModel = {
    biome: (s) =>
      (STATIC.has(s.kind) ||
        ["dynamic", "require", "require-lazy"].includes(s.kind)) &&
      s.typeOnly === "none",
    eslint: (s) =>
      (STATIC.has(s.kind) || s.kind === "dynamic") && s.typeOnly === "none",
  }[model];
  const plain = (s) =>
    s.specifier.startsWith(".") &&
    !/^\.\.?\/?$|\/\.\.?\/?$/.test(s.specifier) &&
    s.how === "resolved";
  const succ = new Map();
  for (const s of detail.statements) {
    if (s.target && inModel(s) && plain(s)) {
      if (!succ.has(s.file)) {
        succ.set(s.file, new Set());
      }
      succ.get(s.file).add(s.target);
    }
  }
  const nodes = [...new Set(detail.statements.map((s) => s.file))].sort();
  const comp = new Map();
  ic.scc(nodes, (v) => [...(succ.get(v) ?? [])].filter((w) => w !== v).sort())
    .filter((c) => c.length > 1)
    .forEach((c, i) => {
      for (const f of c) {
        comp.set(f, i);
      }
    });
  return (s) =>
    !plain(s) || !(comp.has(s.file) && comp.get(s.file) === comp.get(s.target));
};

const corpus = async () => {
  const result = {};
  for (const name of ic.EXTERNAL.filter(
    (n) => ic.only().length === 0 || ic.only().includes(n)
  )) {
    const detailPath = join(ic.OUT_DIR, "graph", `${name}.json`);
    if (!existsSync(detailPath)) {
      console.log(
        `${name}: no graph detail, run import-cycles-graph.cjs first`
      );
      continue;
    }
    const detail = ic.readJson(detailPath);
    const { repo, files } = ic.collect(name);
    const root = repo.root;
    const row = {};

    // ESLint on the clone
    let started = Date.now();
    // import-x/no-cycle's result depends on what the process linted before: Excalidraw gives 241
    // reports in a fresh process and 222 after the same process has linted another repo (the
    // resolver's caches outlive the change of directory; eslintStateExperiment). So each repo gets
    // a fresh process started in the clone root, as `ultracite check` runs.
    started = Date.now();
    const eslintRows = JSON.parse(
      execFileSync(
        process.execPath,
        ["--max-old-space-size=8192", __filename, "--eslint-child", name],
        {
          cwd: root,
          encoding: "utf8",
          maxBuffer: 1 << 30,
          stdio: ["ignore", "pipe", "ignore"],
        }
      )
    );
    row.eslintSeconds = Math.round((Date.now() - started) / 100) / 10;
    const eslintCounts = {};
    for (const d of eslintRows) {
      eslintCounts[d.rule] = (eslintCounts[d.rule] ?? 0) + 1;
    }
    row.eslintCounts = eslintCounts;
    const eslintCycle = new Map(
      eslintRows
        .filter((d) => d.rule === "import-x/no-cycle")
        .map((d) => [keyOf(d.file, d.line), d])
    );
    const eslintPred = simulateImportX(detail);
    const eslintModelPred = predictFor(detail, "eslint");
    row.eslintModel = {
      predicted: eslintModelPred.size,
      reportedOfModel: [...eslintModelPred.values()].filter((s) =>
        eslintCycle.has(keyOf(s.file, s.line))
      ).length,
    };
    row.eslintCycle = {
      actual: eslintCycle.size,
      matched: [...eslintCycle.keys()].filter((k) => eslintPred.has(k)).length,
      missed: [...eslintPred.entries()]
        .filter(([k]) => !eslintCycle.has(k))
        .map(([k, s]) => ({
          at: k,
          kind: s.kind,
          reason: explain(detail, s),
          specifier: s.specifier,
          to: s.target,
        })),
      predicted: eslintPred.size,
      unpredicted: [...eslintCycle.entries()]
        .filter(([k]) => !eslintPred.has(k))
        .map(([k, d]) => ({ at: k, message: d.message })),
    };
    const parseErrors = eslintRows.filter((d) => d.rule.startsWith("parse"));
    row.eslintParseErrors = parseErrors.length;

    // Biome on a copy of everything the graph loaded
    const loaded = new Set();
    for (const s of detail.statements) {
      loaded.add(s.file);
      if (s.target) {
        loaded.add(s.target);
      }
    }
    for (const f of files) {
      loaded.add(f);
    }
    const mirror = join(ic.BIOME_TMP, "mirror", name);
    const copyList = [...loaded].filter(
      (f) => existsSync(join(root, f)) && statSync(join(root, f)).isFile()
    );
    ic.copyTree(
      root,
      mirror,
      [...copyList, ...configFilesIn(root)],
      ic.neutralise
    );
    started = Date.now();
    const biome = ic.runBiomeProject({
      dir: mirror,
      files,
      keep: (r) => ic.BIOME_RULE_NAMES.has(r),
      mode: "rules",
    });
    row.biomeSeconds = Math.round((Date.now() - started) / 100) / 10;
    const biomeCounts = {};
    for (const d of biome.diagnostics) {
      biomeCounts[d.rule] = (biomeCounts[d.rule] ?? 0) + 1;
    }
    row.biomeCounts = biomeCounts;
    const biomeCycle = new Map(
      biome.diagnostics
        .filter((d) => d.rule.endsWith("noImportCycles"))
        .map((d) => [keyOf(d.file, d.line), d])
    );
    const biomePred = predictBiome(detail);
    const biomeNeeds = needsUnresolvedEdge(detail, "biome");
    row.biomeCycle = {
      actual: biomeCycle.size,
      matched: [...biomeCycle.keys()].filter((k) => biomePred.has(k)).length,
      missed: [...biomePred.entries()]
        .filter(([k]) => !biomeCycle.has(k))
        .map(([k, s]) => ({
          at: k,
          kind: s.kind,
          needsAliasOrDirectoryEdge: biomeNeeds(s),
          reason: explain(detail, s),
          specifier: s.specifier,
          to: s.target,
        })),
      predicted: biomePred.size,
      unpredicted: [...biomeCycle.keys()].filter((k) => !biomePred.has(k)),
    };
    // barrels and namespaces
    const barrelsByFile = new Map(detail.barrels.map((b) => [b.file, b]));
    const biomeBarrel = new Set(
      biome.diagnostics
        .filter((d) => d.rule.endsWith("noBarrelFile"))
        .map((d) => d.file)
    );
    const predictedBiomeBarrel = new Set(
      detail.barrels.filter((b) => b.biomePredicted).map((b) => b.file)
    );
    row.biomeBarrel = {
      actual: biomeBarrel.size,
      byTier: detail.barrels
        .filter((b) => biomeBarrel.has(b.file))
        .reduce((acc, b) => {
          const k = b.tier ?? "some-reexports";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      entries: [...biomeBarrel].filter((f) => barrelsByFile.get(f)?.entry)
        .length,
      missed: [...predictedBiomeBarrel].filter((f) => !biomeBarrel.has(f)),
      predicted: predictedBiomeBarrel.size,
      unpredicted: [...biomeBarrel].filter((f) => !predictedBiomeBarrel.has(f)),
    };
    const unicornBarrel = new Set(
      eslintRows
        .filter((d) => d.rule === "unicorn/no-barrel-files")
        .map((d) => d.file)
    );
    row.unicornBarrel = {
      actual: unicornBarrel.size,
      byTier: detail.barrels
        .filter((b) => unicornBarrel.has(b.file))
        .reduce((acc, b) => {
          const k = b.tier ?? "some-reexports";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      entries: [...unicornBarrel].filter((f) => barrelsByFile.get(f)?.entry)
        .length,
      notInBarrelList: [...unicornBarrel].filter((f) => !barrelsByFile.has(f)),
      pureNotReported: detail.barrels
        .filter((b) => b.tier === "pure" && !unicornBarrel.has(b.file))
        .map((b) => b.file),
    };
    const nsValue = detail.namespaces.filter((n) => !n.importType);
    row.namespace = {
      biomeNoNamespaceImport: biomeCounts["performance/noNamespaceImport"] ?? 0,
      graphImportTypeNamespace: detail.namespaces.length - nsValue.length,
      graphValueNamespace: nsValue.length,
      sonarWildcard: eslintCounts["sonarjs/no-wildcard-import"] ?? 0,
      graphWildcardStatements:
        detail.namespaces.length +
        detail.barrels.reduce((s, b) => s + b.exportStar + b.exportStarAs, 0) +
        detail.statements.filter(
          (s) =>
            s.measured &&
            ["export-star", "export-star-as"].includes(s.kind) &&
            s.typeOnly !== "none"
        ).length,
    };
    result[name] = row;
    console.log(
      `${name}: eslint no-cycle ${row.eslintCycle.actual} (pred ${row.eslintCycle.predicted}, matched ${row.eslintCycle.matched}, missed ${row.eslintCycle.missed.length}, unpred ${row.eslintCycle.unpredicted.length}) ${row.eslintSeconds}s; biome noImportCycles ${row.biomeCycle.actual} (pred ${row.biomeCycle.predicted}, matched ${row.biomeCycle.matched}, missed ${row.biomeCycle.missed.length}, unpred ${row.biomeCycle.unpredicted.length}) ${row.biomeSeconds}s; noBarrelFile ${row.biomeBarrel.actual}/${row.biomeBarrel.predicted}; unicorn ${row.unicornBarrel.actual}; ns biome ${row.namespace.biomeNoNamespaceImport}/${row.namespace.graphValueNamespace} sonar ${row.namespace.sonarWildcard}/${row.namespace.graphWildcardStatements}`
    );
  }
  return result;
};

// Ultracite's own Oxlint fix pass on a copy of each repo, then no-cycle again.
const fixPassCorpus = () => {
  const result = {};
  for (const name of ic.EXTERNAL.filter(
    (n) => ic.only().length === 0 || ic.only().includes(n)
  )) {
    const detailPath = join(ic.OUT_DIR, "graph", `${name}.json`);
    if (!existsSync(detailPath)) {
      continue;
    }
    const detail = ic.readJson(detailPath);
    const { repo, files } = ic.collect(name);
    const loaded = new Set(files);
    for (const s of detail.statements) {
      loaded.add(s.file);
      if (s.target) {
        loaded.add(s.target);
      }
    }
    const dir = join(ic.BIOME_TMP, "fixpass", name);
    const copyList = [...loaded].filter(
      (f) =>
        existsSync(join(repo.root, f)) && statSync(join(repo.root, f)).isFile()
    );
    ic.copyTree(repo.root, dir, [...copyList, ...configFilesIn(repo.root)]);
    const config = ic.oxlintConfig(["core", "react"]);
    const lint = () =>
      ic.runOxlintFull({
        configFile: config,
        cwd: dir,
        files,
        keep: (r) => r === "import/no-cycle",
      }).diagnostics;
    const before = lint();
    const snap = snapshot(dir);
    for (let i = 0; i < files.length; i += 400) {
      try {
        execFileSync(
          process.execPath,
          [
            ic.oxlintBin,
            "-c",
            config,
            "--disable-nested-config",
            "--fix",
            ...files.slice(i, i + 400),
          ],
          { cwd: dir, stdio: "pipe", maxBuffer: 1 << 28 }
        );
      } catch {
        // non-zero exit when diagnostics remain
      }
    }
    const changed = diffSnapshots(snap, snapshot(dir));
    const typeImportLines = changed.flatMap((c) =>
      (c.added ?? []).filter((l) =>
        /^\s*import type\b|^\s*export type\b/.test(l)
      )
    ).length;
    const after = lint();
    result[name] = {
      after: after.length,
      before: before.length,
      filesChanged: changed.length,
      typeImportLinesAdded: typeImportLines,
    };
    console.log(
      `${name}: oxlint --fix: no-cycle ${before.length} -> ${after.length} (${changed.length} files changed, ${typeImportLines} import type lines added)`
    );
  }
  return result;
};

const eslintChild = async (name) => {
  const { repo, files } = ic.collect(name);
  const rows = await ic.runEslint({
    cwd: repo.root,
    files,
    keep: eslintKeep,
    presets: ["core"],
  });
  process.stdout.write(JSON.stringify(rows));
};

// Runs several ESLint passes in one process (`repo:subset` steps) and prints the no-cycle count of
// each: the process-state experiment.
const SUBSETS = {
  all: () => true,
  "math-common": (f) => /packages\/(?:math|common)\//.test(f),
};
const eslintSequence = async (steps) => {
  const counts = [];
  for (const step of steps) {
    const [name, subset] = step.split(":");
    const { repo, files } = ic.collect(name);
    process.chdir(repo.root);
    const rows = await ic.runEslint({
      cwd: repo.root,
      files: files.filter(SUBSETS[subset]),
      keep: (r) => r === "import-x/no-cycle",
      presets: ["core"],
    });
    counts.push({
      noCycle: rows.filter((r) => r.rule === "import-x/no-cycle").length,
      step,
    });
  }
  process.stdout.write(JSON.stringify(counts));
};

const eslintStateExperiment = () => {
  const run = (steps, startIn) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--max-old-space-size=8192",
          __filename,
          "--eslint-sequence",
          steps.join(","),
        ],
        {
          cwd: ic.getRepo(startIn).root,
          encoding: "utf8",
          maxBuffer: 1 << 28,
          stdio: ["ignore", "pipe", "ignore"],
        }
      )
    );
  const out = {
    "excalidraw alone": run(["excalidraw:all"], "excalidraw"),
    "excalidraw math+common first, then all, then all again": run(
      ["excalidraw:math-common", "excalidraw:all", "excalidraw:all"],
      "excalidraw"
    ),
    "zod, then excalidraw": run(["zod:all", "excalidraw:all"], "zod"),
    "zod alone, process started in zod": run(["zod:all"], "zod"),
    "zod alone, process started in excalidraw": run(["zod:all"], "excalidraw"),
  };
  console.log(`eslint state experiment: ${JSON.stringify(out)}`);
  return out;
};

// `ultracite fix --unsafe` with Oxlint runs `oxlint --fix-dangerously`. Calibration case b06 showed
// unicorn/prefer-export-from's dangerous fix dropping a name from `export { a, b }`. This applies
// that rule's fix alone, once, to a copy of each repo and compares every changed file's exported
// names (syntactically) before and after.
const exportedNames = (file, text) => {
  const sf = ic.ts.createSourceFile(
    file,
    text,
    ic.ts.ScriptTarget.ESNext,
    true
  );
  const names = new Set();
  for (const st of sf.statements) {
    const mods = ic.ts.canHaveModifiers(st)
      ? (ic.ts.getModifiers(st) ?? [])
      : [];
    const exported = mods.some(
      (m) => m.kind === ic.ts.SyntaxKind.ExportKeyword
    );
    const isDefault = mods.some(
      (m) => m.kind === ic.ts.SyntaxKind.DefaultKeyword
    );
    if (ic.ts.isExportDeclaration(st)) {
      if (!st.exportClause) {
        names.add(`* from ${st.moduleSpecifier?.text}`);
      } else if (ic.ts.isNamespaceExport(st.exportClause)) {
        names.add(st.exportClause.name.text);
      } else {
        for (const el of st.exportClause.elements) {
          names.add(el.name.text);
        }
      }
    } else if (ic.ts.isExportAssignment(st)) {
      names.add("default");
    } else if (exported) {
      if (isDefault) {
        names.add("default");
      } else if (ic.ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ic.ts.isIdentifier(d.name)) {
            names.add(d.name.text);
          }
        }
      } else if (st.name && ic.ts.isIdentifier(st.name)) {
        names.add(st.name.text);
      }
    }
  }
  return names;
};

const preferExportFromDanger = () => {
  const result = {};
  const configDir = join(ic.OUT_DIR, "configs");
  mkdirSync(configDir, { recursive: true });
  const config = join(configDir, "prefer-export-from.json");
  require("node:fs").writeFileSync(
    config,
    JSON.stringify({
      plugins: ["unicorn"],
      rules: { "unicorn/prefer-export-from": "error" },
    })
  );
  for (const name of ic.EXTERNAL.filter(
    (n) => ic.only().length === 0 || ic.only().includes(n)
  )) {
    const { repo, files } = ic.collect(name);
    const dir = join(ic.OUT_DIR, "prefer-export-from", name);
    ic.copyTree(repo.root, dir, files);
    const before = snapshot(dir);
    for (let i = 0; i < files.length; i += 400) {
      try {
        execFileSync(
          process.execPath,
          [
            ic.oxlintBin,
            "-c",
            config,
            "--disable-nested-config",
            "--fix-dangerously",
            ...files.slice(i, i + 400),
          ],
          { cwd: dir, stdio: "pipe" }
        );
      } catch {
        // non-zero exit when diagnostics remain
      }
    }
    const after = snapshot(dir);
    const changed = diffSnapshots(before, after);
    const lost = [];
    for (const c of changed) {
      const a = exportedNames(c.file, before.get(c.file));
      const b = exportedNames(c.file, after.get(c.file) ?? "");
      const missing = [...a].filter((x) => !b.has(x));
      if (missing.length > 0) {
        lost.push({ file: c.file, missing });
      }
    }
    result[name] = {
      filesChanged: changed.length,
      filesLosingExports: lost.length,
      lost: lost.slice(0, 20),
      namesLost: lost.reduce((n, l) => n + l.missing.length, 0),
    };
    console.log(
      `${name}: prefer-export-from --fix-dangerously changed ${changed.length} files; ${lost.length} lost exports (${result[name].namesLost} names)`
    );
  }
  return result;
};

const main = async () => {
  if (ic.flag("eslint-sequence")) {
    await eslintSequence(ic.arg("eslint-sequence").split(","));
    return;
  }
  if (ic.flag("eslint-child")) {
    await eslintChild(ic.arg("eslint-child"));
    return;
  }
  const path = join(ic.RESULTS_DIR, "linters.json");
  const out = ic.readJson(path, {});
  out.generated = new Date().toISOString().slice(0, 10);
  out.tools = ic.toolVersions();
  out.note = "See the header of import-cycles-linters.cjs.";
  if (ic.flag("calibration")) {
    out.calibration = await calibration();
    console.log(
      `calibration: ${out.calibration.diagnostics.length} diagnostics`
    );
  }
  if (ic.flag("autofix")) {
    out.autofix = await autofix();
  }
  if (ic.flag("corpus") || ic.flag("eslint-state")) {
    out.eslintState = eslintStateExperiment();
  }
  if (ic.flag("corpus")) {
    out.preferExportFromDanger = preferExportFromDanger();
    out.corpus = { ...(out.corpus ?? {}), ...(await corpus()) };
    out.fixPass = { ...(out.fixPass ?? {}), ...fixPassCorpus() };
  }
  ic.writeJson(path, out);
  void dirname;
  void mkdirSync;
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
