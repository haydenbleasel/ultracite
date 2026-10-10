// Runs the "same" escape-hatch rules in Oxlint, ESLint (typescript-eslint) and Biome on the same
// code, to see where implementations agree.
//
//   --calibration  the hand-written cases in calibration/escape-hatches/ (with a tsconfig, so
//                  ESLint's type-aware rules run too). Prints which rules fire on each case.
//   --corpus       the raw mirror written by rule-census.cjs (inline disables neutralised), with
//                  the three syntax-only rules in ESLint and Biome. Compare to Oxlint's raw counts.
//
// Usage (from the repo root):
//   node research/corpus/scripts/escape-hatch-linters.cjs --calibration [--corpus] [--topic type-escape-hatches]
// Writes results/<topic>/linters.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { join, relative, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const config = require("./repos.json");
const { biomeBin, dirs, ULTRACITE } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const args = process.argv.slice(2);
const TOPIC =
  args[args.indexOf("--topic") + 1] && args.includes("--topic")
    ? args[args.indexOf("--topic") + 1]
    : (process.env.RESEARCH_TOPIC ?? "type-escape-hatches");
const RESULTS_DIR = join(HERE, "results", TOPIC);
const CALIBRATION = join(HERE, "calibration", "escape-hatches");
const CLI = join(ULTRACITE, "packages/cli");

const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
const tsParser = require(
  require.resolve("@typescript-eslint/parser", { paths: [CLI] })
);
const tsPlugin = require(
  require.resolve("@typescript-eslint/eslint-plugin", { paths: [CLI] })
);
const version = (name, base) =>
  require(require.resolve(`${name}/package.json`, { paths: [base] })).version;

const oxlintPkg = require.resolve("oxlint/package.json", {
  paths: [ULTRACITE],
});
const oxlintBin = join(oxlintPkg, "..", "bin", "oxlint");

// typescript-eslint rules that police escape hatches. Syntax-only unless marked.
const ESLINT_RULES = [
  "ban-ts-comment",
  "consistent-type-assertions",
  "no-explicit-any",
  "no-extra-non-null-assertion",
  "no-non-null-asserted-optional-chain",
  "no-non-null-assertion",
  "no-unsafe-function-type",
  "prefer-ts-expect-error",
];
const ESLINT_TYPED_RULES = [
  "no-unnecessary-type-assertion",
  "no-unsafe-argument",
  "no-unsafe-assignment",
  "no-unsafe-call",
  "no-unsafe-member-access",
  "no-unsafe-return",
  "no-unsafe-type-assertion",
  "non-nullable-type-assertion-style",
];
const BIOME_RULES = {
  complexity: ["noBannedTypes"],
  style: ["noNonNullAssertion", "useAsConstAssertion"],
  suspicious: [
    "noEvolvingTypes",
    "noExplicitAny",
    "noExtraNonNullAssertion",
    "noImplicitAnyLet",
    "noNonNullAssertedOptionalChain",
    "noTsIgnore",
  ],
};

// ── ESLint ─────────────────────────────────────────────────────────────
const eslintFor = (cwd, rules, typed) =>
  new ESLint({
    cwd,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
        languageOptions: {
          parser: tsParser,
          parserOptions: typed
            ? { projectService: true, tsconfigRootDir: cwd }
            : { ecmaFeatures: { jsx: true } },
        },
        linterOptions: {
          noInlineConfig: true,
          reportUnusedDisableDirectives: "off",
        },
        plugins: { "@typescript-eslint": tsPlugin },
        rules: Object.fromEntries(
          rules.map((r) => [`@typescript-eslint/${r}`, "error"])
        ),
      },
    ],
    overrideConfigFile: true,
  });

const runEslint = async (cwd, files, rules, typed) => {
  const results = await eslintFor(cwd, rules, typed).lintFiles(files);
  return results.flatMap((r) =>
    r.messages.map((m) => ({
      file: relative(cwd, r.filePath),
      line: m.line,
      rule: m.ruleId ?? `parse: ${m.message}`,
    }))
  );
};

