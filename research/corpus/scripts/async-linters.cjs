// Runs the async and promise rules in every linter Ultracite supports, on the same code, to see
// where implementations agree.
//
//   --calibration  the hand-written cases in calibration/floating-promises/ (with a tsconfig):
//                  the TypeScript compiler's own diagnostics; Ultracite's Oxlint core + react
//                  presets with --type-aware (tsgolint); Ultracite's ESLint core + type-aware
//                  presets (typescript-eslint with type information); Ultracite's Biome core
//                  preset; and, separately, Biome's nursery noFloatingPromises,
//                  noMisusedPromises and useAwaitThenable, which Ultracite doesn't enable.
//                  Only async and promise rules (results/<topic>/rule-inventory.json) are kept.
//   --corpus       the raw mirror written by rule-census.cjs (inline disables neutralised), with
//                  the syntactic rules ESLint and Biome share with Oxlint (await in loops, async
//                  without await, async executors), plus Biome's inference-based
//                  noFloatingPromises and noMisusedPromises, to compare with typescript-eslint.
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-rule-inventory.cjs
//   node --max-old-space-size=8192 research/corpus/scripts/async-linters.cjs --calibration [--corpus]
// Writes results/<topic>/linters.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const config = require("./repos.json");
const { biomeBin, dirs, ULTRACITE } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const CLI = join(ULTRACITE, "packages/cli");
const args = process.argv.slice(2);
const TOPIC = args.includes("--topic")
  ? args[args.indexOf("--topic") + 1]
  : (process.env.RESEARCH_TOPIC ?? "floating-promises");
const RESULTS_DIR = join(HERE, "results", TOPIC);
const CALIBRATION = join(HERE, "calibration", "floating-promises");
const WORK = join(HERE, "out", "floating-promises", "linters");

const ts = require(join(dirs.typescript, "lib/typescript.js"));
const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
const tsParser = require(
  require.resolve("@typescript-eslint/parser", { paths: [CLI] })
);
const tsPlugin = require(
  require.resolve("@typescript-eslint/eslint-plugin", { paths: [CLI] })
);
const version = (name, base) =>
  require(require.resolve(`${name}/package.json`, { paths: [base] })).version;

const inventory = JSON.parse(
  readFileSync(join(RESULTS_DIR, "rule-inventory.json"), "utf8")
);
const OXLINT_ASYNC = new Set(
  ["core", "react"].flatMap((p) =>
    inventory.oxlint.presets[p].rules.filter((r) => r.on).map((r) => r.rule)
  )
);
const ESLINT_ASYNC = new Set(
  inventory.eslint.rules.filter((r) => r.on).map((r) => r.rule)
);
const BIOME_ASYNC = new Set(
  inventory.biome.presets.core.filter((r) => r.on).map((r) => r.rule)
);
const BIOME_NURSERY = [
  "noFloatingPromises",
  "noMisusedPromises",
  "useAwaitThenable",
];

// ── TypeScript ─────────────────────────────────────────────────────────
const runTsc = (dir, files) => {
  const { config: tsconfig } = ts.readConfigFile(
    join(dir, "tsconfig.json"),
    ts.sys.readFile
  );
  const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, dir);
  const program = ts.createProgram({
    options: parsed.options,
    rootNames: files.map((f) => join(dir, f)),
  });
  return ts.getPreEmitDiagnostics(program).map((d) => ({
    file: relative(dir, d.file.fileName),
    line: d.file.getLineAndCharacterOfPosition(d.start).line + 1,
    rule: `TS${d.code}`,
  }));
};

// ── Oxlint (Ultracite's core + react presets, type-aware) ──────────────
const oxlintPkg = require.resolve("oxlint/package.json", {
  paths: [ULTRACITE],
});
const oxlintBin = join(dirname(oxlintPkg), "bin", "oxlint");
const tsgolintPkg = realpathSync(
  require.resolve("oxlint-tsgolint/package.json", { paths: [CLI] })
);
const tsgolintBin = join(
  dirname(
    require.resolve(
      `@oxlint-tsgolint/${process.platform}-${process.arch}/package.json`,
      { paths: [dirname(tsgolintPkg)] }
    )
  ),
  "tsgolint"
);
const configName = (scope, rule) => {
  if (scope === "eslint") {
    return rule;
  }
  const name = scope.replace(/^eslint-plugin-/, "").replaceAll("_", "-");
  return `${name === "react-hooks" ? "react" : name}/${rule}`;
};

