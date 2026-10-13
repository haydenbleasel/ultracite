// Shared definitions for the dead-code scripts: which rules count as dead-code or duplication
// rules, and runners for Ultracite's Oxlint, ESLint and Biome presets and the TypeScript compiler
// that keep each linter's full message and help text (what `ultracite fix --claude/--codex` hands
// an agent).
//
// "Dead-code rule" here means a rule about code that has no effect: names declared and never read
// (variables, imports, parameters, private members, labels, collections), values written and never
// read (dead stores, useless assignments, unused expression statements, ignored return values),
// code that can never run (unreachable statements and loops, constant conditions, duplicate
// conditions), and the `no-useless-*` family. "Duplication rule" means a rule about repeated code:
// identical functions, branches, expressions and strings, and duplicate imports, keys, cases and
// members.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const { ULTRACITE, biomeBin, dirs } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const CLI = join(ULTRACITE, "packages/cli");

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "dead-code");
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", "dead-code");
const CALIBRATION_DIR = join(HERE, "calibration", "dead-code");
const EXAMPLES_DIR = join(HERE, "examples", "dead-code");
const DOGFOOD = new Set(["ultracite"]);
const EXTERNAL = require("./repos.json")
  .repos.map((r) => r.name)
  .filter((n) => !DOGFOOD.has(n));

// ── categories ─────────────────────────────────────────────────────────
// Names are normalised to Oxlint's spelling (`typescript/` for `@typescript-eslint/`, `import/`
// for `import-x/`); Biome rules are `group/ruleName`.
const CATEGORIES = {
  "unused-names":
    "a declared name is never read: variables, imports, parameters, private members, labels, collections",
  "dead-values":
    "a value is computed or written and never read: dead stores, useless assignments, unused expressions, ignored return values",
  unreachable:
    "code that can never run, or a branch that can never be taken: after return/throw, constant or duplicate conditions",
  useless: "the no-useless-* family: code with no effect that can be removed",
  duplication:
    "repeated code: identical functions, branches, expressions and strings; duplicate imports, keys, cases and members",
};

const EXPLICIT = {
  // unused names
  "no-unused-vars": "unused-names",
  "typescript/no-unused-vars": "unused-names",
  "sonarjs/no-unused-vars": "unused-names",
  "sonarjs/unused-import": "unused-names",
  "unused-imports/no-unused-imports": "unused-names",
  "unused-imports/no-unused-vars": "unused-names",
  "sonarjs/no-unused-function-argument": "unused-names",
  "no-unused-private-class-members": "unused-names",
  "typescript/no-unused-private-class-members": "unused-names",
  "no-unused-labels": "unused-names",
  "sonarjs/no-unused-collection": "unused-names",
  "no-unassigned-vars": "unused-names",
  "import/no-unused-modules": "unused-names",
  "react/no-unused-prop-types": "unused-names",
  "react/no-unused-state": "unused-names",
  "react/no-unused-class-component-methods": "unused-names",
  "unicorn/no-unused-properties": "unused-names",
  "sonarjs/unused-named-groups": "unused-names",
  // dead values
  "no-useless-assignment": "dead-values",
  "sonarjs/no-dead-store": "dead-values",
  "no-unused-expressions": "dead-values",
  "typescript/no-unused-expressions": "dead-values",
  "sonarjs/no-ignored-return": "dead-values",
  "unicorn/no-unused-builtin-method-return": "dead-values",
  "unicorn/no-unused-iterator-helper": "dead-values",
  "sonarjs/no-useless-increment": "dead-values",
  "sonarjs/no-redundant-assignments": "dead-values",
  "no-self-assign": "dead-values",
  "sonarjs/no-element-overwrite": "dead-values",
  "sonarjs/no-empty-collection": "dead-values",
  "sonarjs/no-use-of-empty-return-value": "dead-values",
  "sonarjs/no-unthrown-error": "dead-values",
  "sonarjs/prefer-immediate-return": "dead-values",
  "unicorn/no-useless-compound-assignment": "dead-values",
  // unreachable
  "no-unreachable": "unreachable",
  "no-unreachable-loop": "unreachable",
  "no-constant-condition": "unreachable",
  "no-constant-binary-expression": "unreachable",
  "sonarjs/no-redundant-jump": "unreachable",
  "sonarjs/no-gratuitous-expressions": "unreachable",
  "typescript/no-unnecessary-condition": "unreachable",
  "no-fallthrough": null,
  // duplication
  "sonarjs/no-identical-functions": "duplication",
  "sonarjs/no-duplicated-branches": "duplication",
  "sonarjs/no-all-duplicated-branches": "duplication",
  "sonarjs/no-duplicate-string": "duplication",
  "sonarjs/no-identical-expressions": "duplication",
  "sonarjs/no-identical-conditions": "duplication",
  "sonarjs/no-duplicate-in-composite": "duplication",
  "no-duplicate-imports": "duplication",
  "import/no-duplicates": "duplication",
  "no-dupe-keys": "duplication",
  "no-dupe-args": "duplication",
  "no-dupe-class-members": "duplication",
  "typescript/no-dupe-class-members": "duplication",
  "no-dupe-else-if": "duplication",
  "no-duplicate-case": "duplication",
  "typescript/no-duplicate-enum-values": "duplication",
  "typescript/no-duplicate-type-constituents": "duplication",
  "react/jsx-no-duplicate-props": "duplication",
  "unicorn/no-duplicate-if-branches": "duplication",
  "unicorn/no-duplicate-logical-operands": "duplication",
  "unicorn/no-duplicate-loops": "duplication",
  "unicorn/no-duplicate-set-values": "duplication",
};

