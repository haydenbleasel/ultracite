// The calibration: the hand-written cases in calibration/func-style/ (one file each) through every
// linter configuration this topic measures, the TypeScript compiler and Node:
//
//   Oxlint     each rule alone (func-style-linters.cjs's passes: Ultracite's func-style and the
//              "declaration" variants; no-use-before-define at its defaults, "nofunc" and
//              same-context only; func-names, prefer-arrow-callback, arrow-body-style,
//              unicorn/consistent-function-scoping), and the root config `ultracite init` writes
//              (core; core + react for .tsx), keeping the topic's rules
//   ESLint     the census pass (func-style-lib.cjs, every alias), and Ultracite's own ESLint core
//              preset (+ react for .tsx), keeping the topic's rules
//   Biome      each rule alone (the same passes as the corpus), and the core preset (+ react)
//   tsc        strict, one program per case; the codes that bear on order and conversion
//   Node       the case transpiled (ts.transpileModule) and imported in a fresh process: its
//              exports, or the error it throws at import
//   converted  every declaration converted as func-style-convert.cjs converts it, then the
//              linters, tsc and Node again
//   fixes      what each linter's fix pass does to the cases (oxlint --fix / --fix-dangerously,
//              ESLint's fixes, biome --write / --write --unsafe)
//
// The cases are this repo's own hand-written files, so running them is safe.
//
// Usage: node research/corpus/scripts/func-style-calibration.cjs
// Writes results/func-style/calibration.json.
"use strict";