// ── Oxlint (Ultracite's core + react presets) ──────────────────────────
const writeOxlintConfig = () => {
  const dir = join(HERE, "out", "escape-hatches");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "oxlint.config.mjs");
  const preset = (name) =>
    JSON.stringify(
      pathToFileURL(join(CLI, "config/oxlint", name, "index.mjs")).href
    );
  writeFileSync(
    file,
    `import core from ${preset("core")};\nimport react from ${preset("react")};\n\nexport default { extends: [core, react] };\n`
  );
  return file;
};

const runOxlint = (cwd, files) => {
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        oxlintBin,
        "-c",
        writeOxlintConfig(),
        "--disable-nested-config",
        "--format",
        "json",
        ...files,
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 28 }
    );
  } catch (error) {
    stdout = error.stdout;
  }
  return JSON.parse(stdout).diagnostics.map((d) => ({
    file: d.filename,
    line: d.labels[0]?.span.line,
    rule: d.code.replace(/^typescript\((.+)\)$/, "$1"),
  }));
};

// ── Biome ──────────────────────────────────────────────────────────────
const writeBiomeConfig = () => {
  const dir = join(HERE, "out", "escape-hatches", "biome-config");
  mkdirSync(dir, { recursive: true });
  const rules = { recommended: false };
  for (const [group, names] of Object.entries(BIOME_RULES)) {
    rules[group] = Object.fromEntries(names.map((n) => [n, "error"]));
  }
  writeFileSync(
    join(dir, "biome.json"),
    JSON.stringify(
      {
        assist: { enabled: false },
        files: { ignoreUnknown: true, maxSize: 10_000_000 },
        formatter: { enabled: false },
        linter: { enabled: true, rules },
        root: true,
        vcs: { enabled: false },
      },
      null,
      2
    )
  );
  return dir;
};