// Test-framework duplication rules (titles, hooks, parameterised cases) are about test files,
// which the corpus excludes. They're listed in the inventory but not counted as dead code.
const TEST_ONLY =
  /^(?:jest|vitest)\/|^sonarjs\/no-duplicate-(?:test-title|parameterized-test-case)$|^sonarjs\/no-empty-test/;

// Oxlint/ESLint names (Oxlint spelling).
const categoryOf = (rule) => {
  if (rule in EXPLICIT) {
    return EXPLICIT[rule];
  }
  if (TEST_ONLY.test(rule)) {
    return null;
  }
  if (/(?:^|\/)no-useless-/.test(rule)) {
    return "useless";
  }
  return null;
};

// Biome names: `group/ruleName`.
const BIOME_EXPLICIT = {
  "correctness/noUnusedVariables": "unused-names",
  "correctness/noUnusedImports": "unused-names",
  "correctness/noUnusedFunctionParameters": "unused-names",
  "correctness/noUnusedPrivateClassMembers": "unused-names",
  "correctness/noUnusedLabels": "unused-names",
  "suspicious/noUnassignedVariables": "unused-names",
  "correctness/noUnusedInstantiation": "dead-values",
  "suspicious/noUnusedExpressions": "dead-values",
  "correctness/noSelfAssign": "dead-values",
  "correctness/noUnreachable": "unreachable",
  "correctness/noUnreachableSuper": "unreachable",
  "correctness/noConstantCondition": "unreachable",
  "suspicious/noUnnecessaryConditions": "unreachable",
  "suspicious/noConstantBinaryExpressions": "unreachable",
  "complexity/noUselessCatchBinding": "useless",
  "style/noUselessElse": "useless",
  "correctness/noUnusedTemplateLiteral": null,
  "style/noUnusedTemplateLiteral": null,
};
const biomeCategoryOf = (rule) => {
  if (rule in BIOME_EXPLICIT) {
    return BIOME_EXPLICIT[rule];
  }
  const name = rule.split("/").at(-1);
  if (/^noUseless/.test(name)) {
    return "useless";
  }
  if (/^(?:noDuplicate|noDupe)/.test(name)) {
    // CSS, GraphQL, JSON and package.json duplicates aren't about JavaScript code.
    if (
      /AtImportRules|CustomProperties|FontNames|Properties$|SelectorsKeyframeBlock|Selectors$|FieldDefinitionNames|Fields$|GraphqlOperationName|InputFieldNames|ArgumentNames|VariableNames|Dependencies|Attributes$|EnumValueNames|Classes$|TestHooks/.test(
        name
      )
    ) {
      return null;
    }
    return "duplication";
  }
  return null;
};