const {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./func-style-lib.cjs");
const { conversionOf } = require("./func-style-census.cjs");
const conv = require("./func-style-convert.cjs");

const ts = lib.dc.ts;
const WORK = join(lib.TMP, "calibration");
const CONFIGS = join(lib.TMP, "configs-calibration");

const TOPIC_RULE =
  /^(?:func-style|no-use-before-define|typescript\/no-use-before-define|@typescript-eslint\/no-use-before-define|func-names|func-name-matching|prefer-arrow-callback|arrow-body-style|unicorn\/consistent-function-scoping|no-inner-declarations|no-func-assign|react\/function-component-definition|.*useArrowFunction|.*noInvalidUseBeforeDeclaration|.*useConsistentArrowReturn|.*useConsistentFunctionStyle|.*useNamedFunction|.*noInnerDeclarations|.*noFunctionAssign|.*useReactFunctionComponentDefinition)$/;
const TSC_CODES = new Set([
  2300, 2339, 2366, 2391, 2448, 2449, 2450, 2451, 2454, 2474, 2683, 2775, 2814,
  7022, 7023, 7024, 7041,
]);

const OXLINT_PASSES = {
  a: {
    "arrow-body-style": ["error", "as-needed"],
    "func-names": "error",
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
    "no-use-before-define": "error",
    "prefer-arrow-callback": "error",
    "unicorn/consistent-function-scoping": "error",
  },
  b: {
    "func-style": ["error", "declaration"],
    "no-use-before-define": ["error", "nofunc"],
  },
  c: {
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "no-use-before-define": [
      "error",
      {
        classes: false,
        enums: false,
        functions: false,
        typedefs: false,
        variables: false,
      },
    ],
  },
};
const BIOME_PASSES = {
  a: {
    complexity: { useArrowFunction: "error" },
    correctness: { noInvalidUseBeforeDeclaration: "error" },
    nursery: {
      useConsistentFunctionStyle: {
        level: "error",
        options: { style: "expression" },
      },
      useNamedFunction: "error",
    },
    style: { useConsistentArrowReturn: "error" },
  },
  b: {
    nursery: {
      useConsistentFunctionStyle: {
        level: "error",
        options: { style: "declaration" },
      },
    },
  },
  c: {
    nursery: {
      useConsistentFunctionStyle: {
        level: "error",
        options: { allowArrowFunctions: true, style: "declaration" },
      },
    },
  },
};
const PASS_NAME = {
  a: "",
  b: ":declaration/nofunc",
  c: ":declaration+arrows/same-context",
};

// ── runners ────────────────────────────────────────────────────────────
const oxlintPass = (dir, files, pass) => {
  const cfg = lib.writeOxlintRules(
    CONFIGS,
    `cal-${pass}`,
    OXLINT_PASSES[pass],
    {
      plugins: ["eslint", "unicorn"],
    }
  );
  return lib.runOxlint({ configFile: cfg, cwd: dir, files }).map((d) => ({
    ...d,
    view: `oxlint/${d.rule}${PASS_NAME[pass]}`,
  }));
};
const oxlintInit = (dir, files) => {
  const out = [];
  for (const [presets, sel] of [
    [["core"], files.filter((f) => !f.endsWith(".tsx"))],
    [["core", "react"], files.filter((f) => f.endsWith(".tsx"))],
  ]) {
    if (!sel.length) {
      continue;
    }
    const cfg = lib.dc.writeOxlintConfig(presets, CONFIGS);
    out.push(
      ...lib.dc
        .runOxlint({ configFile: cfg, cwd: dir, files: sel })
        .filter((d) => TOPIC_RULE.test(d.rule))
        .map((d) => ({
          ...d,
          file: d.file.replace(/^\.\//, ""),
          view: `oxlint-init/${d.rule}`,
        }))
    );
  }
  return out;
};
const biomeConfig = (name, body) => {
  const dir = join(CONFIGS, `biome-${name}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "biome.json"), `${JSON.stringify(body, null, 2)}\n`);
  return dir;
};
const biomePass = (dir, files, pass) => {
  const cfgDir = biomeConfig(`cal-${pass}`, {
    ...lib.BIOME_BASE,
    linter: {
      enabled: true,
      rules: { recommended: false, ...BIOME_PASSES[pass] },
    },
  });
  return lib.runBiome({ configDir: cfgDir, cwd: dir, files }).map((d) => ({
    ...d,
    view: `biome/${d.rule.replace(/^[a-z]+\//, "")}${PASS_NAME[pass]}`,
  }));
};
const biomePreset = (dir, files) => {
  const out = [];
  for (const [presets, sel] of [
    [["core"], files.filter((f) => !f.endsWith(".tsx"))],
    [["core", "react"], files.filter((f) => f.endsWith(".tsx"))],
  ]) {
    if (!sel.length) {
      continue;
    }
    const cfgDir = biomeConfig(`preset-${presets.join("+")}`, {
      ...lib.BIOME_BASE,
      extends: presets.map((p) =>
        join(lib.CLI, "config/biome", p, "biome.jsonc")
      ),
    });
    out.push(
      ...lib
        .runBiome({ configDir: cfgDir, cwd: dir, files: sel })
        .filter((d) => TOPIC_RULE.test(d.rule))
        .map((d) => ({ ...d, view: `biome-preset/${d.rule}` }))
    );
  }
  return out;
};
const eslintPreset = async (dir, files) => {
  const out = [];
  for (const [presets, sel] of [
    [["core"], files.filter((f) => !f.endsWith(".tsx"))],
    [["core", "react"], files.filter((f) => f.endsWith(".tsx"))],
  ]) {
    if (!sel.length) {
      continue;
    }
    const ms = await lib.dc.runEslint({ cwd: dir, files: sel, presets });
    out.push(
      ...ms
        .filter((m) => TOPIC_RULE.test(m.rule))
        .map((m) => ({
          ...m,
          column: m.column - 1,
          view: `eslint-preset/${m.rule}`,
        }))
    );
  }
  return out;
};
const eslintCensus = (dir, files) => {
  const out = [];
  for (const f of files) {
    const r = lib.inventory(readFileSync(join(dir, f), "utf8"), f);
    for (const m of r.eslint ?? []) {
      out.push({ ...m, file: f, view: `eslint/${m.rule}` });
    }
  }
  return out;
};
const tsc = (dir, files) => {
  const out = {};
  for (const f of files) {
    const options = {
      allowJs: true,
      checkJs: f.endsWith(".js"),
      experimentalDecorators: false,
      jsx: ts.JsxEmit.Preserve,
      lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      noImplicitAny: true,
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
    };
    const program = ts.createProgram({ options, rootNames: [join(dir, f)] });
    out[f] = ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.file && d.file.fileName.endsWith(f))
      .map((d) => ({
        code: d.code,
        line: d.file.getLineAndCharacterOfPosition(d.start).line + 1,
        message: ts
          .flattenDiagnosticMessageText(d.messageText, " ")
          .slice(0, 200),
      }))
      .filter((d) => TSC_CODES.has(d.code));
  }
  return out;
};
// Error messages name the run dir; keep the machine's temp path out of the results.
const redactTmp = (text) => text.replaceAll(lib.TMP, "<tmp>");

const runNode = (dir, files) => {
  const out = {};
  const runDir = join(dir, ".run");
  mkdirSync(runDir, { recursive: true });
  for (const f of files) {
    const js = ts.transpileModule(readFileSync(join(dir, f), "utf8"), {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: f,
    }).outputText;
    const file = join(
      runDir,
      `${f.replace(/\.[^.]+$/, "").replaceAll("/", "__")}.mjs`
    );
    writeFileSync(
      file,
      `globalThis.React = { createElement: () => ({}) };\n${js}`
    );
    const r = lib.spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `try { const m = await import(${JSON.stringify(pathToFileURL(file).href)}); const v = {}; for (const [k, x] of Object.entries(m)) { v[k] = typeof x === "function" ? "function" : x; } console.log(JSON.stringify({ exports: v })); } catch (e) { console.log(JSON.stringify({ importError: String(e) })); }`,
      ],
      { encoding: "utf8", timeout: 20_000 }
    );
    try {
      out[f] = JSON.parse(redactTmp(r.stdout.trim().split("\n").at(-1)));
    } catch {
      out[f] = {
        stderr: redactTmp(r.stderr).slice(0, 300),
        stdout: redactTmp(r.stdout).slice(0, 300),
      };
    }
  }
  rmSync(runDir, { force: true, recursive: true });
  return out;
};