const runOxlint = (cwd, files) => {
  mkdirSync(WORK, { recursive: true });
  const file = join(WORK, "oxlint.config.mjs");
  const preset = (name) =>
    JSON.stringify(
      pathToFileURL(join(CLI, "config/oxlint", name, "index.mjs")).href
    );
  writeFileSync(
    file,
    `import core from ${preset("core")};\nimport react from ${preset("react")};\n\nexport default { extends: [core, react] };\n`
  );
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        oxlintBin,
        "--type-aware",
        "-c",
        file,
        "--disable-nested-config",
        "--format",
        "json",
        ...files,
      ],
      {
        cwd,
        encoding: "utf8",
        env: { ...process.env, OXLINT_TSGOLINT_PATH: tsgolintBin },
        maxBuffer: 1 << 28,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = error.stdout;
  }
  return JSON.parse(stdout).diagnostics.flatMap((d) => {
    const m = /^([a-z0-9_-]+)\((.+)\)$/.exec(d.code ?? "");
    if (!m) {
      return [];
    }
    return [
      {
        file: d.filename,
        line: d.labels?.[0]?.span.line,
        rule: configName(m[1], m[2]),
      },
    ];
  });
};

// ── ESLint (Ultracite's core + type-aware presets) ─────────────────────
const runEslintPreset = async (cwd, files) => {
  const core = (
    await import(
      pathToFileURL(join(CLI, "config/eslint/core/eslint.config.mjs")).href
    )
  ).default;
  const typeAware = (
    await import(
      pathToFileURL(join(CLI, "config/eslint/type-aware/eslint.config.mjs"))
        .href
    )
  ).default;
  const eslint = new ESLint({
    cwd,
    ignore: false,
    overrideConfig: [
      ...core,
      ...typeAware,
      {
        files: ["**/*.ts"],
        languageOptions: { parserOptions: { tsconfigRootDir: cwd } },
      },
    ],
    overrideConfigFile: true,
  });
  const results = await eslint.lintFiles(files);
  return results.flatMap((r) =>
    r.messages.map((m) => ({
      file: relative(cwd, r.filePath),
      line: m.line,
      rule: m.ruleId ?? `fatal: ${m.message}`,
    }))
  );
};