// Normalise ESLint plugin prefixes to Oxlint's spelling.
const toOxlintName = (name) =>
  name
    .replace(/^@typescript-eslint\//, "typescript/")
    .replace(/^import-x\//, "import/")
    .replace(/^react-hooks\//, "react/");

// ── tools ──────────────────────────────────────────────────────────────
const oxlintPkgPath = require.resolve("oxlint/package.json", {
  paths: [ULTRACITE],
});
const oxlintBin = join(dirname(oxlintPkgPath), "bin", "oxlint");

const versionOf = (name, base) => {
  try {
    return require(require.resolve(`${name}/package.json`, { paths: [base] }))
      .version;
  } catch {
    // ./package.json isn't exported; walk up from the entry point.
  }
  let dir;
  try {
    dir = dirname(require.resolve(name, { paths: [base] }));
  } catch {
    return null;
  }
  while (dir !== dirname(dir)) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      const json = JSON.parse(readFileSync(pkg, "utf8"));
      if (json.name === name) {
        return json.version;
      }
    }
    dir = dirname(dir);
  }
  return null;
};

const ts = require(join(dirs.typescript, "lib/typescript.js"));

const toolVersions = () => ({
  node: process.version,
  oxlint: require(oxlintPkgPath).version,
  "oxlint-tsgolint": versionOf("oxlint-tsgolint", CLI),
  eslint: versionOf("eslint", CLI),
  "@eslint/js": versionOf("@eslint/js", CLI),
  "@typescript-eslint/eslint-plugin": versionOf(
    "@typescript-eslint/eslint-plugin",
    CLI
  ),
  "@typescript-eslint/typescript-estree": versionOf(
    "@typescript-eslint/typescript-estree",
    dirs.tsParser
  ),
  "eslint-plugin-sonarjs (ESLint)": versionOf("eslint-plugin-sonarjs", CLI),
  "eslint-plugin-sonarjs (Oxlint JS plugin)": versionOf(
    "eslint-plugin-sonarjs",
    ULTRACITE
  ),
  "eslint-plugin-unicorn": versionOf("eslint-plugin-unicorn", CLI),
  "eslint-plugin-unused-imports": versionOf(
    "eslint-plugin-unused-imports",
    CLI
  ),
  "eslint-plugin-import-x": versionOf("eslint-plugin-import-x", CLI),
  "@biomejs/biome": versionOf("@biomejs/biome", CLI),
  typescript: ts.version,
});

const gitHead = (dir) => {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
};

const permalink = (github, sha, file, line, endLine) =>
  `https://github.com/${github}/blob/${sha}/${file}#L${line}${endLine && endLine !== line ? `-L${endLine}` : ""}`;

const per10k = (n, lines) => Math.round((n / lines) * 1e5) / 10;
const pct = (a, b) => (b === 0 ? null : Math.round((a / b) * 1000) / 10);
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── Oxlint ─────────────────────────────────────────────────────────────
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

// The root config `ultracite init` writes: extends the presets, and re-declares jsPlugins and
// settings on the root when js-plugins is selected (oxlint doesn't merge them from extends).
// `env` is not re-declared, as in init (security-rules REPORT §7).
const writeOxlintConfig = (presets, dir = OUT_DIR) => {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `oxlint.${presets.join("+")}.config.mjs`);
  const url = (name) =>
    JSON.stringify(
      pathToFileURL(join(CLI, "config/oxlint", name, "index.mjs")).href
    );
  const lines = presets.map((p, i) => `import preset${i} from ${url(p)};`);
  const hasJs = presets.includes("js-plugins");
  if (hasJs) {
    lines.push(`import { jsPluginSettings } from ${url("js-plugins")};`);
  }
  lines.push(
    "",
    "// Generated by dead-code-lib.cjs: Ultracite's presets, wired the way `ultracite init` does.",
    `export default { extends: [${presets.map((_, i) => `preset${i}`).join(", ")}]${hasJs ? `, jsPlugins: preset${presets.indexOf("js-plugins")}.jsPlugins, settings: jsPluginSettings` : ""} };`,
    ""
  );
  writeFileSync(file, lines.join("\n"));
  return file;
};

const tsgolintPath = () => {
  const pkg = realpathSync(
    require.resolve("oxlint-tsgolint/package.json", { paths: [CLI] })
  );
  return join(
    dirname(
      require.resolve(
        `@oxlint-tsgolint/${process.platform}-${process.arch}/package.json`,
        { paths: [dirname(pkg)] }
      )
    ),
    "tsgolint"
  );
};

const runOxlint = ({
  cwd,
  files,
  presets = ["core", "react"],
  typeAware = false,
  configFile = null,
  keep = null,
}) => {
  const config = configFile ?? writeOxlintConfig(presets);
  const env = typeAware
    ? { ...process.env, OXLINT_TSGOLINT_PATH: tsgolintPath() }
    : process.env;
  const out = [];
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    let stdout;
    try {
      stdout = execFileSync(
        process.execPath,
        [
          oxlintBin,
          "-c",
          config,
          "--disable-nested-config",
          ...(typeAware ? ["--type-aware"] : []),
          "--format",
          "json",
          ...chunk,
        ],
        {
          cwd,
          encoding: "utf8",
          env,
          maxBuffer: 1 << 29,
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
    if (report.number_of_files !== chunk.length) {
      throw new Error(
        `oxlint linted ${report.number_of_files} of ${chunk.length} files`
      );
    }
    for (const d of report.diagnostics) {
      const rule = oxlintRule(d.code);
      if (keep && !keep(rule)) {
        continue;
      }
      const span = d.labels?.[0]?.span ?? {};
      out.push({
        column: span.column,
        file: d.filename,
        help: d.help ?? null,
        label: d.labels?.[0]?.label ?? null,
        length: span.length,
        line: span.line,
        message: d.message,
        offset: span.offset,
        rule,
        url: d.url ?? null,
      });
    }
  }
  return out;
};

// ── ESLint, from Ultracite's own preset modules ────────────────────────
const importDefault = async (path) =>
  (await import(pathToFileURL(path).href)).default;

const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));

