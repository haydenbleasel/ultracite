// Runs Ultracite's security rules in Oxlint, ESLint and Biome on the same code.
//
//   --calibration  the hand-written cases in calibration/security-rules/, through each linter's
//                  full Ultracite presets (Oxlint core + react + js-plugins with --type-aware;
//                  ESLint core + react + type-aware with the cases' tsconfig; Biome core + react).
//                  Every security-rule diagnostic is mapped to the case it falls in. Biome's
//                  security rules that Ultracite leaves off (noSecrets, the nursery rules) run in
//                  a second pass, reported separately.
//   --corpus       the raw mirror written by rule-census.cjs (disable directives neutralised),
//                  with only the security rules: ESLint as Ultracite's core + react presets
//                  configure them (same plugins, parsers and file globs), and Biome's security
//                  rules. Oxlint's rows come from the census itself. Per-hit rows go to
//                  out/security-rules/<repo>.<linter>.json.
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/security-linters.cjs --calibration --corpus
// Writes results/<topic>/linters.json. The module also exports the runners, which
// security-advisory-fixes.cjs reuses.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { extname, join, relative } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./security-lib.cjs");
const config = require("./repos.json");
const { biomeBin } = require("./tools.cjs");

const { ESLint } = require(require.resolve("eslint", { paths: [lib.CLI] }));

// ── the security rule set, from the inventory ──────────────────────────
const inventory = () =>
  JSON.parse(readFileSync(join(lib.RESULTS_DIR, "inventory.json"), "utf8"));

const securityNames = () => {
  const inv = inventory();
  const eslint = new Set(inv.rules.map((r) => r.eslint.name));
  const oxlint = new Set(inv.rules.map((r) => r.oxlint.name));
  const biome = new Set(inv.biome.map((r) => r.rule.split("/")[1]));
  return { biome, eslint, oxlint };
};

// ── ESLint, from Ultracite's own preset modules ────────────────────────
const importDefault = async (path) =>
  (await import(pathToFileURL(path).href)).default;

const eslintConfig = async ({ typed, keep }) => {
  const core = await importDefault(
    join(lib.CLI, "config/eslint/core/eslint.config.mjs")
  );
  const react = await importDefault(
    join(lib.CLI, "config/eslint/react/eslint.config.mjs")
  );
  const typeAware = typed
    ? await importDefault(
        join(lib.CLI, "config/eslint/type-aware/eslint.config.mjs")
      )
    : [];
  const blocks = [...core, ...react, ...typeAware]
    // The shared ignores include `build` and `out`, which would drop whole directories of the
    // corpus (next.js has packages/next/src/build) and the mirror itself.
    .filter((block) => !(block.ignores && Object.keys(block).length === 1))
    .map((block) =>
      block.rules && keep
        ? {
            ...block,
            rules: Object.fromEntries(
              Object.entries(block.rules).filter(([name]) => keep(name))
            ),
          }
        : block
    );
  return blocks;
};

const runEslint = async ({
  cwd,
  files,
  typed = false,
  securityOnly = true,
}) => {
  const { eslint: names } = securityNames();
  const keep = securityOnly ? (name) => names.has(name) : null;
  const blocks = await eslintConfig({ keep, typed });
  const overrideConfig = [
    ...blocks,
    {
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "off",
      },
    },
  ];
  if (typed) {
    overrideConfig.push({
      files: ["**/*.{ts,tsx,mts,cts}"],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir: cwd },
      },
    });
  }
  const eslint = new ESLint({
    cwd,
    errorOnUnmatchedPattern: false,
    ignore: false,
    overrideConfig,
    overrideConfigFile: true,
  });
  const out = [];
  const CHUNK = 300;
  for (let i = 0; i < files.length; i += CHUNK) {
    const results = await eslint.lintFiles(files.slice(i, i + CHUNK));
    for (const r of results) {
      for (const m of r.messages) {
        // Messages without a rule are either fatal parse errors or notes about inline config
        // comments, which noInlineConfig ignores.
        let rule = m.ruleId;
        if (!rule) {
          rule = m.fatal ? `parse: ${m.message}` : "inline-config-ignored";
        }
        out.push({
          column: m.column,
          endLine: m.endLine ?? m.line,
          file: relative(cwd, r.filePath),
          line: m.line,
          message: m.message,
          rule,
        });
      }
    }
  }
  return out;
};