// ── conversion of a case ───────────────────────────────────────────────
const convertCase = (text, rel) => {
  const inv = lib.inventory(text, rel);
  const p = conv.parse(text, rel);
  const decls = [];
  const visit = (n) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    if (n.type === "FunctionDeclaration") {
      decls.push(n);
    }
    for (const k of p.keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        for (const x of v) {
          visit(x);
        }
      } else if (v && typeof v.type === "string") {
        visit(v);
      }
    }
  };
  visit(p.ast);
  const edits = [];
  const decisions = [];
  for (const f of inv.fns.filter((x) => x.type === "FunctionDeclaration")) {
    const c = conversionOf(f);
    decisions.push({ decision: c, line: f.line, name: f.name });
    if (c !== "arrow" && !c.startsWith("function-expression")) {
      continue;
    }
    const node = decls.find(
      (d) => d.loc.start.line === f.line && d.loc.start.column === f.column
    );
    if (node?.id && node.body) {
      edits.push(
        ...conv.convertEdits(
          node,
          text,
          rel,
          c === "arrow" ? "arrow" : "function",
          (f.reassigned ?? 0) > 0 ? "let" : "const"
        )
      );
    }
  }
  return { decisions, text: conv.applyEdits(text, edits) };
};

// ── fixes ──────────────────────────────────────────────────────────────
const fixPasses = (dir, files) => {
  const out = {};
  const run = (name, fn) => {
    const d = join(WORK, `fix-${name}`);
    rmSync(d, { force: true, recursive: true });
    mkdirSync(d, { recursive: true });
    for (const f of files) {
      copyFileSync(join(dir, f), join(d, f));
    }
    fn(d);
    for (const f of files) {
      const before = readFileSync(join(dir, f), "utf8");
      const after = readFileSync(join(d, f), "utf8");
      if (before !== after) {
        out[f] ??= {};
        out[f][name] = {
          changedLines: after
            .split("\n")
            .filter((l, i) => l !== before.split("\n")[i]).length,
          diff: after
            .split("\n")
            .filter((l) => !before.split("\n").includes(l))
            .slice(0, 6),
        };
      }
    }
  };
  const ox = (flags, pass) => (d) => {
    const cfg = lib.writeOxlintRules(
      CONFIGS,
      `fix-${pass}`,
      OXLINT_PASSES[pass],
      {
        plugins: ["eslint", "unicorn"],
      }
    );
    lib.spawnSync(
      process.execPath,
      [lib.oxlintBin, "-c", cfg, "--disable-nested-config", ...flags, ...files],
      { cwd: d, encoding: "utf8" }
    );
  };
  run("oxlint --fix", ox(["--fix"], "a"));
  run("oxlint --fix-suggestions", ox(["--fix-suggestions"], "a"));
  run("oxlint --fix-dangerously", ox(["--fix-dangerously"], "a"));
  run("oxlint --fix-dangerously (declaration)", ox(["--fix-dangerously"], "b"));
  const bi = (flags) => (d) => {
    const cfgDir = biomeConfig("fix", {
      ...lib.BIOME_BASE,
      linter: {
        enabled: true,
        rules: { recommended: false, ...BIOME_PASSES.a },
      },
    });
    lib.spawnSync(
      process.execPath,
      [lib.biomeBin, "lint", `--config-path=${cfgDir}`, ...flags, ...files],
      { cwd: d, encoding: "utf8", timeout: 60_000 }
    );
  };
  run("biome --write", bi(["--write"]));
  run("biome --write --unsafe", bi(["--write", "--unsafe"]));
  // ESLint: the census pass's rules, fixes applied (Linter.verifyAndFix)
  const { Linter } = require(require.resolve("eslint", { paths: [lib.CLI] }));
  const linter = new Linter({ configType: "flat" });
  run("eslint --fix", (d) => {
    for (const f of files) {
      const text = readFileSync(join(d, f), "utf8");
      const r = linter.verifyAndFix(
        text,
        [
          {
            files: ["**/*.{ts,tsx,js}"],
            languageOptions: {
              parser: lib.tsParser,
              parserOptions: { ecmaFeatures: { jsx: f.endsWith(".tsx") } },
              sourceType: "module",
            },
            rules: {
              "arrow-body-style": ["error", "as-needed"],
              "func-names": "error",
              "func-style": [
                "error",
                "expression",
                { allowArrowFunctions: true },
              ],
              "no-use-before-define": "error",
              "prefer-arrow-callback": "error",
            },
          },
        ],
        { filename: f }
      );
      writeFileSync(join(d, f), r.output);
    }
  });
  return out;
};