// ── Biome ──────────────────────────────────────────────────────────────
const writeBiomeConfig = (name, body) => {
  const dir = join(WORK, `biome-${name}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "biome.json"), JSON.stringify(body, null, 2));
  return dir;
};
const biomeBase = {
  assist: { enabled: false },
  files: { ignoreUnknown: true, maxSize: 10_000_000 },
  formatter: { enabled: false },
  root: true,
  vcs: { enabled: false },
};
// Ultracite's own Biome core preset, extended as a user would.
const biomeUltracite = () =>
  writeBiomeConfig("ultracite", {
    ...biomeBase,
    extends: [join(CLI, "config/biome/core/biome.jsonc")],
  });
const biomeRules = (rules) => {
  const groups = {};
  for (const [group, name] of rules) {
    groups[group] ??= {};
    groups[group][name] = "error";
  }
  return { recommended: false, ...groups };
};
const biomeNursery = () =>
  writeBiomeConfig("nursery", {
    ...biomeBase,
    linter: {
      enabled: true,
      rules: biomeRules(BIOME_NURSERY.map((n) => ["nursery", n])),
    },
  });
const biomeCorpus = () =>
  writeBiomeConfig("corpus", {
    ...biomeBase,
    linter: {
      enabled: true,
      rules: biomeRules([
        ["performance", "noAwaitInLoops"],
        ["suspicious", "useAwait"],
        ["suspicious", "noAsyncPromiseExecutor"],
        ["nursery", "noFloatingPromises"],
        ["nursery", "noMisusedPromises"],
      ]),
    },
  });

// Biome's inference-based rules (noFloatingPromises, noMisusedPromises) only see types when the
// config sits at the root of the linted files: with `--config-path` pointing elsewhere they
// silently report nothing (checked with Biome 2.5.15). So the config is copied into `cwd` for
// the run and removed afterwards.
const runBiome = (cwd, files, configDir) => {
  const out = [];
  const CHUNK = 400;
  const placed = join(cwd, "biome.json");
  if (existsSync(placed)) {
    throw new Error(`${placed} already exists`);
  }
  writeFileSync(placed, readFileSync(join(configDir, "biome.json")));
  try {
    for (let i = 0; i < files.length; i += CHUNK) {
      let stdout;
      try {
        stdout = execFileSync(
          process.execPath,
          [
            biomeBin,
            "lint",
            "--reporter=json",
            "--max-diagnostics=none",
            ...files.slice(i, i + CHUNK),
          ],
          {
            cwd,
            encoding: "utf8",
            maxBuffer: 1 << 28,
            stdio: ["ignore", "pipe", "pipe"],
          }
        );
      } catch (error) {
        stdout = error.stdout;
      }
      const report = JSON.parse(stdout);
      for (const d of report.diagnostics ?? []) {
        out.push({
          file: d.location?.path,
          line: d.location?.start?.line,
          rule: d.category?.split("/").at(-1) ?? d.category,
        });
      }
    }
  } finally {
    rmSync(placed);
  }
  return out;
};

// ── calibration ────────────────────────────────────────────────────────
const HEADER = /^\/\/ #([A-Z]+\d*): (.*)$/;

const calibration = async () => {
  const files = readdirSync(CALIBRATION).filter((f) => f.endsWith(".ts"));
  const cases = [];
  const starts = [];
  for (const file of files) {
    readFileSync(join(CALIBRATION, file), "utf8")
      .split("\n")
      .forEach((text, i) => {
        const m = HEADER.exec(text);
        if (m) {
          starts.push({ file, id: m[1], line: i + 1 });
          if (m[1] !== "END") {
            cases.push({ description: m[2], id: m[1] });
          }
        }
      });
  }
  const caseOf = (d) => {
    const before = starts.filter((s) => s.file === d.file && s.line <= d.line);
    return before.at(-1)?.id ?? "(stubs)";
  };
  // Biome runs on a copy (it needs its config next to the files; see runBiome).
  const copy = join(WORK, "calibration-copy");
  rmSync(copy, { force: true, recursive: true });
  mkdirSync(copy, { recursive: true });
  for (const f of files) {
    copyFileSync(join(CALIBRATION, f), join(copy, f));
  }
  const tools = {
    biome: runBiome(copy, files, biomeUltracite()).filter((d) =>
      BIOME_ASYNC.has(d.rule)
    ),
    "biome nursery (not enabled)": runBiome(copy, files, biomeNursery()),
    eslint: (await runEslintPreset(CALIBRATION, files)).filter(
      (d) => ESLINT_ASYNC.has(d.rule) || d.rule.startsWith("fatal")
    ),
    oxlint: runOxlint(CALIBRATION, files).filter((d) =>
      OXLINT_ASYNC.has(d.rule)
    ),
    tsc: runTsc(CALIBRATION, files),
  };
  const table = cases.map((c) => ({
    ...c,
    ...Object.fromEntries(
      Object.entries(tools).map(([tool, diags]) => [
        tool,
        [
          ...new Set(
            diags
              .filter((d) => caseOf(d) === c.id)
              .map((d) =>
                d.rule
                  .replace("@typescript-eslint/", "ts/")
                  .replace("typescript/", "ts/")
              )
          ),
        ].sort(),
      ])
    ),
  }));
  const stray = Object.fromEntries(
    Object.entries(tools).map(([tool, diags]) => [
      tool,
      diags
        .filter((d) => !cases.some((c) => c.id === caseOf(d)))
        .map((d) => `${d.line}:${d.rule}`),
    ])
  );
  for (const row of table) {
    console.log(
      `${row.id} ${row.description}\n   tsc: ${row.tsc.join(", ") || "-"} | oxlint: ${row.oxlint.join(", ") || "-"}\n   eslint: ${row.eslint.join(", ") || "-"}\n   biome: ${row.biome.join(", ") || "-"} | biome nursery: ${row["biome nursery (not enabled)"].join(", ") || "-"}`
    );
  }
  console.log("outside any case:", JSON.stringify(stray));
  return { cases: table, outsideCases: stray };
};

// ── corpus ─────────────────────────────────────────────────────────────
const walk = (dir, root = dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      walk(abs, root, out);
    } else {
      out.push(relative(root, abs));
    }
  }
  return out;
};

const corpus = async () => {
  const mirrorRoot = join(HERE, "out", "rule-census", TOPIC, "mirror");
  if (!existsSync(mirrorRoot)) {
    throw new Error(`Run rule-census.cjs --topic ${TOPIC} first (no mirror).`);
  }
  const ESLINT_RULES = [
    "no-async-promise-executor",
    "no-await-in-loop",
    "require-await",
  ];
  const perRepo = {};
  const configDir = biomeCorpus();
  for (const { name } of config.repos) {
    const root = join(mirrorRoot, name);
    if (!existsSync(root)) {
      continue;
    }
    const files = walk(root);
    const eslint = new ESLint({
      cwd: root,
      ignore: false,
      overrideConfig: [
        {
          files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
          languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: "off",
          },
          plugins: { "@typescript-eslint": tsPlugin },
          rules: Object.fromEntries(ESLINT_RULES.map((r) => [r, "error"])),
        },
      ],
      overrideConfigFile: true,
    });
    const eslintCounts = {};
    for (const r of await eslint.lintFiles(files)) {
      for (const m of r.messages) {
        // Inline config the mirror didn't neutralise (`/* global */`, `/* eslint rule: 0 */`)
        // produces a "has no effect because of noInlineConfig" notice with no rule.
        if (m.ruleId === null && m.message.includes("noInlineConfig")) {
          continue;
        }
        const rule = m.ruleId ?? (m.fatal ? "fatal" : "other");
        eslintCounts[rule] = (eslintCounts[rule] ?? 0) + 1;
      }
    }
    const biome = runBiome(root, files, configDir);
    const biomeCounts = {};
    for (const d of biome) {
      biomeCounts[d.rule] = (biomeCounts[d.rule] ?? 0) + 1;
    }
    // Keep Biome's floating/misused hits by line, to compare with typescript-eslint's.
    const biomeHits = biome
      .filter(
        (d) => d.rule === "noFloatingPromises" || d.rule === "noMisusedPromises"
      )
      .map((d) => ({ file: d.file, line: d.line, rule: d.rule }));
    // Lines where Biome's syntactic rules disagree with Oxlint's raw hits, with the code, so
    // every divergence can be explained by reading it.
    const oxRaw = JSON.parse(
      readFileSync(
        join(HERE, "out", "rule-census", TOPIC, `${name}.raw.json`),
        "utf8"
      )
    ).hits;
    const text = new Map();
    const codeAt = (file, line) => {
      if (!text.has(file)) {
        text.set(file, readFileSync(join(root, file), "utf8").split("\n"));
      }
      return text.get(file)[line - 1]?.trim().slice(0, 120);
    };
    const mismatches = [];
    for (const [biomeRule, oxRule] of [
      ["noAwaitInLoops", "no-await-in-loop"],
      ["useAwait", "require-await"],
    ]) {
      const tally = (keys) =>
        keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());
      const want = tally(
        oxRaw.filter((h) => h.rule === oxRule).map((h) => `${h.file}:${h.line}`)
      );
      const got = tally(
        biome
          .filter((d) => d.rule === biomeRule)
          .map((d) => `${d.file}:${d.line}`)
      );
      for (const k of new Set([...want.keys(), ...got.keys()])) {
        if ((want.get(k) ?? 0) !== (got.get(k) ?? 0)) {
          const [file, line] = [
            k.slice(0, k.lastIndexOf(":")),
            Number(k.slice(k.lastIndexOf(":") + 1)),
          ];
          mismatches.push({
            biome: got.get(k) ?? 0,
            code: codeAt(file, line),
            file,
            line,
            oxlint: want.get(k) ?? 0,
            rule: biomeRule,
          });
        }
      }
    }
    const parseErrors = [
      ...new Set(biome.filter((d) => d.rule === "parse").map((d) => d.file)),
    ];
    perRepo[name] = {
      biome: biomeCounts,
      biomeLineMismatches: mismatches,
      biomeParseErrorFiles: parseErrors,
      eslint: eslintCounts,
      files: files.length,
    };
    mkdirSync(WORK, { recursive: true });
    writeFileSync(
      join(WORK, `${name}.biome-hits.json`),
      JSON.stringify(biomeHits)
    );
    console.log(name, JSON.stringify(perRepo[name]));
  }
  return perRepo;
};

const main = async () => {
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    tools: {
      "@biomejs/biome": version("@biomejs/biome", CLI),
      "@typescript-eslint/eslint-plugin": version(
        "@typescript-eslint/eslint-plugin",
        CLI
      ),
      eslint: version("eslint", CLI),
      "eslint-plugin-promise": version("eslint-plugin-promise", CLI),
      oxlint: require(oxlintPkg).version,
      "oxlint-tsgolint": require(tsgolintPkg).version,
      typescript: ts.version,
    },
  };
  const path = join(RESULTS_DIR, "linters.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : {};
  if (args.includes("--calibration")) {
    result.calibration = await calibration();
  }
  if (args.includes("--corpus")) {
    result.corpus = await corpus();
  }
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify({ ...previous, ...result }, null, 2)}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