// ── Oxlint, Ultracite's core + react + js-plugins presets ──────────────
const SCOPE_ALIASES = { "react-hooks": "react" };
const oxlintRule = (code) => {
  const match = /^([a-z0-9_-]+)\((.+)\)$/.exec(code ?? "");
  if (!match) {
    return `parse: ${code}`;
  }
  const scope = match[1].replace(/^eslint-plugin-/, "");
  if (scope === "eslint") {
    return match[2];
  }
  const name = scope.replaceAll("_", "-");
  return `${SCOPE_ALIASES[name] ?? name}/${match[2]}`;
};

// `rootEnv` copies core's `env` onto the root config. Oxlint doesn't inherit `env` through
// `extends`, and the config `ultracite init` generates doesn't re-declare it, so by default the
// browser globals core declares are missing; this variant measures what that costs.
const writeOxlintConfig = (presets, rootEnv = false) => {
  mkdirSync(lib.OUT_DIR, { recursive: true });
  const file = join(
    lib.OUT_DIR,
    `oxlint.${presets.join("+")}${rootEnv ? ".env" : ""}.config.mjs`
  );
  const url = (name) =>
    JSON.stringify(
      pathToFileURL(join(lib.CLI, "config/oxlint", name, "index.mjs")).href
    );
  const lines = presets.map((p, i) => `import preset${i} from ${url(p)};`);
  const hasJs = presets.includes("js-plugins");
  if (hasJs) {
    lines.push(`import { jsPluginSettings } from ${url("js-plugins")};`);
  }
  lines.push(
    "",
    "// Generated by security-linters.cjs: Ultracite's presets, wired the way `ultracite init` does.",
    `export default { extends: [${presets.map((_, i) => `preset${i}`).join(", ")}]${hasJs ? `, jsPlugins: preset${presets.indexOf("js-plugins")}.jsPlugins, settings: jsPluginSettings` : ""}${rootEnv ? ", env: preset0.env" : ""} };`,
    ""
  );
  writeFileSync(file, lines.join("\n"));
  return file;
};

// Oxlint looks for tsgolint in the project's node_modules/.bin; point it at the platform binary
// that oxlint-tsgolint (installed next to oxlint) resolves to.
const tsgolintPath = () => {
  const pkg = require.resolve("oxlint-tsgolint/package.json", {
    paths: [join(lib.oxlintBin, "..", "..")],
  });
  return require.resolve(
    `@oxlint-tsgolint/${process.platform}-${process.arch}/tsgolint${process.platform === "win32" ? ".exe" : ""}`,
    { paths: [join(pkg, "..")] }
  );
};

const runOxlint = ({
  cwd,
  files,
  presets = ["core", "react", "js-plugins"],
  rootEnv = false,
  typeAware = false,
}) => {
  const configFile = writeOxlintConfig(presets, rootEnv);
  const env = typeAware
    ? { ...process.env, OXLINT_TSGOLINT_PATH: tsgolintPath() }
    : process.env;
  const out = [];
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    let stdout;
    try {
      stdout = execFileSync(
        process.execPath,
        [
          lib.oxlintBin,
          "-c",
          configFile,
          "--disable-nested-config",
          ...(typeAware ? ["--type-aware"] : []),
          "--format",
          "json",
          ...files.slice(i, i + CHUNK),
        ],
        {
          cwd,
          encoding: "utf8",
          env,
          maxBuffer: 1 << 28,
          stdio: ["ignore", "pipe", "pipe"],
        }
      );
    } catch (error) {
      stdout = error.stdout;
      if (!stdout) {
        throw error;
      }
    }
    const report = JSON.parse(stdout);
    if (report.number_of_files !== Math.min(CHUNK, files.length - i)) {
      throw new Error(
        `oxlint linted ${report.number_of_files} of ${Math.min(CHUNK, files.length - i)} files`
      );
    }
    for (const d of report.diagnostics) {
      const span = d.labels?.[0]?.span ?? {};
      out.push({
        column: span.column,
        endLine: span.line,
        file: d.filename,
        line: span.line,
        message: d.message,
        rule: oxlintRule(d.code),
      });
    }
  }
  return out;
};

// ── Biome ──────────────────────────────────────────────────────────────
const BIOME_SECURITY = {
  security: [
    "noBlankTarget",
    "noDangerouslySetInnerHtml",
    "noDangerouslySetInnerHtmlWithChildren",
    "noGlobalEval",
    "noScriptUrl",
  ],
  suspicious: ["noDocumentCookie"],
};
// Available in Biome but off in Ultracite: noSecrets is turned off, nursery rules are never on.
const BIOME_OFF = {
  nursery: ["noImpliedEval", "noUnsafeIframeSandbox", "useIframeSandbox"],
  security: ["noSecrets"],
};