const eslintBlocks = async ({ presets = ["core"], typed = false, keep }) => {
  const blocks = [];
  for (const name of presets) {
    blocks.push(
      ...(await importDefault(
        join(CLI, "config/eslint", name, "eslint.config.mjs")
      ))
    );
  }
  if (typed) {
    blocks.push(
      ...(await importDefault(
        join(CLI, "config/eslint/type-aware/eslint.config.mjs")
      ))
    );
  }
  return (
    blocks
      // The shared ignores include `build` and `out`, which would drop packages/next/src/build and
      // the mirror itself.
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
      )
  );
};

const eslintInstance = async ({
  cwd,
  presets = ["core"],
  typed = false,
  keep = null,
  extra = [],
}) => {
  const blocks = await eslintBlocks({ keep, presets, typed });
  const overrideConfig = [
    ...blocks,
    {
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "off",
      },
    },
    ...extra,
  ];
  if (typed) {
    overrideConfig.push({
      files: ["**/*.{ts,tsx,mts,cts}"],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir: cwd },
      },
    });
  }
  return new ESLint({
    cwd,
    errorOnUnmatchedPattern: false,
    ignore: false,
    overrideConfig,
    overrideConfigFile: true,
  });
};

const runEslint = async (opts) => {
  const { cwd, files } = opts;
  const eslint = await eslintInstance(opts);
  const out = [];
  const CHUNK = 300;
  for (let i = 0; i < files.length; i += CHUNK) {
    const results = await eslint.lintFiles(files.slice(i, i + CHUNK));
    for (const r of results) {
      for (const m of r.messages) {
        let rule = m.ruleId;
        if (!rule) {
          rule = m.fatal ? `parse: ${m.message}` : "inline-config-ignored";
        }
        out.push({
          column: m.column,
          endLine: m.endLine ?? m.line,
          file: relative(cwd, r.filePath),
          fix: Boolean(m.fix),
          line: m.line,
          message: m.message,
          messageId: m.messageId ?? null,
          rule,
          suggestions: (m.suggestions ?? []).map((s) => s.desc),
        });
      }
    }
  }
  return out;
};

// ── Biome ──────────────────────────────────────────────────────────────
const writeBiomeConfig = (name, body, dir = OUT_DIR) => {
  const configDir = join(dir, `biome-${name}`);
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, "biome.json"), JSON.stringify(body, null, 2));
  return configDir;
};

const BIOME_BASE = {
  assist: { enabled: false },
  files: { ignoreUnknown: true, maxSize: 10_000_000 },
  formatter: { enabled: false },
  // VS Code uses parameter decorators, which Biome only parses with this flag.
  javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
  root: true,
  vcs: { enabled: false },
};

// mode "ultracite": Ultracite's presets as published, extended by absolute path.
// mode { group: [rules] }: only those rules, recommended off.
const biomeConfigFor = (mode, presets = ["core"]) => {
  if (mode === "ultracite") {
    return writeBiomeConfig(`ultracite-${presets.join("+")}`, {
      ...BIOME_BASE,
      extends: presets.map((p) => join(CLI, "config/biome", p, "biome.jsonc")),
    });
  }
  const rules = { recommended: false };
  for (const [group, names] of Object.entries(mode)) {
    rules[group] = Object.fromEntries(names.map((n) => [n, "error"]));
  }
  return writeBiomeConfig("dead-code-rules", {
    ...BIOME_BASE,
    linter: { enabled: true, rules },
  });
};

