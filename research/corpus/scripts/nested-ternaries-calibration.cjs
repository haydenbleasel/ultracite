// The calibration: the hand-written cases in calibration/nested-ternaries/ (one file each) through
// every linter configuration this topic measures, both formatters and every fix pass, and the
// runnable behaviour cases in calibration/nested-ternaries/behaviour/:
//
//   Oxlint      the topic's rules alone (nested-ternaries-linters.cjs's pass, plus sonarjs's
//               no-nested-conditional through Oxlint's JS plugins), and Ultracite's presets as
//               `ultracite init` wires them: core (core + react for .tsx), and with js-plugins
//               (its plugins re-declared on the root by path, as init re-declares them)
//   ESLint      the census pass (nested-ternaries-lib.cjs ESLINT_RULES), and Ultracite's own
//               ESLint core preset (+ react for .tsx)
//   Biome       the topic's rules alone, and the core preset (+ react)
//   cognitive   sonarjs/cognitive-complexity at 0, Biome's noExcessiveCognitiveComplexity at 1,
//               and ESLint's cyclomatic `complexity` at 0, per function
//   formatters  Oxfmt with Ultracite's preset; Prettier with Ultracite's config, with and without
//               experimentalTernaries
//   fixes       what each `ultracite fix` path does to each case: oxlint --fix (and
//               --fix-dangerously) then Oxfmt; eslint --fix then Prettier; biome check --write (and
//               --unsafe); then what's still reported
//   ping-pong   unicorn/no-nested-ternary alone with its fix (Oxlint and ESLint), then the
//               formatter (Oxfmt and Prettier), three rounds
//   behaviour   each behaviour case transpiled and imported in a fresh Node process; every input
//               through the original and each rewrite, comparing results, throws and the calls
//               each made
//
// The cases are this repo's own hand-written files, so running them is safe.
//
// Usage: node research/corpus/scripts/nested-ternaries-calibration.cjs
// Writes results/nested-ternaries/calibration.json.
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

const lib = require("./nested-ternaries-lib.cjs");

const ts = lib.dc.ts;
const WORK = join(lib.TMP, "calibration");
const CONFIGS = join(lib.TMP, "configs-calibration");
const CASES = lib.CALIBRATION_DIR;
const BEHAVIOUR = join(CASES, "behaviour");

const TOPIC_RULE =
  /(?:ternary|Ternary|nested-conditional|negated-condition|NegationElse|else-return|UselessElse|lonely-if|CollapsedIf|CollapsedElseIf|^curly$|BlockStatements|prefer-const|useConst|func-style|use-before-define|UseBeforeDeclaration|cognitive|Cognitive|^complexity$|logical-operator|jsx-no-leaked-render|LeakedRender|no-useless-return|prefer-immediate-return)/;
const OXLINT_RULES = {
  "no-else-return": "error",
  "no-negated-condition": "error",
  "no-nested-ternary": "error",
  "no-unneeded-ternary": "error",
  "unicorn/no-negated-condition": "error",
  "unicorn/no-nested-ternary": "error",
  "unicorn/prefer-logical-operator-over-ternary": "error",
  "unicorn/prefer-ternary": "error",
};
const BIOME_RULES = {
  complexity: {
    noExcessiveCognitiveComplexity: {
      level: "error",
      options: { maxAllowedComplexity: 1 },
    },
    noUselessTernary: "error",
  },
  style: {
    noNegationElse: "error",
    noNestedTernary: "error",
    noUselessElse: "error",
    useBlockStatements: "error",
  },
};
const sonarMain = require.resolve("eslint-plugin-sonarjs", {
  paths: [lib.ULTRACITE],
});