const runBiome = (cwd, files) => {
  const configDir = writeBiomeConfig();
  const out = [];
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    let stdout;
    try {
      stdout = execFileSync(
        process.execPath,
        [
          biomeBin,
          "lint",
          `--config-path=${configDir}`,
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
    // Biome 2.5's JSON reporter: { location: { path, start: { line, column } }, category }.
    for (const d of report.diagnostics ?? []) {
      out.push({
        file: d.location?.path,
        line: d.location?.start?.line,
        rule: d.category?.split("/").at(-1) ?? d.category,
      });
    }
  }
  return out;
};

// ── calibration ────────────────────────────────────────────────────────
const CASE_ID = /\/\/ ([A-Z]\d+)\b/;

const calibration = async () => {
  const files = readdirSync(CALIBRATION).filter((f) => f.endsWith(".ts"));
  const caseAt = new Map();
  for (const file of files) {
    readFileSync(join(CALIBRATION, file), "utf8")
      .split("\n")
      .forEach((text, i) => {
        const id = CASE_ID.exec(text)?.[1] ?? /\b(D\d+)\b/.exec(text)?.[1];
        if (id) {
          caseAt.set(`${file}:${i + 1}`, id);
        }
      });
  }
  // A comment directive is reported on the comment line; map it to the case below it.
  const idFor = (d) =>
    caseAt.get(`${d.file}:${d.line}`) ??
    caseAt.get(`${d.file}:${d.line + 1}`) ??
    `${d.file}:${d.line}`;

  const tools = {
    biome: runBiome(CALIBRATION, files),
    eslint: await runEslint(
      CALIBRATION,
      files,
      [...ESLINT_RULES, ...ESLINT_TYPED_RULES],
      true
    ),
    oxlint: runOxlint(CALIBRATION, files).filter((d) =>
      /^(no-|ban-|consistent-type-assertions|prefer-ts|prefer-as|non-nullable|use-unknown)/.test(
        d.rule
      )
    ),
  };
  const byCase = {};
  for (const [tool, diags] of Object.entries(tools)) {
    for (const d of diags) {
      const id = idFor(d);
      byCase[id] ??= { biome: [], eslint: [], oxlint: [] };
      byCase[id][tool].push(d.rule.replace("@typescript-eslint/", ""));
    }
  }
  const ids = [...new Set([...caseAt.values()])];
  const table = ids.map((id) => ({
    id,
    ...Object.fromEntries(
      ["oxlint", "eslint", "biome"].map((t) => [
        t,
        [...new Set(byCase[id]?.[t] ?? [])].sort(),
      ])
    ),
  }));
  for (const row of table) {
    console.log(
      `${row.id.padEnd(4)} oxlint: ${row.oxlint.join(", ") || "-"} | eslint: ${row.eslint.join(", ") || "-"} | biome: ${row.biome.join(", ") || "-"}`
    );
  }
  const stray = Object.keys(byCase).filter((id) => !ids.includes(id));
  if (stray.length > 0) {
    console.log("unmapped diagnostics:", stray);
  }
  return table;
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

// Lines where Biome's count differs from the syntax census (escape-hatch-census.cjs sites), so
// every divergence can be explained by looking at the code.
const BIOME_KIND = {
  noExplicitAny: (s) => s.kind === "any",
  noNonNullAssertion: (s) => s.kind === "nonNull",
  noTsIgnore: (s) => s.kind === "tsComment" && s.directive === "@ts-ignore",
};
const biomeMismatches = (name, root, diags) => {
  const sitesPath = join(HERE, "out", "escape-hatches", `${name}.sites.json`);
  if (!existsSync(sitesPath)) {
    return null;
  }
  const { sites } = JSON.parse(readFileSync(sitesPath, "utf8"));
  const tally = (keys) =>
    keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());
  const out = [];
  for (const [rule, isKind] of Object.entries(BIOME_KIND)) {
    const want = tally(sites.filter(isKind).map((s) => `${s.file}:${s.line}`));
    const got = tally(
      diags.filter((d) => d.rule === rule).map((d) => `${d.file}:${d.line}`)
    );
    for (const key of new Set([...want.keys(), ...got.keys()])) {
      if ((want.get(key) ?? 0) !== (got.get(key) ?? 0)) {
        const [file, line] = key.split(":");
        out.push({
          biome: got.get(key) ?? 0,
          census: want.get(key) ?? 0,
          code: readFileSync(join(root, file), "utf8")
            .split("\n")
            [Number(line) - 1].trim()
            .slice(0, 120),
          file,
          line: Number(line),
          rule,
        });
      }
    }
  }
  return out;
};

const corpus = async () => {
  const mirrorRoot = join(HERE, "out", "rule-census", TOPIC, "mirror");
  if (!existsSync(mirrorRoot)) {
    throw new Error(`Run rule-census.cjs --topic ${TOPIC} first (no mirror).`);
  }
  const SYNTAX = ["ban-ts-comment", "no-explicit-any", "no-non-null-assertion"];
  const BIOME_MAP = {
    noExplicitAny: "no-explicit-any",
    noNonNullAssertion: "no-non-null-assertion",
    noTsIgnore: "noTsIgnore",
  };
  const perRepo = {};
  for (const { name } of config.repos) {
    const root = join(mirrorRoot, name);
    if (!existsSync(root)) {
      continue;
    }
    const files = walk(root);
    const count = (diags, map = (r) => r) => {
      const counts = {};
      for (const d of diags) {
        const rule = map(d.rule);
        counts[rule] = (counts[rule] ?? 0) + 1;
      }
      return counts;
    };
    const eslint = count(await runEslint(root, files, SYNTAX, false), (r) =>
      r.replace("@typescript-eslint/", "")
    );
    const biomeDiags = runBiome(root, files).filter((d) => d.rule in BIOME_MAP);
    const biome = count(biomeDiags, (r) => BIOME_MAP[r]);
    perRepo[name] = {
      biome,
      biomeLineMismatches: biomeMismatches(name, root, biomeDiags),
      eslint,
      files: files.length,
    };
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
      oxlint: require(oxlintPkg).version,
      typescript: version("typescript", dirs.tsParser),
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