// What `ultracite fix` and `ultracite fix --unsafe` would do with Ultracite's presets: oxlint
// --fix / --fix-dangerously with the root config init writes, eslint --fix with the ESLint preset,
// biome --write / --write --unsafe with the Biome preset; core for .ts/.js, core + react for
// .tsx, and the TanStack case once more as a route file (routes/posts.$id.tsx) with the
// tanstack preset added. Each fixed file is imported in Node again.
const presetFixes = async (dir, files) => {
  const out = {};
  const sets = [
    {
      files: files.filter((f) => !f.endsWith(".tsx")),
      presets: ["core"],
      route: false,
    },
    {
      files: files.filter((f) => f.endsWith(".tsx")),
      presets: ["core", "react"],
      route: false,
    },
    {
      files: files.filter((f) => /tanstack/.test(f)),
      presets: ["core", "react", "tanstack"],
      route: true,
    },
  ];
  const passes = {
    "biome --write": (d, sel, presets) => {
      const cfgDir = biomeConfig(`fix-${presets.join("+")}`, {
        ...lib.BIOME_BASE,
        extends: presets.map((p) =>
          join(lib.CLI, "config/biome", p, "biome.jsonc")
        ),
      });
      lib.spawnSync(
        process.execPath,
        [lib.biomeBin, "lint", `--config-path=${cfgDir}`, "--write", ...sel],
        {
          cwd: d,
          encoding: "utf8",
          timeout: 60_000,
        }
      );
    },
    "biome --write --unsafe": (d, sel, presets) => {
      const cfgDir = biomeConfig(`fixu-${presets.join("+")}`, {
        ...lib.BIOME_BASE,
        extends: presets.map((p) =>
          join(lib.CLI, "config/biome", p, "biome.jsonc")
        ),
      });
      lib.spawnSync(
        process.execPath,
        [
          lib.biomeBin,
          "lint",
          `--config-path=${cfgDir}`,
          "--write",
          "--unsafe",
          ...sel,
        ],
        { cwd: d, encoding: "utf8", timeout: 60_000 }
      );
    },
    "eslint --fix": async (d, sel, presets) => {
      const { ESLint } = require(
        require.resolve("eslint", { paths: [lib.CLI] })
      );
      const eslint = new ESLint({
        cwd: d,
        errorOnUnmatchedPattern: false,
        fix: true,
        ignore: false,
        overrideConfig: [
          ...(await lib.dc.eslintBlocks({ presets })),
          {
            linterOptions: {
              noInlineConfig: true,
              reportUnusedDisableDirectives: "off",
            },
          },
        ],
        overrideConfigFile: true,
      });
      const results = await eslint.lintFiles(sel);
      for (const r of results) {
        if (r.output !== undefined) {
          writeFileSync(r.filePath, r.output);
        }
      }
    },
    "oxlint --fix": (d, sel, presets) => {
      const cfg = lib.dc.writeOxlintConfig(presets, CONFIGS);
      lib.spawnSync(
        process.execPath,
        [lib.oxlintBin, "-c", cfg, "--disable-nested-config", "--fix", ...sel],
        {
          cwd: d,
          encoding: "utf8",
        }
      );
    },
    "oxlint --fix-dangerously": (d, sel, presets) => {
      const cfg = lib.dc.writeOxlintConfig(presets, CONFIGS);
      lib.spawnSync(
        process.execPath,
        [
          lib.oxlintBin,
          "-c",
          cfg,
          "--disable-nested-config",
          "--fix-dangerously",
          ...sel,
        ],
        { cwd: d, encoding: "utf8" }
      );
    },
  };
  for (const set of sets) {
    if (!set.files.length) {
      continue;
    }
    for (const [name, pass] of Object.entries(passes)) {
      const d = join(
        WORK,
        `preset-fix-${name.replace(/\W+/g, "-")}-${set.presets.join("+")}`
      );
      rmSync(d, { force: true, recursive: true });
      const rels = set.files.map((f) =>
        set.route ? `routes/posts.$id.tsx` : f
      );
      for (const [i, f] of set.files.entries()) {
        mkdirSync(join(d, rels[i], ".."), { recursive: true });
        copyFileSync(join(dir, f), join(d, rels[i]));
      }
      await pass(d, rels, set.presets);
      const nodeOut = runNode(d, rels);
      for (const [i, f] of set.files.entries()) {
        const before = readFileSync(join(dir, f), "utf8");
        const after = readFileSync(join(d, rels[i]), "utf8");
        const key = `${f}${set.route ? " (as routes/posts.$id.tsx, + tanstack)" : ""}`;
        out[key] ??= {};
        out[key][name] = {
          ...(before !== after && /tanstack|component|c20|module-eval/.test(f)
            ? { after }
            : {}),
          changed: before !== after,
          functionsConverted:
            (before.match(/\bfunction\b/g)?.length ?? 0) -
            (after.match(/\bfunction\b/g)?.length ?? 0),
          node: nodeOut[rels[i]],
        };
      }
    }
  }
  return out;
};