const writeBiomeConfig = (name, body) => {
  const dir = join(lib.OUT_DIR, `biome-${name}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "biome.json"), JSON.stringify(body, null, 2));
  return dir;
};

const biomeConfigFor = (mode) => {
  const base = {
    assist: { enabled: false },
    files: { ignoreUnknown: true, maxSize: 10_000_000 },
    formatter: { enabled: false },
    // VS Code uses parameter decorators (dependency injection), which Biome only parses with
    // this flag; without it 37 files report "Decorators are not valid here".
    javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
    root: true,
    vcs: { enabled: false },
  };
  if (mode === "ultracite") {
    // Ultracite's presets as published, extended by absolute path.
    return writeBiomeConfig("ultracite", {
      ...base,
      extends: [
        join(lib.CLI, "config/biome/core/biome.jsonc"),
        join(lib.CLI, "config/biome/react/biome.jsonc"),
      ],
    });
  }
  const groups = mode === "security" ? BIOME_SECURITY : BIOME_OFF;
  const rules = { recommended: false };
  for (const [group, names] of Object.entries(groups)) {
    rules[group] = Object.fromEntries(names.map((n) => [n, "error"]));
  }
  return writeBiomeConfig(mode, { ...base, linter: { enabled: true, rules } });
};

const runBiome = ({ cwd, files, mode = "security" }) => {
  const configDir = biomeConfigFor(mode);
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
    for (const d of report.diagnostics ?? []) {
      const category = d.category ?? "";
      out.push({
        column: d.location?.start?.column,
        endLine: d.location?.end?.line ?? d.location?.start?.line,
        file: d.location?.path,
        line: d.location?.start?.line,
        message: typeof d.message === "string" ? d.message : null,
        rule: category.replace(/^lint\//, ""),
      });
    }
  }
  return out;
};

// ── calibration ────────────────────────────────────────────────────────
const CASE_START = /^\s*\/\/ ([A-Z]\d{2}): (.+)$/;

const calibrationCases = () => {
  const files = readdirSync(lib.CALIBRATION_DIR).filter((f) =>
    /\.tsx?$/.test(f)
  );
  const cases = [];
  const starts = {};
  for (const file of files) {
    const lines = readFileSync(join(lib.CALIBRATION_DIR, file), "utf8").split(
      "\n"
    );
    starts[file] = [];
    lines.forEach((text, i) => {
      const m = CASE_START.exec(text);
      if (m) {
        cases.push({ description: m[2], file, id: m[1], line: i + 1 });
        starts[file].push({ id: m[1], line: i + 1 });
      }
    });
  }
  const caseOf = (file, line) => {
    const list = starts[file] ?? [];
    let found = null;
    for (const s of list) {
      if (s.line <= line) {
        found = s.id;
      }
    }
    return found;
  };
  return { caseOf, cases, files };
};

const calibration = async () => {
  const { caseOf, cases, files } = calibrationCases();
  const names = securityNames();
  const isSecurity = {
    biome: (rule) => names.biome.has(rule.split("/").at(-1)),
    eslint: (rule) => names.eslint.has(rule),
    oxlint: (rule) => names.oxlint.has(rule),
  };
  const cwd = lib.CALIBRATION_DIR;
  // Each configuration a user can choose: the defaults, then each opt-in layered on top.
  const raw = {
    oxlint: runOxlint({ cwd, files, presets: ["core", "react"] }),
    "oxlint (env on root)": runOxlint({
      cwd,
      files,
      presets: ["core", "react"],
      rootEnv: true,
    }),
    "oxlint +js-plugins": runOxlint({ cwd, files }),
    "oxlint +js-plugins +type-aware": runOxlint({
      cwd,
      files,
      typeAware: true,
    }),
    eslint: await runEslint({ cwd, files, securityOnly: false }),
    "eslint +type-aware": await runEslint({
      cwd,
      files,
      securityOnly: false,
      typed: true,
    }),
    biome: runBiome({ cwd, files, mode: "ultracite" }),
    "biome (off in Ultracite)": runBiome({ cwd, files, mode: "off" }),
  };
  const byCase = Object.fromEntries(
    cases.map((c) => [c.id, { ...c, hits: {}, other: {} }])
  );
  const stray = [];
  for (const [tool, diags] of Object.entries(raw)) {
    const security = tool.startsWith("biome")
      ? isSecurity.biome
      : isSecurity[tool.split(" ")[0]];
    for (const d of diags) {
      const id = caseOf(d.file, d.line);
      const bucket =
        security(d.rule) || tool === "biome (off in Ultracite)"
          ? "hits"
          : "other";
      if (!id) {
        if (bucket === "hits") {
          stray.push({ tool, ...d });
        }
        continue;
      }
      byCase[id][bucket][tool] ??= [];
      if (!byCase[id][bucket][tool].includes(d.rule)) {
        byCase[id][bucket][tool].push(d.rule);
      }
    }
  }
  const table = Object.values(byCase);
  for (const row of table) {
    for (const bucket of ["hits", "other"]) {
      for (const list of Object.values(row[bucket])) {
        list.sort();
      }
    }
    const cell = (t) => (row.hits[t] ?? []).join(", ") || "-";
    // Rules each opt-in adds over the configuration below it.
    const added = (t, base) =>
      (row.hits[t] ?? [])
        .filter((r) => !(row.hits[base] ?? []).includes(r))
        .join(", ") || "-";
    console.log(
      `${row.id} ${row.description.slice(0, 44).padEnd(44)} | ox: ${cell("oxlint")} | env: ${added("oxlint (env on root)", "oxlint")} | +js: ${added("oxlint +js-plugins", "oxlint")} | +ta: ${added("oxlint +js-plugins +type-aware", "oxlint +js-plugins")} | es: ${cell("eslint")} | +ta: ${added("eslint +type-aware", "eslint")} | bi: ${cell("biome")} | off: ${cell("biome (off in Ultracite)")}`
    );
  }
  if (stray.length > 0) {
    console.log("security diagnostics outside any case:", stray);
  }
  const parseErrors = Object.fromEntries(
    Object.entries(raw).map(([tool, diags]) => [
      tool,
      diags
        .filter((d) => d.rule.startsWith("parse"))
        .map((d) => `${d.file}:${d.line} ${d.message}`),
    ])
  );
  return { cases: table, parseErrors, stray };
};

// ── corpus ─────────────────────────────────────────────────────────────
const walk = (dir, root = dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      walk(abs, root, out);
    } else if (/\.[cm]?[jt]sx?$/.test(extname(e.name))) {
      out.push(relative(root, abs));
    }
  }
  return out;
};

// Sorted by rule name: linters report files in a nondeterministic order.
const tally = (diags) => {
  const counts = {};
  for (const d of diags) {
    counts[d.rule] = (counts[d.rule] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
  );
};

const corpus = async () => {
  const mirrorRoot = join(lib.HERE, "out", "rule-census", lib.TOPIC, "mirror");
  if (!existsSync(mirrorRoot)) {
    throw new Error(
      `Run security-census.cjs first (no mirror at ${mirrorRoot}).`
    );
  }
  const perRepo = {};
  for (const { name } of config.repos) {
    const root = join(mirrorRoot, name);
    if (!existsSync(root)) {
      continue;
    }
    const files = walk(root).sort();
    const started = Date.now();
    const eslint = await runEslint({ cwd: root, files });
    const biome = runBiome({ cwd: root, files, mode: "security" });
    const biomeOff = runBiome({ cwd: root, files, mode: "off" });
    const parse = eslint.filter((d) => d.rule.startsWith("parse"));
    for (const [tool, rows] of Object.entries({
      biome,
      "biome-off": biomeOff,
      eslint,
    })) {
      writeFileSync(
        join(lib.OUT_DIR, `${name}.${tool}.json`),
        JSON.stringify({ hits: rows, repo: name, tool }, null, 1)
      );
    }
    perRepo[name] = {
      biome: tally(biome),
      "biome (off in Ultracite)": tally(biomeOff),
      eslint: tally(
        eslint.filter(
          (d) =>
            !d.rule.startsWith("parse") && d.rule !== "inline-config-ignored"
        )
      ),
      eslintParseErrors: parse.map((d) => `${d.file}:${d.line} ${d.message}`),
      files: files.length,
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    console.log(name, JSON.stringify(perRepo[name]));
  }
  return perRepo;
};

const main = async () => {
  mkdirSync(lib.OUT_DIR, { recursive: true });
  const path = join(lib.RESULTS_DIR, "linters.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : {};
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    tools: lib.toolVersions(),
  };
  if (lib.flag("calibration")) {
    result.calibration = await calibration();
  }
  if (lib.flag("corpus")) {
    result.corpus = await corpus();
  }
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify({ ...previous, ...result }, null, 2)}\n`
  );
};

module.exports = { runBiome, runEslint, runOxlint, securityNames };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
void rmSync;