// ── configs ────────────────────────────────────────────────────────────
// Ultracite's presets, extended by path. With js-plugins, the root config `ultracite init` writes
// (dead-code-lib.cjs) goes under out/nested-ternaries/configs/ in the repo, so the preset's bare
// plugin specifiers resolve; the directory is removed at the end.
const REPO_CONFIGS = join(lib.OUT_DIR, "configs");
const oxlintPresetConfig = async (presets) => {
  if (presets.includes("js-plugins")) {
    return lib.dc.writeOxlintConfig(presets, REPO_CONFIGS);
  }
  mkdirSync(CONFIGS, { recursive: true });
  const file = join(CONFIGS, `oxlint.${presets.join("+")}.config.mjs`);
  const url = (p) =>
    JSON.stringify(
      pathToFileURL(join(lib.CLI, "config/oxlint", p, "index.mjs")).href
    );
  const lines = presets.map((p, i) => `import preset${i} from ${url(p)};`);
  let tail = "";
  if (presets.includes("js-plugins")) {
    const m = await import(
      pathToFileURL(join(lib.CLI, "config/oxlint/js-plugins/index.mjs")).href
    );
    const plugins = m.default.jsPlugins.map((p) => ({
      name: p.name,
      specifier: pathToFileURL(
        require.resolve(p.specifier, { paths: [lib.ULTRACITE] })
      ).href,
    }));
    tail = `, jsPlugins: ${JSON.stringify(plugins)}, settings: ${JSON.stringify(m.jsPluginSettings)}`;
  }
  lines.push(
    `export default { extends: [${presets.map((_, i) => `preset${i}`).join(", ")}]${tail} };`,
    ""
  );
  writeFileSync(file, lines.join("\n"));
  return file;
};
const biomePresetDir = (presets) => {
  const dir = join(CONFIGS, `biome-${presets.join("+")}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "biome.json"),
    JSON.stringify({
      extends: presets.map((p) =>
        join(lib.CLI, "config/biome", p, "biome.jsonc")
      ),
      javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
      root: true,
      vcs: { enabled: false },
    })
  );
  return dir;
};
const presetsFor = (file) =>
  file.endsWith(".tsx") ? ["core", "react"] : ["core"];

// ── runners ────────────────────────────────────────────────────────────
const slim = (d) => ({
  column: d.column ?? null,
  fix: d.fix ?? undefined,
  help: d.help ?? undefined,
  line: d.line,
  message: d.message,
  rule: d.rule,
  suggestions: d.suggestions?.length ? d.suggestions : undefined,
});
const oxlintAlone = (dir, files) => {
  const cfg = lib.writeOxlintRules(CONFIGS, "cal-topic", OXLINT_RULES, {
    plugins: ["eslint", "unicorn"],
  });
  const sonar = lib.writeOxlintRules(
    CONFIGS,
    "cal-sonar",
    { "sonarjs/no-nested-conditional": "error" },
    {
      jsPlugins: [
        { name: "sonarjs", specifier: pathToFileURL(sonarMain).href },
      ],
      plugins: [],
    }
  );
  return [
    ...lib.runOxlint({ configFile: cfg, cwd: dir, files }),
    ...lib.runOxlint({ configFile: sonar, cwd: dir, files }),
  ];
};
const oxlintPresets = async (dir, files, extra = []) => {
  const out = [];
  for (const sel of [
    files.filter((f) => !f.endsWith(".tsx")),
    files.filter((f) => f.endsWith(".tsx")),
  ]) {
    if (sel.length === 0) {
      continue;
    }
    const cfg = await oxlintPresetConfig([...presetsFor(sel[0]), ...extra]);
    out.push(
      ...lib.dc.runOxlint({
        configFile: cfg,
        cwd: dir,
        files: sel,
        keep: (r) => TOPIC_RULE.test(r),
      })
    );
  }
  return out;
};
const eslintPresets = async (dir, files) => {
  const out = [];
  for (const sel of [
    files.filter((f) => !f.endsWith(".tsx")),
    files.filter((f) => f.endsWith(".tsx")),
  ]) {
    if (sel.length === 0) {
      continue;
    }
    out.push(
      ...(await lib.dc.runEslint({
        cwd: dir,
        files: sel,
        keep: (r) => TOPIC_RULE.test(r),
        presets: presetsFor(sel[0]),
      }))
    );
  }
  return out;
};
const biomeAlone = (dir, files) =>
  lib.runBiome({
    configDir: lib.biomeRulesConfig(join(CONFIGS, "biome-topic"), BIOME_RULES),
    cwd: dir,
    files,
  });
const biomePresets = (dir, files) => {
  const out = [];
  for (const sel of [
    files.filter((f) => !f.endsWith(".tsx")),
    files.filter((f) => f.endsWith(".tsx")),
  ]) {
    if (sel.length === 0) {
      continue;
    }
    out.push(
      ...lib.sk
        .runBiome({
          configDir: biomePresetDir(presetsFor(sel[0])),
          cwd: dir,
          files: sel,
          keep: (r) => TOPIC_RULE.test(r),
        })
        .map((d) => ({ ...d, rule: d.rule.replace(/^lint\//, "") }))
    );
  }
  return out;
};
// ESLint's cyclomatic complexity at 0, per function (its message names the function)
const cyclomatic = (text, rel) => {
  const r = lib.inventory(text, rel, {
    rules: { complexity: ["error", { max: 0, variant: "classic" }] },
  });
  return (r.eslint ?? [])
    .filter((m) => m.rule === "complexity")
    .map((m) => ({
      line: m.line,
      score: Number(/complexity of (\d+)/.exec(m.message)?.[1]),
    }));
};
const biomeCognitive = (dir, files) =>
  biomeAlone(dir, files)
    .filter((d) => d.rule === "complexity/noExcessiveCognitiveComplexity")
    .map((d) => ({
      file: d.file,
      line: d.line,
      score: Number(/complexity of (\d+)/.exec(d.message ?? "")?.[1]),
    }));

// ── fix passes ─────────────────────────────────────────────────────────
const copyCases = (label, files) => {
  const dir = join(WORK, label);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
  for (const f of files) {
    copyFileSync(join(CASES, f), join(dir, f));
  }
  return dir;
};
const readAll = (dir, files) =>
  Object.fromEntries(files.map((f) => [f, readFileSync(join(dir, f), "utf8")]));
const oxlintFixPass = async (dir, files, dangerously) => {
  for (const sel of [
    files.filter((f) => !f.endsWith(".tsx")),
    files.filter((f) => f.endsWith(".tsx")),
  ]) {
    if (sel.length === 0) {
      continue;
    }
    lib.sk.oxlintFix({
      configFile: await oxlintPresetConfig(presetsFor(sel[0])),
      cwd: dir,
      dangerously,
      files: sel,
    });
  }
};
const eslintFixPass = async (dir, files, keepOnly = null) => {
  const { ESLint } = require(require.resolve("eslint", { paths: [lib.CLI] }));
  for (const sel of [
    files.filter((f) => !f.endsWith(".tsx")),
    files.filter((f) => f.endsWith(".tsx")),
  ]) {
    if (sel.length === 0) {
      continue;
    }
    const blocks = await lib.dc.eslintBlocks({
      keep: keepOnly,
      presets: presetsFor(sel[0]),
    });
    const eslint = new ESLint({
      cwd: dir,
      errorOnUnmatchedPattern: false,
      fix: true,
      ignore: false,
      overrideConfig: [
        ...blocks,
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
    await ESLint.outputFixes(results);
  }
};
const runFixPaths = async (files) => {
  const out = {};
  const paths = {
    "biome --write": async (dir) => {
      for (const sel of [
        files.filter((f) => !f.endsWith(".tsx")),
        files.filter((f) => f.endsWith(".tsx")),
      ]) {
        if (sel.length) {
          lib.sk.biomeWrite({
            configDir: biomePresetDir(presetsFor(sel[0])),
            cwd: dir,
            files: sel,
            timeout: 60_000,
          });
        }
      }
    },
    "biome --write --unsafe": async (dir) => {
      for (const sel of [
        files.filter((f) => !f.endsWith(".tsx")),
        files.filter((f) => f.endsWith(".tsx")),
      ]) {
        if (sel.length) {
          lib.sk.biomeWrite({
            configDir: biomePresetDir(presetsFor(sel[0])),
            cwd: dir,
            files: sel,
            timeout: 60_000,
            unsafe: true,
          });
        }
      }
    },
    "eslint --fix, prettier": async (dir) => {
      await eslintFixPass(dir, files);
      await lib.formatInPlace({ cwd: dir, files, tool: "prettier" });
    },
    "oxlint --fix, oxfmt": async (dir) => {
      await oxlintFixPass(dir, files, false);
      await lib.formatInPlace({ cwd: dir, files, tool: "oxfmt" });
    },
    "oxlint --fix-dangerously, oxfmt": async (dir) => {
      await oxlintFixPass(dir, files, true);
      await lib.formatInPlace({ cwd: dir, files, tool: "oxfmt" });
    },
  };
  for (const [name, run] of Object.entries(paths)) {
    const dir = copyCases(`fix-${name.replace(/\W+/g, "-")}`, files);
    await run(dir);
    const after = readAll(dir, files);
    const reportedAfter = {
      biome: name.startsWith("biome") ? biomePresets(dir, files) : null,
      eslint: name.startsWith("eslint")
        ? await eslintPresets(dir, files)
        : null,
      oxlint: name.startsWith("oxlint")
        ? await oxlintPresets(dir, files)
        : null,
    };
    out[name] = Object.fromEntries(
      files.map((f) => {
        const linter = name.split(" ")[0];
        const inv = lib.inventory(after[f], f);
        return [
          f,
          {
            changed: after[f] !== readFileSync(join(CASES, f), "utf8"),
            conditionals: inv.error ? null : inv.conditionals.length,
            nestedTernaries: inv.error ? null : inv.trees.length,
            parses: !inv.error,
            stillReported: (reportedAfter[linter] ?? [])
              .filter((d) => d.file === f || d.file?.endsWith(`/${f}`))
              .map((d) => `${d.line}: ${d.rule}`),
            text: after[f],
          },
        ];
      })
    );
  }
  return out;
};
// unicorn/no-nested-ternary alone with its fix, then a formatter, three rounds
const pingPong = async (file) => {
  const out = {};
  for (const [linter, formatter] of [
    ["oxlint", "oxfmt"],
    ["oxlint", "prettier"],
    ["eslint", "prettier"],
    ["eslint", "oxfmt"],
  ]) {
    const dir = copyCases(`pingpong-${linter}-${formatter}`, [file]);
    const texts = [readFileSync(join(dir, file), "utf8")];
    for (let round = 0; round < 3; round++) {
      if (linter === "oxlint") {
        lib.sk.oxlintFix({
          configFile: lib.writeOxlintRules(
            CONFIGS,
            "pingpong",
            { "unicorn/no-nested-ternary": "error" },
            { plugins: ["unicorn"] }
          ),
          cwd: dir,
          files: [file],
        });
      } else {
        const fixed = lib.linter.verifyAndFix(
          readFileSync(join(dir, file), "utf8"),
          [
            {
              files: ["**/*.ts"],
              languageOptions: { parser: lib.tsParser },
              plugins: { unicorn: lib.unicorn },
              rules: { "unicorn/no-nested-ternary": "error" },
            },
          ],
          { filename: file }
        );
        writeFileSync(join(dir, file), fixed.output);
      }
      texts.push(readFileSync(join(dir, file), "utf8"));
      await lib.formatInPlace({ cwd: dir, files: [file], tool: formatter });
      texts.push(readFileSync(join(dir, file), "utf8"));
    }
    out[`${linter} fix + ${formatter}`] = {
      cycles: texts[1] !== texts[0] && texts[2] === texts[0],
      texts: [...new Set(texts)],
    };
  }
  return out;
};

// ── behaviour ──────────────────────────────────────────────────────────
const HARNESS = `
const enc = (v, seen = new WeakSet()) => {
  if (typeof v === "bigint") return { bigint: String(v) };
  if (typeof v === "number" && !Number.isFinite(v)) return { number: String(v) };
  if (typeof v === "number" && Object.is(v, -0)) return { number: "-0" };
  if (typeof v === "function") return { function: v.name || "anonymous" };
  if (typeof v === "symbol") return { symbol: String(v) };
  if (v === undefined) return { undefined: true };
  if (v && typeof v === "object") {
    if (seen.has(v)) return { cycle: true };
    seen.add(v);
    if (Array.isArray(v)) return v.map((x) => enc(x, seen));
    if (Object.getPrototypeOf(v) === null) return { nullPrototype: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x, seen)])) };
    if (Object.getPrototypeOf(v) !== Object.prototype) return { object: Object.prototype.toString.call(v) };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x, seen)]));
  }
  return v;
};
const mod = await import(process.argv[2]);
const out = {};
const impls = { original: mod.original, ...mod.rewrites };
for (const [name, impl] of Object.entries(impls)) {
  out[name] = [];
  mod.reset?.();
  for (const input of mod.inputs) {
    mod.calls.length = 0;
    let row;
    try {
      let result = impl(input);
      if (result && typeof result.then === "function") result = await result;
      row = { result: mod.render ? mod.render(result) : enc(result) };
    } catch (e) {
      row = { threw: String(e && e.name) + ": " + String(e && e.message) };
    }
    row.calls = [...mod.calls];
    out[name].push(row);
  }
}
process.stdout.write(JSON.stringify(out));
`;
const behaviour = () => {
  const dir = join(WORK, "behaviour");
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "harness.mjs"), HARNESS);
  const out = {};
  for (const f of readdirSync(BEHAVIOUR).sort()) {
    const js = ts.transpileModule(readFileSync(join(BEHAVIOUR, f), "utf8"), {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        jsxFactory: "h",
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: f,
    }).outputText;
    const target = join(dir, f.replace(/\.tsx?$/, ".mjs"));
    writeFileSync(target, js);
    const r = lib.spawnSync(
      process.execPath,
      [join(dir, "harness.mjs"), pathToFileURL(target).href],
      { cwd: dir, encoding: "utf8", timeout: 30_000 }
    );
    let traces;
    try {
      traces = JSON.parse(r.stdout);
    } catch {
      out[f] = { error: lib.scrub((r.stderr || "no output").slice(0, 400)) };
      continue;
    }
    const inputs = readFileSync(join(BEHAVIOUR, f), "utf8");
    const verdicts = {};
    for (const [name, rows] of Object.entries(traces)) {
      if (name === "original") {
        continue;
      }
      const diffs = rows
        .map((row, i) => ({ i, row, ref: traces.original[i] }))
        .filter(
          ({ row, ref }) =>
            JSON.stringify({ r: row.result, t: row.threw }) !==
            JSON.stringify({ r: ref.result, t: ref.threw })
        );
      const callDiffs = rows.filter(
        (row, i) =>
          JSON.stringify(row.calls) !== JSON.stringify(traces.original[i].calls)
      ).length;
      verdicts[name] = {
        callsDiffer: callDiffs,
        examples: diffs.slice(0, 3).map(({ i, row, ref }) => ({
          after: row,
          before: ref,
          input: i,
        })),
        resultsDiffer: diffs.length,
        verdict:
          diffs.length === 0 && callDiffs === 0
            ? "same"
            : diffs.length === 0
              ? "same results, different calls"
              : "changed",
      };
    }
    out[f] = {
      header: inputs.split("\n")[0].replace(/^\/\/\s*/, ""),
      inputs: traces.original.length,
      traces,
      verdicts,
    };
  }
  return out;
};

// ── main ───────────────────────────────────────────────────────────────
const main = async () => {
  rmSync(WORK, { force: true, recursive: true });
  const files = readdirSync(CASES)
    .filter((f) => /^c\d+.*\.tsx?$/.test(f))
    .sort();
  const dir = copyCases("lint", files);
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of nested-ternaries-calibration.cjs. Per case: each view's diagnostics (line, rule, message, help or fix flag), the sonarjs, Biome and cyclomatic scores per function, each formatter's output, and what each fix path leaves. behaviour: each runnable case's original against each rewrite.",
    tools: lib.toolVersions(),
  };
  const views = {
    "biome/alone": biomeAlone(dir, files),
    "biome/presets": biomePresets(dir, files),
    "eslint/presets": await eslintPresets(dir, files),
    "oxlint/alone": oxlintAlone(dir, files),
    "oxlint/presets": await oxlintPresets(dir, files),
    "oxlint/presets+js-plugins": await oxlintPresets(dir, files, [
      "js-plugins",
    ]),
  };
  const biomeScores = biomeCognitive(dir, files);
  // formatters
  const formatted = {};
  for (const [label, opts] of Object.entries({
    oxfmt: { tool: "oxfmt" },
    prettier: { tool: "prettier" },
    "prettier experimentalTernaries": {
      experimentalTernaries: true,
      tool: "prettier",
    },
  })) {
    const fdir = copyCases(`format-${label.replace(/\W+/g, "-")}`, files);
    const r = await lib.formatInPlace({ cwd: fdir, files, ...opts });
    formatted[label] = {
      status: r.status,
      stderr: lib.scrub(r.stderr),
      texts: readAll(fdir, files),
    };
  }
  result.cases = {};
  for (const f of files) {
    const text = readFileSync(join(CASES, f), "utf8");
    const inv = lib.inventory(text, f);
    const pick = (ds) =>
      ds
        .filter((d) => d.file === f || d.file?.endsWith(`/${f}`))
        .map(slim)
        .sort(
          (a, b) => a.line - b.line || String(a.rule).localeCompare(b.rule)
        );
    result.cases[f] = {
      biomeCognitive: biomeScores
        .filter((d) => d.file === f || d.file?.endsWith(`/${f}`))
        .map(({ line, score }) => ({ line, score })),
      cognitive: (inv.functions ?? []).map((fn) => ({
        line: fn.line,
        name: fn.name,
        score: fn.cognitive,
      })),
      conditionalTypes: inv.condTypes?.length ?? null,
      cyclomatic: cyclomatic(text, f),
      description: text.split("\n")[0].replace(/^\/\/\s*/, ""),
      eslintCensus: (inv.eslint ?? []).map(slim),
      formatted: Object.fromEntries(
        Object.entries(formatted).map(([k, v]) => [k, v.texts[f]])
      ),
      trees: (inv.trees ?? []).map((t) => ({
        depth: t.depth,
        line: t.line,
        position: t.position,
        rewrite: t.rewrite,
        shape: t.shape,
        tests: t.tests.shape,
      })),
      views: Object.fromEntries(
        Object.entries(views).map(([k, ds]) => [k, pick(ds)])
      ),
    };
  }
  result.formatterStatus = Object.fromEntries(
    Object.entries(formatted).map(([k, v]) => [
      k,
      { status: v.status, stderr: v.stderr },
    ])
  );
  result.fixes = await runFixPaths(files);
  result.pingPong = {
    "c23-ping-pong.ts": await pingPong("c23-ping-pong.ts"),
    "c17-depth-three.ts": await pingPong("c17-depth-three.ts"),
  };
  result.behaviour = behaviour();
  lib.writeJson(
    join(lib.RESULTS_DIR, "calibration.json"),
    JSON.parse(lib.scrub(JSON.stringify(result)))
  );
  rmSync(CONFIGS, { force: true, recursive: true });
  rmSync(REPO_CONFIGS, { force: true, recursive: true });
  // a compact print
  for (const [f, c] of Object.entries(result.cases)) {
    const byView = Object.fromEntries(
      Object.entries(c.views).map(([k, ds]) => [
        k,
        [...new Set(ds.map((d) => d.rule))].join(","),
      ])
    );
    console.log(
      `${f}: trees ${c.trees.map((t) => `${t.shape}/${t.position}/${t.depth}`).join(" ")}; cog ${c.cognitive.map((x) => `${x.name}=${x.score}`).join(" ")}; ${JSON.stringify(byView)}`
    );
  }
  for (const [f, b] of Object.entries(result.behaviour)) {
    console.log(
      `${f}: ${JSON.stringify(Object.fromEntries(Object.entries(b.verdicts ?? {}).map(([k, v]) => [k, `${v.verdict} (${v.resultsDiffer}/${b.inputs})`])))}${b.error ? ` ERROR ${b.error}` : ""}`
    );
  }
  for (const [f, p] of Object.entries(result.pingPong)) {
    console.log(
      `${f}: ${JSON.stringify(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.cycles])))}`
    );
  }
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