const describeOf = (text) => /^\/\/ C\d+: (.+?)(?:\n\/\/ (.+))?\n/.exec(text);

const main = async () => {
  const files = readdirSync(lib.CALIBRATION_DIR)
    .filter((f) => /^c\d+-.+\.(?:ts|tsx|js)$/.test(f))
    .sort();
  rmSync(WORK, { force: true, recursive: true });
  const dirs = {
    converted: join(WORK, "converted"),
    original: join(WORK, "original"),
  };
  for (const d of Object.values(dirs)) {
    mkdirSync(d, { recursive: true });
  }
  const decisions = {};
  for (const f of files) {
    const text = readFileSync(join(lib.CALIBRATION_DIR, f), "utf8");
    writeFileSync(join(dirs.original, f), text);
    const c = convertCase(text, f);
    decisions[f] = c.decisions;
    writeFileSync(join(dirs.converted, f), c.text);
  }
  const lintAll = async (dir) => [
    ...oxlintPass(dir, files, "a"),
    ...oxlintPass(dir, files, "b"),
    ...oxlintPass(dir, files, "c"),
    ...oxlintInit(dir, files),
    ...eslintCensus(dir, files),
    ...(await eslintPreset(dir, files)),
    ...biomePass(dir, files, "a"),
    ...biomePass(dir, files, "b"),
    ...biomePass(dir, files, "c"),
    ...biomePreset(dir, files),
  ];
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of func-style-calibration.cjs. Lines are the case file's; `converted` is the same file after func-style-convert.cjs's conversion (line numbers unchanged).",
    tools: lib.toolVersions(),
    cases: {},
  };
  const views = {};
  for (const [stage, dir] of Object.entries(dirs)) {
    const diags = await lintAll(dir);
    const tscOut = tsc(dir, files);
    const nodeOut = runNode(dir, files);
    for (const f of files) {
      const text = readFileSync(join(dir, f), "utf8");
      const lines = text.split("\n");
      result.cases[f] ??= {
        description: describeOf(
          readFileSync(join(lib.CALIBRATION_DIR, f), "utf8")
        )
          ?.slice(1)
          .filter(Boolean)
          .join(" "),
        conversion: decisions[f],
      };
      const byView = {};
      for (const d of diags.filter(
        (x) => x.file === f || x.file === `./${f}`
      )) {
        const v = d.view;
        views[v] = true;
        (byView[v] ??= []).push({
          help: d.help ?? null,
          line: d.line,
          message: d.message,
          text: (lines[d.line - 1] ?? "").trim().slice(0, 90),
          ...(d.fix !== undefined ? { fix: d.fix } : {}),
          ...(d.suggestions?.length ? { suggestions: d.suggestions } : {}),
          ...(d.advices?.length
            ? { advices: JSON.stringify(d.advices).slice(0, 400) }
            : {}),
        });
      }
      for (const v of Object.keys(byView)) {
        byView[v].sort((a, b) => a.line - b.line);
      }
      result.cases[f][stage] = {
        lint: byView,
        node: nodeOut[f],
        tsc: tscOut[f],
      };
      if (stage === "converted") {
        result.cases[f].converted.text = text;
      }
    }
  }
  result.fixes = fixPasses(dirs.original, files);
  result.presetFixes = await presetFixes(dirs.original, files);
  result.views = Object.keys(views).sort();
  lib.writeJson(join(lib.RESULTS_DIR, "calibration.json"), result);
  rmSync(CONFIGS, { force: true, recursive: true });
  for (const [f, c] of Object.entries(result.cases)) {
    const summary = (stage) =>
      Object.entries(c[stage].lint)
        .filter(([v]) =>
          /^(oxlint|eslint|biome)\/(func-style|no-use-before-define|ts\/no-use-before-define|useConsistentFunctionStyle|noInvalidUseBeforeDeclaration)$/.test(
            v
          )
        )
        .map(
          ([v, ds]) =>
            `${v.replace(/^(oxlint|eslint|biome)\//, "$1:")}@${ds.map((d) => d.line).join(",")}`
        )
        .join(" ");
    console.log(
      `${f}: ${summary("original")} | node ${JSON.stringify(c.original.node).slice(0, 120)} | tsc ${c.original.tsc.map((d) => d.code).join(",")}\n   converted: ${summary("converted")} | node ${JSON.stringify(c.converted.node).slice(0, 120)} | tsc ${c.converted.tsc.map((d) => `${d.code}@${d.line}`).join(",")}`
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