const runBiome = ({ cwd, files, mode = "ultracite", presets, keep = null }) => {
  const configDir = biomeConfigFor(mode, presets);
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
          maxBuffer: 1 << 29,
          stdio: ["ignore", "pipe", "pipe"],
        }
      );
    } catch (error) {
      stdout = error.stdout;
    }
    const report = JSON.parse(stdout);
    for (const d of report.diagnostics ?? []) {
      const rule = (d.category ?? "").replace(/^lint\//, "");
      if (keep && !keep(rule)) {
        continue;
      }
      const path = d.location?.path;
      out.push({
        advices: d.advices ?? [],
        column: d.location?.start?.column,
        endLine: d.location?.end?.line ?? d.location?.start?.line,
        file: typeof path === "string" ? path : (path?.file ?? null),
        line: d.location?.start?.line,
        message: typeof d.message === "string" ? d.message : null,
        rule,
      });
    }
  }
  return out;
};

// Biome's terminal reporter prints the advice lines (the "i …" notes) that the JSON reporter
// leaves empty. Returns, per diagnostic start position, the advice text.
const biomeConsoleAdvices = ({ cwd, files, mode = "ultracite", presets }) => {
  const configDir = biomeConfigFor(mode, presets);
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        biomeBin,
        "lint",
        `--config-path=${configDir}`,
        "--colors=off",
        "--max-diagnostics=none",
        ...files,
      ],
      {
        cwd,
        encoding: "utf8",
        maxBuffer: 1 << 29,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }
  const out = [];
  const blocks = stdout.split(/\n(?=\S+:\d+:\d+ lint\/)/);
  for (const block of blocks) {
    const head = /^(\S+):(\d+):(\d+) lint\/(\S+)/.exec(block.trim());
    if (!head) {
      continue;
    }
    const notes = [...block.matchAll(/^\s+[iℹ] (.+)$/gm)].map((m) =>
      m[1].trim()
    );
    out.push({
      column: Number(head[3]),
      file: head[1],
      line: Number(head[2]),
      notes,
      rule: head[4],
    });
  }
  return out;
};

// ── TypeScript ─────────────────────────────────────────────────────────
// TypeScript's unused-declaration diagnostics (noUnusedLocals / noUnusedParameters), plus the
// unreachable-code and unused-label ones (allowUnreachableCode/allowUnusedLabels false).
const TS_UNUSED_CODES = {
  6133: "'{0}' is declared but its value is never read.",
  6138: "Property '{0}' is declared but its value is never read.",
  6192: "All imports in import declaration are unused.",
  6196: "'{0}' is declared but never used.",
  6198: "All destructured elements are unused.",
  6199: "All variables are unused.",
  6205: "All type parameters are unused.",
  7027: "Unreachable code detected.",
  7028: "Unused label.",
};

const runTsc = ({ dir, files, options = {} }) => {
  let base = {};
  const tsconfig = join(dir, "tsconfig.json");
  if (existsSync(tsconfig)) {
    const { config } = ts.readConfigFile(tsconfig, ts.sys.readFile);
    base = ts.parseJsonConfigFileContent(config, ts.sys, dir).options;
  }
  const program = ts.createProgram({
    options: {
      ...base,
      noEmit: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      allowUnreachableCode: false,
      allowUnusedLabels: false,
      ...options,
    },
    rootNames: files.map((f) => join(dir, f)),
  });
  return ts.getPreEmitDiagnostics(program).flatMap((d) => {
    if (!d.file) {
      return [];
    }
    const pos = d.file.getLineAndCharacterOfPosition(d.start);
    return [
      {
        code: d.code,
        column: pos.character + 1,
        file: relative(dir, d.file.fileName),
        line: pos.line + 1,
        message: ts.flattenDiagnosticMessageText(d.messageText, " "),
        rule: `TS${d.code}`,
        unused: d.code in TS_UNUSED_CODES,
      },
    ];
  });
};

module.exports = {
  BIOME_BASE,
  CALIBRATION_DIR,
  CATEGORIES,
  CLI,
  DOGFOOD,
  EXAMPLES_DIR,
  EXTERNAL,
  HERE,
  OUT_DIR,
  RESULTS_DIR,
  TOPIC,
  TS_UNUSED_CODES,
  ULTRACITE,
  arg,
  biomeBin,
  biomeCategoryOf,
  biomeConfigFor,
  biomeConsoleAdvices,
  categoryOf,
  escapeRegExp,
  eslintBlocks,
  eslintInstance,
  flag,
  gitHead,
  importDefault,
  oxlintBin,
  oxlintRule,
  pct,
  per10k,
  permalink,
  runBiome,
  runEslint,
  runOxlint,
  runTsc,
  toOxlintName,
  toolVersions,
  ts,
  tsgolintPath,
  versionOf,
  writeBiomeConfig,
  writeOxlintConfig,
};
