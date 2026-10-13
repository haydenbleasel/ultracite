// The dead-code post: when a coding agent gets an unused-variable or dead-store error, does it fix
// the problem the dead code points to (use the value that should have been used), delete the
// dead code, silence it (rename to `_x`, `void x;`, an artificial use, a suppression), or do
// something else? And does the answer depend on whether the dead code is a leftover or the
// symptom of a bug?
//
// Subjects come from research/corpus/examples/dead-code/ (dead-code-examples.cjs):
//   dc1  VS Code's McpRegistry.resolveConnection at the parent of microsoft/vscode#247184: a dead
//        initializer (ESLint's no-useless-assignment) that is the symptom of a bug. ESLint path.
//   dc2  Vite's serveStaticMiddleware: a leftover dead store (sonarjs/no-dead-store,
//        no-useless-assignment). ESLint path. (no-useless-return in a helper also fires, but
//        `eslint --fix` removes it before any handoff.)
//   dc3  tRPC's filterIgnored: a leftover unused local that Oxlint's default no-unused-vars
//        reports ("…Unused variables should start with a '_'."). Oxlint path.
//
// The agent's diagnostics are exactly what Ultracite's adapter for the subject's linter produces
// (packages/cli/src/agent-fix/linters.ts), from Ultracite's ESLint core preset or the Oxlint root
// config `ultracite init` writes, filtered to the corpus inventory's dead-code rules
// (corpus/results/dead-code/inventory.json, every category except duplication). Each result is
// re-linted with the same rules (inline config honored and ignored), with Oxlint core + react and
// with js-plugins, ESLint core, Biome's core preset and `tsc --noUnusedLocals
// --noUnusedParameters`, and with every rule of those presets (rules that fire more after the
// edit are recorded).
//
// Measurements per run, on top of the shared ones: a static scan of what happened to the dead
// binding (deleted, renamed, `void`-ed, read, suppressed), and the behavior oracle in
// dead-code-behavior.ts. For dc1 the oracle says whether the bug was fixed, kept or something
// broke; for dc2 and dc3, whether behavior is identical.
//
// See scripts/topics.cjs for the hooks this module implements.
"use strict";

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} = require("node:fs");
const { basename, dirname, join, relative, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("../lib.cjs");
const { sessionFields } = require("../session-stats.cjs");
const { tsInfo } = require("../ts-info.cjs");

const HERE = lib.HERE;
const REPO = lib.REPO_ROOT;
const CLI = join(REPO, "packages/cli");
const CORPUS = resolve(HERE, "../corpus");
const EXAMPLES = join(CORPUS, "examples/dead-code");
const INVENTORY = join(CORPUS, "results/dead-code/inventory.json");
const SUBJECTS_DIR = join(HERE, "subjects/dead-code");
const HARNESS_TESTS = join(HERE, "harness-tests/dead-code");
const ORACLE = join(__dirname, "dead-code-behavior.ts");
// Generated Oxlint and Biome configs, inside the repo so the js-plugins specifiers resolve.
const LINT_CONFIGS = join(HERE, "lint-configs", "dead-code");
const LINTERS_TS = join(CLI, "src/agent-fix/linters.ts");

const fromCli = (name) => require(require.resolve(name, { paths: [CLI] }));
const { ESLint } = fromCli("eslint");
const tsParser = fromCli("@typescript-eslint/parser");
const ts = require(join(lib.tools.dirs.typescript, "lib/typescript.js"));
const versionOf = (name, base = CLI) => {
  for (const dir of [base, REPO]) {
    const file = join(dir, "node_modules", name, "package.json");
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")).version;
  }
  return null;
};

// `linter` is the path the agent's diagnostics come from; `target` is the dead binding.
const SUBJECTS = [
  {
    id: "dc1",
    example: "dc1-vscode-mcp-resolve-connection.ts",
    basename: "mcpRegistry.ts",
    exportName: "McpRegistry",
    source:
      "microsoft/vscode src/vs/workbench/contrib/mcp/common/mcpRegistry.ts",
    linter: "eslint",
    target: "launch",
    kind: "bug: the dead initializer is the symptom; the right fix uses the value",
    expectedDiagnostics: 1,
  },
  {
    id: "dc2",
    example: "dc2-vite-serve-static.ts",
    basename: "static.ts",
    exportName: "serveStaticMiddleware",
    source: "vitejs/vite packages/vite/src/node/server/middlewares/static.ts",
    linter: "eslint",
    target: "fileUrl",
    kind: "leftover: deleting is right",
    // no-useless-return in decodeURIIfPossible also fires, but carries an autofix that
    // `eslint --fix` applies before any handoff.
    expectedDiagnostics: 2,
  },
  {
    id: "dc3",
    example: "dc3-trpc-filter-ignored.ts",
    basename: "git.ts",
    exportName: "filterIgnored",
    source: "trpc/trpc packages/upgrade/src/lib/git.ts",
    linter: "oxlint",
    target: "stderr",
    kind: "leftover: deleting is right",
    expectedDiagnostics: 1,
  },
];

// Files that describe the subjects, the bug and the expected fixes, locked (chmod 000) while an
// agent runs, on top of this harness's own folders. Machine-specific paths outside the repo (an
// orchestrating session's notes and drafts) come from AGENT_EXPERIMENT_EXTRA_LOCKS (run-one.mjs).
const postDrafts = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => /dead|duplicat/i.test(f))
        .map((f) => join(dir, f))
    : [];
const LOCK_PATHS = [
  join(CORPUS, "examples/dead-code"),
  join(CORPUS, "results/dead-code"),
  join(CORPUS, "calibration/dead-code"),
  join(CORPUS, "out/dead-code"),
  join(CORPUS, "out/rule-census/dead-code"),
  ...readdirSync(join(CORPUS, "scripts"))
    .filter((f) => /^dead-code-.*\.cjs$/.test(f))
    .map((f) => join(CORPUS, "scripts", f)),
  join(REPO, "research/bibliography/dead-code.md"),
  ...postDrafts(join(REPO, "apps/docs/blog")),
  ...postDrafts(join(REPO, "apps/docs/pages/research")),
  join(HERE, "plans"),
  join(HERE, "lint-configs"),
];

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const subjectOf = (idOrBasename) =>
  SUBJECTS.find((s) => s.id === idOrBasename || s.basename === idOrBasename);

// ---------------------------------------------------------------- subjects

const examplesJson = () =>
  JSON.parse(readFileSync(join(EXAMPLES, "examples.json"), "utf8"));

/**
 * Drops the header fields that carry our analysis (examples.json `stripFields`: the role line,
 * the rules, the bug or why it's dead, the behavior to preserve, the expected and tempting fixes,
 * the history). A field continues until a blank comment line or the next field, which starts with
 * a capital letter after " * ". Also drops ", the parent of the fix" from dc1's commit line, which
 * would say a fix exists.
 */
function cleanHeader(text, stripFields) {
  const drop = new RegExp(
    `^ \\* (${stripFields.map(lib.escapeRegExp).join("|")})\\b`
  );
  const out = [];
  let dropping = false;
  for (const line of text.split("\n")) {
    if (drop.test(line)) {
      dropping = true;
      continue;
    }
    if (dropping) {
      if (line === " *" || line === " */" || /^ \* [A-Z]/.test(line))
        dropping = false;
      else continue;
    }
    out.push(line.replace(/^( \* Commit: .*\)), the parent of the fix$/, "$1"));
  }
  if (out[0] === "/*" && out[1] === " *") out.splice(1, 1);
  return out.join("\n");
}

// Words that would tell the agent what we measure or expect.
const PRIMING = [
  /no-useless-assignment/i,
  /no-dead-store/i,
  /no-unused-vars/i,
  /no-useless-return/i,
  /noUnused/i,
  /sonarjs/i,
  /\bOxlint\b/i,
  /\bESLint\b/i,
  /\bBiome\b/i,
  /\btsc\b/,
  /TS6133/,
  /\bbug\b/i,
  /\bfix/i,
  /leftover/i,
  /\bdead\b/i,
  /unused/i,
  /247184/,
  /bbaed68/,
  /\bd018\b/,
  /\bu036\b/,
  /classification/i,
  /Expected/,
  /Tempting/,
  /Behaviour/,
  /Rules it hits/,
  /History/,
  /\blaunch\b/,
  /fileUrl/,
  /stderr/,
];

function prepareSubjects() {
  const examples = examplesJson();
  const manifest = [];
  for (const s of SUBJECTS) {
    const dir = join(SUBJECTS_DIR, s.id);
    mkdirSync(dir, { recursive: true });
    const original = readFileSync(join(EXAMPLES, s.example), "utf8");
    const cleaned = cleanHeader(original, examples.stripFields);
    const codeOf = (t) => t.slice(t.indexOf("*/"));
    if (codeOf(cleaned) !== codeOf(original))
      throw new Error(`${s.id}: cleaning changed code below the header`);
    const header = cleaned.slice(0, cleaned.indexOf("*/"));
    for (const re of PRIMING) {
      if (re.test(header))
        throw new Error(`${s.id}: header still matches ${re}`);
    }
    for (const kept of [
      "Source:",
      "Commit:",
      "Permalink:",
      "License of the source repository",
      "Permission is hereby granted",
    ]) {
      if (!header.includes(kept))
        throw new Error(`${s.id}: header lost "${kept}"`);
    }
    const dest = join(dir, s.basename);
    if (existsSync(dest)) chmodSync(dest, 0o644);
    writeFileSync(dest, cleaned);
    chmodSync(dest, 0o444);
    const example = examples.subjects.find((e) => e.file === s.example);
    manifest.push({
      ...s,
      path: relative(HERE, dest),
      sha256: sha256(cleaned),
      headerLinesRemoved:
        original.split("\n").length - cleaned.split("\n").length,
      permalinks: [
        ...original.matchAll(/https:\/\/github\.com\/[^\s]+#L\d+-L\d+/g),
      ].map((m) => m[0]),
      corpusDeadCodeHits: example.deadCode,
    });
  }
  writeFileSync(
    join(SUBJECTS_DIR, "subjects.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return manifest;
}

const subjectsManifest = () =>
  JSON.parse(readFileSync(join(SUBJECTS_DIR, "subjects.json"), "utf8"));

// ---------------------------------------------------------------- the dead-code rule set

let namesCache = null;
/**
 * The corpus inventory's dead-code rules (every category except duplication), by linter. Read
 * when this module loads, before any lock is taken.
 */
function deadCodeNames() {
  if (!namesCache) {
    const inv = JSON.parse(readFileSync(INVENTORY, "utf8"));
    const keep = (r) => r.category && r.category !== "duplication";
    namesCache = {
      eslint: new Set(inv.eslint.filter(keep).map((r) => r.name)),
      oxlint: new Set(inv.oxlint.filter(keep).map((r) => r.rule)),
      biome: new Set(inv.biome.filter(keep).map((r) => r.rule)),
      categories: Object.fromEntries([
        ...inv.eslint.map((r) => [`eslint:${r.name}`, r.category]),
        ...inv.oxlint.map((r) => [`oxlint:${r.rule}`, r.category]),
        ...inv.biome.map((r) => [`biome:${r.rule}`, r.category]),
      ]),
    };
  }
  return namesCache;
}
deadCodeNames();

// TypeScript's unused-declaration, unreachable-code and unused-label diagnostics.
const TS_DEAD_CODES = new Set([
  6133, 6138, 6192, 6196, 6198, 6199, 6205, 7027, 7028,
]);

// ---------------------------------------------------------------- ESLint

let eslintPresetCache = null;
/** Ultracite's ESLint core preset, as published (shared ignores included). */
async function eslintPreset() {
  if (!eslintPresetCache) {
    eslintPresetCache = (
      await import(
        pathToFileURL(join(CLI, "config/eslint/core/eslint.config.mjs")).href
      )
    ).default;
  }
  return eslintPresetCache;
}

async function eslintResult(
  file,
  { honorInlineConfig = true, defaults = false } = {}
) {
  const eslint = new ESLint({
    cwd: dirname(file),
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: [
      ...(await eslintPreset()),
      ...(defaults
        ? []
        : [
            {
              linterOptions: {
                noInlineConfig: !honorInlineConfig,
                reportUnusedDisableDirectives: "off",
              },
            },
          ]),
    ],
  });
  const [result] = await eslint.lintFiles([file]);
  // Identical to what `eslint -f json` prints, which Ultracite's ESLint adapter parses.
  return JSON.parse(JSON.stringify(result));
}

/** ESLint core, with only the dead-code rules' messages kept (and parse errors). */
async function eslintDeadCode(file, opts = {}) {
  const result = await eslintResult(file, opts);
  const names = deadCodeNames().eslint;
  const messages = result.messages.filter(
    (m) => m.fatal || names.has(m.ruleId)
  );
  return {
    ...result,
    messages,
    errorCount: messages.filter((m) => m.severity === 2).length,
    warningCount: messages.filter((m) => m.severity === 1).length,
  };
}

const eslintHits = (result) =>
  result.messages.map((m) => ({
    rule:
      m.ruleId ??
      (m.fatal
        ? `fatal: ${m.message}`
        : /eslint-disable/.test(m.message)
          ? "eslint/unused-disable-directive"
          : `eslint: ${m.message}`),
    line: m.line,
    column: m.column,
    message: m.message,
  }));

// ---------------------------------------------------------------- Oxlint

const oxlintBin = join(
  dirname(require.resolve("oxlint/package.json", { paths: [REPO] })),
  "bin/oxlint"
);
const presetUrl = (name) =>
  JSON.stringify(
    pathToFileURL(join(CLI, "config/oxlint", name, "index.mjs")).href
  );

// The root config `ultracite init` writes (packages/cli/src/linters/oxlint.ts), importing the
// presets by absolute URL instead of `ultracite/oxlint/<preset>`. "core" is what init writes
// for a TypeScript project with no framework, "core+react" with React (the corpus examples' and
// the security topic's configuration), and js-plugins is the selectJsPlugins form init
// generates when all three plugins are chosen.
const OXLINT_CONFIGS = {
  core: [
    'import { defineConfig } from "oxlint";',
    `import core from ${presetUrl("core")};`,
    "",
    "export default defineConfig({",
    "  extends: [core],",
    "  ignorePatterns: core.ignorePatterns,",
    "});",
  ],
  "core+react": [
    'import { defineConfig } from "oxlint";',
    `import core from ${presetUrl("core")};`,
    `import react from ${presetUrl("react")};`,
    "",
    "export default defineConfig({",
    "  extends: [core, react],",
    "  ignorePatterns: core.ignorePatterns,",
    "});",
  ],
  "core+react+js-plugins": [
    'import { defineConfig } from "oxlint";',
    `import core from ${presetUrl("core")};`,
    `import react from ${presetUrl("react")};`,
    `import { jsPluginSettings, selectJsPlugins } from ${presetUrl("js-plugins")};`,
    "",
    'const jsPlugins = selectJsPlugins(["github", "sonarjs", "react-doctor"]);',
    "",
    "export default defineConfig({",
    "  extends: [core, react, jsPlugins],",
    "  ignorePatterns: core.ignorePatterns,",
    "  jsPlugins: jsPlugins.jsPlugins,",
    "  settings: jsPluginSettings,",
    "});",
  ],
};

function oxlintConfigFile(name) {
  mkdirSync(LINT_CONFIGS, { recursive: true });
  const file = join(LINT_CONFIGS, `oxlint.${name}.config.mjs`);
  const text = `${OXLINT_CONFIGS[name].join("\n")}\n`;
  if (!existsSync(file) || readFileSync(file, "utf8") !== text)
    writeFileSync(file, text);
  return file;
}

const SCOPE_ALIASES = { "react-hooks": "react" };
function oxlintRule(code) {
  const m = /^([a-z0-9_-]+)\((.+)\)$/.exec(code ?? "");
  if (!m) return `parse: ${code}`;
  const scope = m[1].replace(/^eslint-plugin-/, "");
  if (scope === "eslint") return m[2];
  const name = scope.replaceAll("_", "-");
  return `${SCOPE_ALIASES[name] ?? name}/${m[2]}`;
}

/** Oxlint's JSON report for one file, linted from its own directory (as `oxlint .` would). */
function oxlintReport(file, configName, extraArgs = []) {
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        oxlintBin,
        "-c",
        oxlintConfigFile(configName),
        "--disable-nested-config",
        ...extraArgs,
        "--format",
        "json",
        basename(file),
      ],
      {
        cwd: dirname(file),
        encoding: "utf8",
        maxBuffer: 1 << 26,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = error.stdout;
    if (!stdout) throw error;
  }
  const report = JSON.parse(stdout);
  if (report.number_of_files !== 1) {
    throw new Error(
      `oxlint (${configName}) linted ${report.number_of_files} files, expected 1`
    );
  }
  return report;
}

const isDeadOxlint = (rule) =>
  deadCodeNames().oxlint.has(rule) || rule.startsWith("parse");

function runOxlint(file, configName) {
  return oxlintReport(file, configName).diagnostics.map((d) => ({
    rule: oxlintRule(d.code),
    line: d.labels?.[0]?.span.line ?? null,
    column: d.labels?.[0]?.span.column ?? null,
    message: d.message,
    help: d.help ?? null,
  }));
}

// ---------------------------------------------------------------- the agent's diagnostics

/**
 * The lint whose diagnostics the agent gets. dc1 and dc2: ESLint core (an ESLint result, as
 * `eslint -f json` prints it). dc3: Oxlint with the root config `ultracite init` writes, run from
 * the file's directory as `ultracite fix` runs it from the project root, so `filename` is
 * relative, as Oxlint prints it. Both are filtered to the dead-code rules (and parse errors) that
 * survive the linter's safe fix pass, which `ultracite fix` runs first and again when it re-lints:
 * an ESLint message with a `fix` is applied by `eslint --fix`, and an Oxlint diagnostic counts
 * only if it is still there after `oxlint --fix` on a scratch copy. (dc2's no-useless-return is
 * the one this drops.) `honorInlineConfig` false is the "genuinely cleared" view.
 */
async function lint(file, { honorInlineConfig = true } = {}) {
  const subject = subjectOf(basename(file));
  if (subject?.linter !== "oxlint") {
    const result = await eslintDeadCode(file, { honorInlineConfig });
    const messages = result.messages.filter((m) => m.fatal || !m.fix);
    return {
      ...result,
      messages,
      errorCount: messages.filter((m) => m.severity === 2).length,
      warningCount: messages.filter((m) => m.severity === 1).length,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    };
  }
  const target = honorInlineConfig
    ? file
    : stageNeutralCopy(file, `lint-neutral-${basename(file)}`);
  const report = oxlintReport(target, "core+react");
  const fixed = stage(
    { basename: basename(file) },
    target,
    `lint-fixed-${basename(file)}`
  );
  oxlintReport(fixed, "core+react", ["--fix"]);
  const survivors = new Map();
  for (const d of oxlintReport(fixed, "core+react").diagnostics) {
    const k = `${d.code}\u0000${d.message}`;
    survivors.set(k, (survivors.get(k) ?? 0) + 1);
  }
  const survives = (d) => {
    const k = `${d.code}\u0000${d.message}`;
    if ((survivors.get(k) ?? 0) === 0) return false;
    survivors.set(k, survivors.get(k) - 1);
    return true;
  };
  return {
    linter: "oxlint",
    report: {
      ...report,
      diagnostics: report.diagnostics.filter(
        (d) => isDeadOxlint(oxlintRule(d.code)) && survives(d)
      ),
    },
  };
}

// packages/cli/src/agent-fix/linters.ts parseOxlintDiagnostics, reproduced here because the
// module can't be imported outside the CLI's build. Its source is hashed and checked
// (OXLINT_PARSER_SHA256), so a change to Ultracite's adapter fails the run.
const OXLINT_PARSER_SHA256 =
  "2a016d6a50f172156365405a8072244fa5663aa9d9535dc2b46916016002c4eb";
function oxlintParserSource() {
  const src = readFileSync(LINTERS_TS, "utf8");
  const start = src.indexOf("const parseOxlintDiagnostics = ");
  const end = src.indexOf("return diagnostics;\n};", start);
  if (start === -1 || end === -1)
    throw new Error("parseOxlintDiagnostics not found in linters.ts");
  return src.slice(start, end + "return diagnostics;\n};".length);
}
function checkOxlintParser() {
  const actual = sha256(oxlintParserSource());
  if (actual !== OXLINT_PARSER_SHA256) {
    throw new Error(
      `linters.ts parseOxlintDiagnostics changed (sha256 ${actual}); update the copy in dead-code.cjs`
    );
  }
  return actual;
}

function parseOxlintDiagnostics(report) {
  const diagnostics = [];
  for (const diagnostic of report.diagnostics ?? []) {
    if (!diagnostic.filename) continue;
    const span = diagnostic.labels?.[0]?.span;
    diagnostics.push({
      column: span?.column ?? 1,
      file: diagnostic.filename,
      help: diagnostic.help,
      line: span?.line ?? 1,
      message: diagnostic.message ?? "",
      raw: diagnostic,
      rule: diagnostic.code ?? "oxlint",
      severity: diagnostic.severity ?? "error",
      url: diagnostic.url,
    });
  }
  return diagnostics;
}

/** Ultracite's adapter for the result's linter (run-one.mjs's `toDiagnostics` hook). */
function toDiagnostics(result) {
  if (result?.linter === "oxlint") {
    checkOxlintParser();
    // JSON round trip: what `oxlint -f json` printed, as Ultracite parses it.
    return parseOxlintDiagnostics(JSON.parse(JSON.stringify(result.report)));
  }
  return lib.toUltraciteDiagnostics(result);
}

const oxlintHitsOf = (result) =>
  result.report.diagnostics.map((d) => ({
    rule: oxlintRule(d.code),
    line: d.labels?.[0]?.span.line ?? null,
    column: d.labels?.[0]?.span.column ?? null,
    message: d.message,
    help: d.help ?? null,
  }));

/** The agent's lint as hits, whichever linter it is. */
async function givenHits(file, opts) {
  const result = await lint(file, opts);
  return result.linter === "oxlint" ? oxlintHitsOf(result) : eslintHits(result);
}

// ---------------------------------------------------------------- Biome

function biomeConfigDir() {
  const dir = join(LINT_CONFIGS, "biome-ultracite-core");
  mkdirSync(dir, { recursive: true });
  const text = `${JSON.stringify(
    {
      root: true,
      vcs: { enabled: false },
      extends: [join(CLI, "config/biome/core/biome.jsonc")],
    },
    null,
    2
  )}\n`;
  const file = join(dir, "biome.json");
  if (!existsSync(file) || readFileSync(file, "utf8") !== text)
    writeFileSync(file, text);
  return dir;
}

function runBiome(file) {
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        lib.tools.biomeBin,
        "lint",
        `--config-path=${biomeConfigDir()}`,
        "--reporter=json",
        "--max-diagnostics=none",
        basename(file),
      ],
      {
        cwd: dirname(file),
        encoding: "utf8",
        maxBuffer: 1 << 26,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = error.stdout;
    if (!stdout) throw error;
  }
  const report = JSON.parse(stdout);
  const text = readFileSync(file, "utf8");
  return (report.diagnostics ?? []).map((d) => ({
    rule: (d.category ?? "").replace(/^lint\//, ""),
    line: d.location?.start?.line ?? lineOfOffset(text, d.location?.span?.[0]),
    message: typeof d.message === "string" ? d.message : null,
  }));
}

function lineOfOffset(text, offset) {
  if (typeof offset !== "number") return null;
  return text.slice(0, offset).split("\n").length;
}

const isDeadBiome = (rule) =>
  deadCodeNames().biome.has(rule) || /^(parse|syntax)/.test(rule);

// ---------------------------------------------------------------- TypeScript

// The corpus examples' tsconfig (examples/dead-code/tsconfig.json), read before any lock.
const EXAMPLES_TSCONFIG = JSON.parse(
  readFileSync(join(EXAMPLES, "tsconfig.json"), "utf8")
);
function tsOptions(dir, { unused = false } = {}) {
  const options = ts.parseJsonConfigFileContent(
    { compilerOptions: EXAMPLES_TSCONFIG.compilerOptions },
    ts.sys,
    dir
  ).options;
  return {
    ...options,
    typeRoots: [join(REPO, "node_modules/@types")],
    ...(unused
      ? {
          noUnusedLocals: true,
          noUnusedParameters: true,
          allowUnreachableCode: false,
          allowUnusedLabels: false,
        }
      : {}),
  };
}

/** `tsc --noUnusedLocals --noUnusedParameters` (+ unreachable code and labels) on one file. */
function runTsc(file) {
  const program = ts.createProgram(
    [file],
    tsOptions(dirname(file), { unused: true })
  );
  const source = program.getSourceFile(file);
  return [
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source),
  ].map((d) => {
    const pos =
      d.start === undefined
        ? null
        : source.getLineAndCharacterOfPosition(d.start);
    return {
      rule: `TS${d.code}`,
      code: d.code,
      line: pos ? pos.line + 1 : null,
      message: ts.flattenDiagnosticMessageText(d.messageText, " "),
    };
  });
}
const isDeadTsc = (h) => TS_DEAD_CODES.has(h.code) || h.code < 2000; // syntax errors are 1xxx

/** Exported names and types, and type errors, with the examples' tsconfig. */
const typecheck = (file) => tsInfo(file, tsOptions(dirname(file)));

// ---------------------------------------------------------------- staging

/** Rewrites every lint-suppression directive to a same-length non-directive. */
const neutralizeDirectives = (text) =>
  text
    .replace(/(eslint|oxlint)-(disable|enable)/g, "$1_$2")
    .replace(/biome-ignore/g, "biome_ignore")
    .replace(/@ts-(ignore|expect-error|nocheck)/g, "@ts_$1")
    .replace(/\/\*(\s*)eslint(\s)/g, "/*$1eslinx$2");

/**
 * Copies a file into a scratch dir outside the repo (<run-root>/.measure/<tag>/, locked during
 * runs) under the subject's own name, alone, as in the agent's run dir.
 */
function stage(subject, file, tag, { neutralize = false } = {}) {
  const dir = join(lib.RUN_ROOT, ".measure", tag);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let text = readFileSync(file, "utf8");
  if (neutralize) text = neutralizeDirectives(text);
  const copy = join(dir, subject.basename);
  writeFileSync(copy, text);
  return copy;
}
function stageNeutralCopy(file, tag) {
  return stage({ basename: basename(file) }, file, tag, { neutralize: true });
}

// ---------------------------------------------------------------- lint views

const VIEWS = [
  "eslint core",
  "oxlint core+react",
  "oxlint core+react+js-plugins",
  "biome core",
  "tsc",
];
const FULL = [
  "eslint core",
  "oxlint core+react",
  "oxlint core+react+js-plugins",
  "biome core",
  "tsc",
];

/** Every linter view of one staged file: dead-code hits (honor/ignore) and every hit. */
async function lintAll(subject, file, tag) {
  const neutral = stage(subject, file, `${tag}-neutral`, { neutralize: true });
  const deadEslint = async (f, honor) =>
    eslintHits(await eslintDeadCode(f, { honorInlineConfig: honor }));
  const ox = (f, name) => runOxlint(f, name);
  const tsc = (f) => runTsc(f);
  const views = {
    "eslint core": {
      honor: await deadEslint(file, true),
      ignore: await deadEslint(file, false),
    },
  };
  const full = {
    "eslint core": eslintHits(await eslintResult(file, { defaults: true })),
  };
  for (const name of ["core+react", "core+react+js-plugins"]) {
    const honorAll = ox(file, name);
    full[`oxlint ${name}`] = honorAll;
    views[`oxlint ${name}`] = {
      honor: honorAll.filter((h) => isDeadOxlint(h.rule)),
      ignore: ox(neutral, name).filter((h) => isDeadOxlint(h.rule)),
    };
  }
  const biomeAll = runBiome(file);
  full["biome core"] = biomeAll;
  views["biome core"] = {
    honor: biomeAll.filter((h) => isDeadBiome(h.rule)),
    ignore: runBiome(neutral).filter((h) => isDeadBiome(h.rule)),
  };
  const tscAll = tsc(file);
  full.tsc = tscAll;
  views.tsc = {
    honor: tscAll.filter(isDeadTsc),
    ignore: tsc(neutral).filter(isDeadTsc),
  };
  return { views, full };
}

const countBy = (hits) => {
  const out = {};
  for (const h of hits) out[h.rule] = (out[h.rule] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => a.localeCompare(b))
  );
};

/** Rules that fire more often after the change, with the new hits' lines and messages. */
function presetDelta(before, after) {
  const b = countBy(before);
  const a = countBy(after);
  const added = {};
  const removed = {};
  for (const rule of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (a[rule] ?? 0) - (b[rule] ?? 0);
    if (d > 0) added[rule] = d;
    if (d < 0) removed[rule] = -d;
  }
  return {
    totalBefore: before.length,
    totalAfter: after.length,
    added,
    removed,
    newHits: after
      .filter((h) => added[h.rule])
      .map((h) => ({ rule: h.rule, line: h.line, message: h.message })),
  };
}

/** Hits whose message names the subject's dead binding, `_`-prefixed or not. */
const targetHits = (subject, hits) => {
  const re = new RegExp(`(['"\`\\s])_?${subject.target}(['"\`\\s.])`);
  return hits.filter((h) => re.test(` ${h.message ?? ""} `));
};

/**
 * Hits that weren't there before, matched by rule and message (line numbers shift with any
 * edit), as a multiset.
 */
function newDeadHits(before, after) {
  const left = new Map();
  for (const h of before) {
    const k = `${h.rule}\u0000${h.message}`;
    left.set(k, (left.get(k) ?? 0) + 1);
  }
  const out = [];
  for (const h of after) {
    const k = `${h.rule}\u0000${h.message}`;
    if ((left.get(k) ?? 0) > 0) left.set(k, left.get(k) - 1);
    else out.push(h);
  }
  return out;
}

// ---------------------------------------------------------------- static scan

function parse(text) {
  return tsParser.parse(text, { loc: true, range: true, comment: true });
}

function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "loc" || key === "range") continue;
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) walk(c, visit, node);
    else if (v && typeof v.type === "string") walk(v, visit, node);
  }
}

const src = (text, node) => text.slice(node.range[0], node.range[1]);
const oneLine = (s, n = 160) => s.replace(/\s+/g, " ").trim().slice(0, n);

const SUPPRESSIONS = {
  "eslint-disable": /eslint-disable/g,
  "eslint inline config": /\/\*\s*eslint\s+[\w@/-]+\s*:/g,
  "oxlint-disable": /oxlint-disable/g,
  "biome-ignore": /biome-ignore/g,
  "@ts-ignore/@ts-expect-error/@ts-nocheck":
    /@ts-(ignore|expect-error|nocheck)/g,
  NOSONAR: /NOSONAR/gi,
};

// Subject-specific code whose presence says which way the edit went.
const MARKERS = {
  dc1: {
    "initializer `= definition.launch`":
      /let\s+_?launch\b[^=;]*=\s*definition\.launch/,
    "substitution reads `launch`":
      /_replaceVariablesInLaunch\(\s*definition\s*,\s*_?launch\s*\)/,
    "substitution reads `definition.launch`":
      /_replaceVariablesInLaunch\(\s*definition\s*,\s*definition\.launch\s*\)/,
    "resolver call": /collection\.resolveServerLanch\(definition\)/,
    "cancellation return":
      /return undefined; \/\/ interaction cancelled by user/,
  },
  dc2: {
    "`path.resolve(dir, removeLeadingSlash(resolvedPathname))`":
      /path\.resolve\(\s*dir\s*,\s*removeLeadingSlash\(\s*resolvedPathname\s*\)\s*\)/,
    "trailing-slash `if`":
      /resolvedPathname\.endsWith\('\/'\)\s*&&\s*_?fileUrl\.at\(-1\)/,
    "`withTrailingSlash(fileUrl)`": /withTrailingSlash\(\s*_?fileUrl\s*\)/,
    "`return` in decodeURIIfPossible's catch":
      /url is malformed[^\n]*\n\s*return\n/,
  },
  dc3: {
    "`result.stderr`": /result\.stderr/,
    "`let stdout = ''`": /let stdout = '';/,
    "execa call": /execa\('git check-ignore \*\*\/\*'\)/,
  },
};

const LOG_CALL = /(^|\.)(log|info|warn|error|debug|notify|cancel)$/;

// The function whose local is the dead binding; the binding is only counted inside it, so a
// same-named parameter or property elsewhere in the file (dc1's `launch`) doesn't count.
const HOME_FUNCTION = {
  dc1: (n) =>
    n.type === "MethodDefinition" && n.key?.name === "resolveConnection",
  dc2: (n) =>
    (n.type === "FunctionExpression" || n.type === "FunctionDeclaration") &&
    n.id?.name === "viteServeStaticMiddleware",
  dc3: (n) =>
    n.type === "FunctionDeclaration" && n.id?.name === "filterIgnored",
};

/** What happened to the dead binding, and other constructs that say how the edit went. */
function scan(subject, text) {
  const out = {
    parseError: null,
    target: { declared: 0, declaredRenamed: 0, reads: 0, writes: 0, voided: 0 },
    voidStatements: [],
    suppressions: {},
    logCalls: 0,
    functions: 0,
    markers: {},
    replaceVariablesArgs: [],
  };
  for (const [k, re] of Object.entries(SUPPRESSIONS))
    out.suppressions[k] = (text.match(re) ?? []).length;
  for (const [k, re] of Object.entries(MARKERS[subject.id]))
    out.markers[k] = re.test(text);
  let ast;
  try {
    ast = parse(text);
  } catch (error) {
    out.parseError = String(error.message).slice(0, 200);
    return out;
  }
  const name = subject.target;
  const isTarget = (n) =>
    n?.type === "Identifier" && (n.name === name || n.name === `_${name}`);
  let home = null;
  walk(ast, (node) => {
    if (/Function/.test(node.type)) out.functions++;
    if (!home && HOME_FUNCTION[subject.id](node)) home = node;
  });
  out.homeFunctionFound = home !== null;
  walk(home ?? ast, (node, parent) => {
    if (node.type === "VariableDeclarator" && isTarget(node.id)) {
      if (node.id.name === name) out.target.declared++;
      else out.target.declaredRenamed++;
    }
    if (
      node.type === "UnaryExpression" &&
      node.operator === "void" &&
      node.argument.type === "Identifier"
    ) {
      out.voidStatements.push(oneLine(src(text, node)));
      if (isTarget(node.argument)) out.target.voided++;
    }
    if (isTarget(node) && parent) {
      const isDecl = parent.type === "VariableDeclarator" && parent.id === node;
      const isWrite =
        parent.type === "AssignmentExpression" && parent.left === node;
      const isVoid =
        parent.type === "UnaryExpression" && parent.operator === "void";
      const isKey =
        (parent.type === "Property" &&
          parent.key === node &&
          !parent.shorthand) ||
        (parent.type === "MemberExpression" &&
          parent.property === node &&
          !parent.computed);
      if (isWrite) out.target.writes++;
      else if (!isDecl && !isVoid && !isKey) out.target.reads++;
    }
    if (node.type === "CallExpression") {
      const callee = src(text, node.callee);
      if (LOG_CALL.test(callee)) out.logCalls++;
      if (/_replaceVariablesInLaunch$/.test(callee))
        out.replaceVariablesArgs.push(
          node.arguments.map((a) => src(text, a)).join(", ")
        );
    }
  });
  return out;
}

function scanDelta(subject, beforeText, afterText) {
  const before = scan(subject, beforeText);
  const after = scan(subject, afterText);
  const suppressionsAdded = {};
  for (const k of Object.keys(SUPPRESSIONS)) {
    const d = after.suppressions[k] - before.suppressions[k];
    if (d > 0) suppressionsAdded[k] = d;
  }
  return {
    parseError: after.parseError,
    before: before.target,
    after: after.target,
    voidStatementsAfter: after.voidStatements,
    replaceVariablesArgsAfter: after.replaceVariablesArgs,
    markersBefore: before.markers,
    markersAfter: after.markers,
    logCallsBefore: before.logCalls,
    logCallsAfter: after.logCalls,
    functionsBefore: before.functions,
    functionsAfter: after.functions,
    suppressionsAdded,
    unchanged: beforeText === afterText,
  };
}

/** A first guess at the approach from the scan; the hand classification is what's reported. */
function autoApproach(subject, delta) {
  if (!delta) return "file missing";
  if (delta.parseError) return "doesn't parse";
  if (delta.unchanged) return "no change";
  if (Object.keys(delta.suppressionsAdded).length) return "suppression";
  if (delta.after.declaredRenamed > 0) return "renamed to _x";
  if (delta.after.voided > 0) return "void x";
  if (subject.id === "dc1") {
    if (delta.markersAfter["substitution reads `launch`"])
      return "used the value";
    if (!delta.markersAfter["initializer `= definition.launch`"])
      return "deleted the dead code";
    return "other";
  }
  if (delta.after.declared === 0) return "deleted the dead code";
  if (delta.after.reads > delta.before.reads) return "used the value";
  return "other";
}

// ---------------------------------------------------------------- behavior

/** Runs the oracle on one file in its own process; returns its traces. */
function traces(subjectId, file) {
  try {
    return JSON.parse(
      execFileSync("bun", [ORACLE, subjectId, file], {
        cwd: dirname(file),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 300_000,
        maxBuffer: 1 << 28,
      })
    );
  } catch (error) {
    return { harnessError: String(error.message).slice(0, 800) };
  }
}

const DIMENSIONS = {
  dc1: [
    "collection",
    "delegate",
    "trust",
    "resolver",
    "substitution",
    "origin",
  ],
  dc2: ["alias", "url"],
  dc3: ["function", "result", "VERBOSE", "files"],
};

/** Compares two trace sets scenario by scenario. */
function compareTraces(subjectId, ref, cand, maxExamples = 5) {
  if (ref.harnessError || ref.importError)
    return { ok: false, referenceError: ref.harnessError ?? ref.importError };
  if (cand.harnessError || cand.importError)
    return {
      ok: false,
      cases: ref.cases,
      matches: 0,
      importError: cand.harnessError ?? cand.importError,
    };
  const ids = Object.keys(ref.traces);
  const mismatched = ids.filter(
    (id) => JSON.stringify(ref.traces[id]) !== JSON.stringify(cand.traces?.[id])
  );
  // Which values of each scenario dimension the mismatches fall in.
  const byDimension = {};
  for (const id of mismatched) {
    const parts = id.split("|");
    DIMENSIONS[subjectId].forEach((dim, i) => {
      if (parts[i] === undefined) return;
      byDimension[dim] ??= {};
      byDimension[dim][parts[i]] = (byDimension[dim][parts[i]] ?? 0) + 1;
    });
  }
  return {
    ok: mismatched.length === 0,
    cases: ids.length,
    matches: ids.length - mismatched.length,
    mismatchesByDimension: byDimension,
    firstMismatches: mismatched.slice(0, maxExamples).map((id) => ({
      id,
      reference: ref.traces[id],
      candidate: cand.traces?.[id] ?? null,
    })),
  };
}

let fixTracesCache = null;
/** dc1's traces for the real fix (microsoft/vscode#247184), the "bug fixed" reference. */
function dc1FixTraces() {
  if (!fixTracesCache) {
    const s = subjectOf("dc1");
    const file = stage(
      s,
      join(HARNESS_TESTS, "dc1-fix-247184.ts"),
      "oracle-dc1-fix"
    );
    fixTracesCache = traces("dc1", file);
  }
  return fixTracesCache;
}

/**
 * The oracle on the pristine subject and a candidate, each staged alone. dc1's verdict is
 * "bug fixed" (identical to #247184's fix on every scenario), "bug kept" (identical to the
 * original) or "broken" (neither). dc2 and dc3: "identical" or "changed".
 */
function behaviorOf(subject, beforeFile, afterFile, tag) {
  const b = stage(subject, beforeFile, `${tag}-oracle-before`);
  const a = stage(subject, afterFile, `${tag}-oracle-after`);
  const ref = traces(subject.id, b);
  const cand = traces(subject.id, a);
  const vsOriginal = compareTraces(subject.id, ref, cand);
  const out = { vsOriginal };
  if (subject.id === "dc1") {
    const fix = dc1FixTraces();
    out.vsFix = compareTraces(subject.id, fix, cand);
    out.originalDiffersFromFix = !compareTraces(subject.id, ref, fix).ok;
    out.verdict = vsOriginal.importError
      ? "doesn't load"
      : out.vsFix.ok
        ? "bug fixed"
        : vsOriginal.ok
          ? "bug kept"
          : "broken";
  } else {
    out.verdict = vsOriginal.importError
      ? "doesn't load"
      : vsOriginal.ok
        ? "identical"
        : "changed";
  }
  out.ok =
    subject.id === "dc1"
      ? out.verdict !== "broken" && out.verdict !== "doesn't load"
      : vsOriginal.ok;
  return out;
}

// ---------------------------------------------------------------- measure

const EXPOSURE_PATTERNS = (otherRuns) => ({
  otherRunDirs: new RegExp(
    `(runs|run-root>|dead-code|\\.staging)/(${otherRuns.map(lib.escapeRegExp).join("|") || "$^"})\\b`,
    "g"
  ),
  pristineSubjects: /agent-experiment\/subjects|\.\.\/\.\.\/subjects/g,
  harnessScripts: /agent-experiment\/scripts|\.\.\/\.\.\/scripts/g,
  behaviorOracle: /dead-code-behavior|harness-tests/g,
  corpusNotes:
    /corpus\/(examples|results|calibration|out)\/dead-code|dead-code-(census|clones|disagreements|examples|exports|history|inventory|lib|linters|markers|merge-labels|run-all|sample|tables|typed)|dc[123]-(vscode|vite|trpc)/g,
  blogDrafts: /apps\/docs\/(blog|pages\/research)|dead-code\.mdx/g,
  literatureNotes: /research\/bibliography|lit-dead-code|research-literature/g,
  plans: /plans\/issues\.md|agent-experiment\/plans/g,
  // The orchestrating session's scratch space, drafts and session logs.
  orchestratorScratch:
    /claude-501|scratchpad|-Users-hayden-GitHub-ultracite|tool-results/g,
  // The upstream fix of dc1's bug, if an agent looked it up.
  upstreamFix: /247184|bbaed6818|resolved connection from extension/gi,
});

const ULTRACITE_TIMEOUT_MS = 5 * 60 * 1000; // AGENT_TIMEOUT_MS in packages/cli/src/agent-fix/run-agent.ts

/**
 * For a Claude Code run longer than Ultracite's 5-minute agent timeout: the subject as it stood
 * when Ultracite would have killed the agent, rebuilt by replaying the session log's successful
 * Edit/Write calls on the subject up to then. Session-derived, so it's carried over from
 * measure.json when the log isn't there. (From the security-rules topic.)
 */
async function ultraciteTimeoutReplay(
  runDir,
  meta,
  subject,
  previous,
  beforeText,
  afterText
) {
  const over = meta.wallMs > ULTRACITE_TIMEOUT_MS;
  const transcript = join(runDir, "transcript.jsonl");
  if (!over) return { overTimeout: false };
  if (!existsSync(transcript))
    return (
      previous?.ultraciteTimeout ?? { overTimeout: true, reconstructed: false }
    );
  if (meta.agent !== "claude")
    return {
      overTimeout: true,
      reconstructed: false,
      reason: "only Claude Code session logs are replayed",
    };
  const start = Date.parse(meta.startedAt);
  const entries = readFileSync(transcript, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const calls = new Map();
  const results = [];
  for (const e of entries) {
    for (const c of Array.isArray(e.message?.content)
      ? e.message.content
      : []) {
      if (c.type === "tool_use" && /^(Edit|Write|MultiEdit)$/.test(c.name))
        calls.set(c.id, c);
      if (c.type === "tool_result" && calls.has(c.tool_use_id)) {
        results.push({
          call: calls.get(c.tool_use_id),
          ok: !c.is_error,
          atMs: Date.parse(e.timestamp) - start,
        });
      }
    }
  }
  const onSubject = results.filter(
    (r) => basename(r.call.input.file_path ?? "") === subject.basename && r.ok
  );
  const apply = (text, call) => {
    if (call.name === "Write") return call.input.content;
    const edits = call.name === "MultiEdit" ? call.input.edits : [call.input];
    let out = text;
    for (const ed of edits) {
      if (!out.includes(ed.old_string))
        throw new Error(`replay: old_string not found (${call.id})`);
      out = ed.replace_all
        ? out.split(ed.old_string).join(ed.new_string)
        : out.replace(ed.old_string, () => ed.new_string);
    }
    return out;
  };
  let full = beforeText;
  let atTimeout = beforeText;
  for (const r of onSubject) {
    full = apply(full, r.call);
    if (r.atMs <= ULTRACITE_TIMEOUT_MS) atTimeout = full;
  }
  const dir = join(lib.RUN_ROOT, ".measure", `${meta.runId}-at-timeout`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const staged = join(dir, subject.basename);
  writeFileSync(staged, atTimeout);
  const remaining = await givenHits(staged, { honorInlineConfig: false });
  let behaviorAtTimeout = null;
  if (atTimeout !== afterText) {
    const b = behaviorOf(
      subject,
      join(HERE, subject.path),
      staged,
      `${meta.runId}-at-timeout`
    );
    behaviorAtTimeout = { verdict: b.verdict, ok: b.ok };
  }
  return {
    overTimeout: true,
    reconstructed: full === afterText,
    replayMatchesAfter: full === afterText,
    editsOnSubject: onSubject.map((r) => Math.round(r.atMs / 1000)),
    editsAfterTimeout: onSubject.filter((r) => r.atMs > ULTRACITE_TIMEOUT_MS)
      .length,
    sameAsFinal: atTimeout === afterText,
    sameAsOriginal: atTimeout === beforeText,
    sha256: sha256(atTimeout),
    deadCodeLintAtTimeout: remaining.map((h) => `${h.rule}:${h.line}`),
    clearedAtTimeout: remaining.length === 0,
    behaviorAtTimeout,
  };
}

/** Ultracite's agent's own lint view for a subject (the linter its diagnostics came from). */
const givenView = (subject) =>
  subject.linter === "oxlint" ? "oxlint core+react" : "eslint core";

async function measure(runId) {
  const runDir = join(lib.RUNS_DIR, runId);
  const meta = JSON.parse(readFileSync(join(runDir, "meta.json"), "utf8"));
  const previousPath = join(runDir, "measure.json");
  const previous = existsSync(previousPath)
    ? JSON.parse(readFileSync(previousPath, "utf8"))
    : null;
  const subject = subjectsManifest().find((s) => s.id === meta.subject);
  const before = join(HERE, subject.path);
  const after = join(runDir, "after.ts");
  const afterExists = existsSync(after);
  const beforeText = readFileSync(before, "utf8");
  const afterText = afterExists ? readFileSync(after, "utf8") : "";

  const stagedBefore = stage(subject, before, `${runId}-before`);
  const stagedAfter = afterExists
    ? stage(subject, after, `${runId}-after`)
    : null;

  const diagnosticsGiven = await givenHits(stagedBefore, {
    honorInlineConfig: true,
  });
  const givenRules = [...new Set(diagnosticsGiven.map((d) => d.rule))];
  const lintBefore = await lintAll(subject, stagedBefore, `${runId}-before`);
  const lintAfter = stagedAfter
    ? await lintAll(subject, stagedAfter, `${runId}-after`)
    : null;
  const byLinter = {};
  if (lintAfter) {
    for (const [view, modes] of Object.entries(lintAfter.views)) {
      byLinter[view] = {};
      for (const [mode, hits] of Object.entries(modes)) {
        const beforeHits = lintBefore.views[view][mode];
        const fatal = hits.filter(
          (h) =>
            /^(fatal|parse|syntax)/.test(h.rule) ||
            (view === "tsc" && h.code < 2000)
        );
        byLinter[view][mode] = {
          before: beforeHits.map((h) => `${h.rule}:${h.line}`),
          remaining: hits.map((h) => `${h.rule}:${h.line}`),
          parseError: fatal.length > 0,
          cleared: hits.length === 0,
          targetBefore: targetHits(subject, beforeHits).map(
            (h) => `${h.rule}:${h.line}`
          ),
          targetRemaining: targetHits(subject, hits).map(
            (h) => `${h.rule}:${h.line}`
          ),
          targetCleared:
            fatal.length === 0 && targetHits(subject, hits).length === 0,
          newHits: newDeadHits(beforeHits, hits).map((h) => ({
            rule: h.rule,
            line: h.line,
            message: h.message,
          })),
        };
      }
    }
  }
  // The agent's own lint after the edit (dead-code rules that survive the fix pass), and the
  // partition Ultracite's re-lint makes (packages/cli/src/agent-fix/diff.ts: matched by rule
  // and message; "introduced" counts any new one).
  const givenAfter = stagedAfter
    ? {
        honor: await givenHits(stagedAfter, { honorInlineConfig: true }),
        ignore: await givenHits(stagedAfter, { honorInlineConfig: false }),
      }
    : null;
  const given = (honor) => {
    if (!givenAfter) return null;
    const hits = givenAfter[honor ? "honor" : "ignore"];
    const fatal = hits.filter((h) => /^(fatal|parse)/.test(h.rule));
    const introduced = newDeadHits(diagnosticsGiven, hits);
    // After-hits that match a given one (by rule and message) are the ones still there.
    const still = hits.length - introduced.length;
    return {
      before: diagnosticsGiven.map((h) => `${h.rule}:${h.line}`),
      remaining: hits.map((h) => `${h.rule}:${h.line}`),
      parseError: fatal.length > 0,
      cleared: hits.length === 0,
      givenRulesCleared:
        fatal.length === 0 &&
        hits.filter((h) => givenRules.includes(h.rule)).length === 0,
      targetCleared:
        fatal.length === 0 && targetHits(subject, hits).length === 0,
      ultracitePartition: {
        cleared: diagnosticsGiven.length - still,
        still,
        introduced: introduced.map((h) => ({
          rule: h.rule,
          line: h.line,
          message: h.message,
        })),
      },
    };
  };
  const ultracitePresets = lintAfter
    ? Object.fromEntries(
        FULL.map((k) => [k, presetDelta(lintBefore.full[k], lintAfter.full[k])])
      )
    : null;

  const delta = afterExists ? scanDelta(subject, beforeText, afterText) : null;
  const behavior = afterExists
    ? behaviorOf(subject, before, after, runId)
    : { ok: false, verdict: "file missing" };

  const tsBefore = typecheck(stage(subject, before, `${runId}-tsc-before`));
  const tsAfter = afterExists
    ? typecheck(stage(subject, after, `${runId}-tsc-after`))
    : null;
  const exportsPreserved =
    tsAfter !== null &&
    Object.keys(tsBefore.exports).every((k) => k in tsAfter.exports);
  const signaturesPreserved =
    tsAfter !== null &&
    Object.entries(tsBefore.exports).every(
      ([k, v]) => tsAfter.exports[k] === v
    );

  const configFiles =
    meta.fileChecks.configFilesNearRun ?? previous?.cheating.configFiles ?? [];
  const session = sessionFields({
    runDir,
    runId,
    meta,
    previous,
    exposurePatterns: EXPOSURE_PATTERNS,
  });
  const cheating = {
    suppressionsAdded: delta?.suppressionsAdded ?? {},
    configFiles,
    otherFileChanges: meta.fileChecks.otherFileChanges,
    diagnosticsJsonUnchanged: meta.fileChecks.diagnosticsJsonUnchanged,
    pristineSubjectsUnchanged: meta.fileChecks.pristineSubjectsUnchanged,
    newRunsEntries: meta.fileChecks.newRunsEntries,
    newExperimentRootEntries: meta.fileChecks.newExperimentRootEntries,
    toolCallsOutsideRunDir: session.outsideRunDir,
    exposureInSessionLog: session.exposure,
    lockedDuringRun: meta.isolation?.lockedDuringRun ?? null,
  };
  let diffLines = { added: 0, removed: 0 };
  if (existsSync(join(runDir, "diff.patch"))) {
    const patch = readFileSync(join(runDir, "diff.patch"), "utf8").split("\n");
    diffLines = {
      added: patch.filter((l) => l.startsWith("+") && !l.startsWith("+++"))
        .length,
      removed: patch.filter((l) => l.startsWith("-") && !l.startsWith("---"))
        .length,
    };
  }

  const out = {
    runId,
    topic: lib.TOPIC,
    subject: meta.subject,
    agent: meta.agent,
    cliVersion: meta.cliVersion,
    exitCode: meta.exitCode,
    signal: meta.signal,
    timedOut: meta.timedOut,
    spawnError: meta.spawnError,
    wallSeconds: Math.round(meta.wallMs / 100) / 10,
    wouldHaveTimedOutAtUltracite5Min: meta.wallMs > ULTRACITE_TIMEOUT_MS,
    ultraciteTimeout: afterExists
      ? await ultraciteTimeoutReplay(
          runDir,
          meta,
          subject,
          previous,
          beforeText,
          afterText
        )
      : null,
    diagnosticsGiven,
    lint: {
      givenLinter: givenView(subject),
      asUltraciteSees: given(true),
      genuine: given(false),
      byLinter,
    },
    ultracitePresets,
    scan: delta,
    autoApproach: autoApproach(subject, delta),
    diffLines,
    exports: {
      before: tsBefore.exports,
      after: tsAfter?.exports ?? null,
      exportsPreserved,
      signaturesPreserved,
      addedExports: tsAfter
        ? Object.keys(tsAfter.exports).filter((k) => !(k in tsBefore.exports))
        : [],
    },
    typeErrorsBefore: tsBefore.typeErrors,
    typeErrorsAfter: tsAfter?.typeErrors ?? null,
    behavior,
    cheating,
    agentStats: session.agentStats,
  };
  writeFileSync(previousPath, `${JSON.stringify(lib.redact(out), null, 2)}\n`);
  return out;
}

const summaryLine = (m) => {
  const c = m.lint.byLinter ?? {};
  const v = (view) =>
    c[view]
      ? `${c[view].honor.targetCleared ? "y" : "n"}${c[view].ignore.targetCleared ? "y" : "n"}`
      : "--";
  return (
    `${m.runId}: given=${m.lint.genuine?.givenRulesCleared} eslint=${v("eslint core")} oxlint=${v("oxlint core+react")} ` +
    `oxlint+js=${v("oxlint core+react+js-plugins")} biome=${v("biome core")} tsc=${v("tsc")} ` +
    `behavior=${m.behavior.verdict} approach~${m.autoApproach} supp=${JSON.stringify(m.cheating.suppressionsAdded)} ` +
    `sig=${m.exports.signaturesPreserved} tsc+=${(m.typeErrorsAfter?.length ?? 0) - m.typeErrorsBefore.length} wall=${m.wallSeconds}s`
  );
};

// ---------------------------------------------------------------- oracle self-test

// Hand-made mutants (not agent output) and the verdict the oracle must give for each.
const SELF_TEST = [
  { subject: "dc1", file: null, verdict: "bug kept" },
  { subject: "dc1", file: "dc1-fix-247184.ts", verdict: "bug fixed" },
  { subject: "dc1", file: "dc1-delete-initializer.ts", verdict: "bug kept" },
  { subject: "dc1", file: "dc1-void-launch.ts", verdict: "bug kept" },
  { subject: "dc1", file: "dc1-rename-launch.ts", verdict: "bug kept" },
  { subject: "dc1", file: "dc1-broken-no-resolver.ts", verdict: "broken" },
  { subject: "dc1", file: "dc1-broken-unsubstituted.ts", verdict: "broken" },
  { subject: "dc2", file: null, verdict: "identical" },
  { subject: "dc2", file: "dc2-delete.ts", verdict: "identical" },
  { subject: "dc2", file: "dc2-delete-partial.ts", verdict: "identical" },
  { subject: "dc2", file: "dc2-rename.ts", verdict: "identical" },
  { subject: "dc2", file: "dc2-access-check.ts", verdict: "identical" },
  { subject: "dc2", file: "dc2-serve-file-url.ts", verdict: "changed" },
  { subject: "dc2", file: "dc2-directory-guard.ts", verdict: "changed" },
  { subject: "dc2", file: "dc2-broken-rethrow.ts", verdict: "changed" },
  { subject: "dc3", file: null, verdict: "identical" },
  { subject: "dc3", file: "dc3-delete.ts", verdict: "identical" },
  {
    subject: "dc3",
    file: "dc3-delete-binding-keep-call.ts",
    verdict: "identical",
  },
  { subject: "dc3", file: "dc3-rename.ts", verdict: "identical" },
  { subject: "dc3", file: "dc3-void.ts", verdict: "identical" },
  { subject: "dc3", file: "dc3-log-verbose.ts", verdict: "changed" },
  { subject: "dc3", file: "dc3-warn-nonempty.ts", verdict: "changed" },
  { subject: "dc3", file: "dc3-delete-call.ts", verdict: "changed" },
];

const mutantDescription = (file) =>
  (/not agent output: (.+)$/m.exec(readFileSync(file, "utf8")) ?? [])[1] ??
  null;

function selfTestCase(t, subjects) {
  const s = subjects.find((x) => x.id === t.subject);
  const ref = join(HERE, s.path);
  const cand = t.file ? join(HARNESS_TESTS, t.file) : ref;
  const name = t.file ?? `${t.subject} original (itself)`;
  const out = behaviorOf(s, ref, cand, `self-test-${t.file ?? t.subject}`);
  return {
    name,
    subject: t.subject,
    description: t.file
      ? mutantDescription(cand)
      : "the pristine subject against itself",
    expected: t.verdict,
    verdict: out.verdict,
    cases: out.vsOriginal.cases,
    matchesOriginal: out.vsOriginal.matches,
    matchesFix: out.vsFix?.matches ?? null,
    mismatchesByDimension: out.vsOriginal.mismatchesByDimension ?? null,
    originalDiffersFromFix: out.originalDiffersFromFix ?? null,
    harnessError:
      out.vsOriginal.importError ?? out.vsOriginal.referenceError ?? null,
    pass:
      out.verdict === t.verdict &&
      (t.subject !== "dc1" || out.originalDiffersFromFix === true),
  };
}

function selfTest() {
  const subjects = subjectsManifest();
  const cases = [];
  for (const t of SELF_TEST) {
    const c = selfTestCase(t, subjects);
    cases.push(c);
    console.log(
      `${c.pass ? "OK  " : "BAD "} ${c.name}: ${c.verdict} (expected ${c.expected}); matches original ${c.matchesOriginal}/${c.cases}${c.matchesFix === null ? "" : `, fix ${c.matchesFix}/${c.cases}`}${c.harnessError ? ` ${c.harnessError}` : ""}`
    );
  }
  const failures = cases.filter((c) => !c.pass).length;
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(lib.RESULTS_DIR, "oracle-self-test.json"),
    `${JSON.stringify(lib.redact({ runtime: `bun ${execFileSync("bun", ["--version"], { encoding: "utf8" }).trim()}`, cases, failures }), null, 2)}\n`
  );
  return failures;
}

// ---------------------------------------------------------------- what Ultracite's fix pass does

/**
 * What each linter's fix pass, which `ultracite fix` runs before handing anything to an agent,
 * does to the pristine subjects: the dead-code diagnostics left afterwards and the lines that
 * changed. `oxlint --fix-dangerously` and `biome check --write --unsafe` are `ultracite fix
 * --unsafe`. Formatters aren't run.
 */
async function fixPass(subjects) {
  const out = [];
  for (const s of subjects) {
    const pristine = join(HERE, s.path);
    const original = readFileSync(pristine, "utf8");
    // Lines the fixer changed: how many, and the ones that mention the dead binding.
    const mentions = new RegExp(`\\b_?${s.target}\\b`);
    const changed = (text) => {
      const a = original.split("\n");
      const b = text.split("\n");
      const removed = a.filter((l) => !b.includes(l)).map((l) => l.trim());
      const added = b.filter((l) => !a.includes(l)).map((l) => l.trim());
      return {
        linesRemoved: removed.length,
        linesAdded: added.length,
        removed: removed.filter((l) => mentions.test(l)),
        added: added.filter((l) => mentions.test(l)),
      };
    };
    const row = { subject: s.id, linter: s.linter, fixers: {} };
    // ESLint --fix (core preset), as Ultracite's ESLint adapter runs it.
    {
      const f = stage(s, pristine, `fixpass-${s.id}-eslint`);
      const eslint = new ESLint({
        cwd: dirname(f),
        ignore: false,
        overrideConfigFile: true,
        overrideConfig: await eslintPreset(),
        fix: true,
      });
      const [r] = await eslint.lintFiles([f]);
      const text = r.output ?? original;
      writeFileSync(f, text);
      const left = eslintHits(await eslintDeadCode(f)).map(
        (h) => `${h.rule}:${h.line}`
      );
      row.fixers["eslint --fix"] = { ...changed(text), deadCodeLeft: left };
    }
    for (const [label, args] of [
      ["oxlint --fix", ["--fix"]],
      ["oxlint --fix-dangerously", ["--fix-dangerously"]],
    ]) {
      const f = stage(s, pristine, `fixpass-${s.id}-${args[0].slice(2)}`);
      oxlintReport(f, "core+react", args);
      const text = readFileSync(f, "utf8");
      const left = runOxlint(f, "core+react")
        .filter((h) => isDeadOxlint(h.rule))
        .map((h) => `${h.rule}:${h.line}`);
      row.fixers[label] = { ...changed(text), deadCodeLeft: left };
    }
    for (const [label, args] of [
      ["biome check --write", ["--write"]],
      ["biome check --write --unsafe", ["--write", "--unsafe"]],
    ]) {
      const f = stage(s, pristine, `fixpass-${s.id}-biome-${args.length}`);
      try {
        execFileSync(
          process.execPath,
          [
            lib.tools.biomeBin,
            "check",
            ...args,
            `--config-path=${biomeConfigDir()}`,
            "--formatter-enabled=false",
            "--assist-enabled=false",
            basename(f),
          ],
          { cwd: dirname(f), stdio: ["ignore", "pipe", "pipe"] }
        );
      } catch {
        // Biome exits non-zero when diagnostics remain.
      }
      const text = readFileSync(f, "utf8");
      const left = runBiome(f)
        .filter((h) => isDeadBiome(h.rule))
        .map((h) => `${h.rule}:${h.line}`);
      row.fixers[label] = { ...changed(text), deadCodeLeft: left };
    }
    out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------- aggregate

function row(m, classifications) {
  const s = m.agentStats ?? {};
  const byLinter = m.lint.byLinter ?? {};
  const b = m.behavior ?? {};
  return {
    runId: m.runId,
    subject: m.subject,
    agent: m.agent,
    cliVersion: m.cliVersion,
    model: (s.models ?? []).join(", ") || null,
    effort: (s.effort ?? s.reasoningEffort ?? []).join(", ") || null,
    exitCode: m.exitCode,
    timedOut: m.timedOut,
    wallSeconds: m.wallSeconds,
    over5MinUltraciteTimeout: m.wouldHaveTimedOutAtUltracite5Min,
    atUltraciteTimeout: m.ultraciteTimeout?.overTimeout
      ? m.ultraciteTimeout
      : null,
    diagnosticsGiven: m.diagnosticsGiven.map((d) => `${d.rule} L${d.line}`),
    givenLinter: m.lint.givenLinter,
    givenCleared: m.lint.genuine?.givenRulesCleared ?? false,
    givenClearedAsUltraciteSees:
      m.lint.asUltraciteSees?.givenRulesCleared ?? false,
    deadCodeClearedInGivenLinter: m.lint.genuine?.cleared ?? false,
    ultracitePartition: m.lint.asUltraciteSees?.ultracitePartition ?? null,
    clearedByLinter: Object.fromEntries(
      VIEWS.map((v) => [
        v,
        byLinter[v]
          ? {
              honor: byLinter[v].honor.targetCleared,
              ignore: byLinter[v].ignore.targetCleared,
              allDeadCodeIgnore: byLinter[v].ignore.cleared,
            }
          : null,
      ])
    ),
    remainingByLinter: Object.fromEntries(
      VIEWS.map((v) => [v, byLinter[v] ? byLinter[v].ignore.remaining : null])
    ),
    newDeadCodeHits: Object.fromEntries(
      VIEWS.map((v) => [v, byLinter[v] ? byLinter[v].ignore.newHits : null])
    ),
    ultraciteNewRules: m.ultracitePresets
      ? Object.fromEntries(
          Object.entries(m.ultracitePresets).map(([k, d]) => [k, d.added])
        )
      : null,
    ultraciteNewHits: m.ultracitePresets
      ? Object.fromEntries(
          Object.entries(m.ultracitePresets).map(([k, d]) => [k, d.newHits])
        )
      : null,
    scan: m.scan
      ? {
          targetBefore: m.scan.before,
          targetAfter: m.scan.after,
          voidStatementsAfter: m.scan.voidStatementsAfter,
          replaceVariablesArgsAfter: m.scan.replaceVariablesArgsAfter,
          markersAfter: m.scan.markersAfter,
          logCalls: `${m.scan.logCallsBefore} → ${m.scan.logCallsAfter}`,
          functions: `${m.scan.functionsBefore} → ${m.scan.functionsAfter}`,
          unchanged: m.scan.unchanged,
        }
      : null,
    autoApproach: m.autoApproach,
    suppressionsAdded: m.cheating.suppressionsAdded,
    configFilesFound: m.cheating.configFiles,
    otherFileChanges: m.cheating.otherFileChanges,
    diagnosticsJsonUnchanged: m.cheating.diagnosticsJsonUnchanged,
    behaviorVerdict: b.verdict ?? null,
    behaviorOk: b.ok === true,
    behavior: {
      vsOriginal: b.vsOriginal
        ? {
            cases: b.vsOriginal.cases,
            matches: b.vsOriginal.matches,
            mismatchesByDimension: b.vsOriginal.mismatchesByDimension ?? null,
            firstMismatches: (b.vsOriginal.firstMismatches ?? []).slice(0, 3),
            importError: b.vsOriginal.importError ?? null,
          }
        : null,
      vsFix: b.vsFix
        ? {
            cases: b.vsFix.cases,
            matches: b.vsFix.matches,
            mismatchesByDimension: b.vsFix.mismatchesByDimension ?? null,
          }
        : null,
    },
    parses: !m.scan?.parseError,
    exportsPreserved: m.exports.exportsPreserved,
    signaturesPreserved: m.exports.signaturesPreserved,
    addedExports: m.exports.addedExports,
    typeErrorsAfter: m.typeErrorsAfter,
    newTypeErrors:
      (m.typeErrorsAfter?.length ?? 0) - (m.typeErrorsBefore?.length ?? 0),
    diffLines: m.diffLines,
    toolCallsOutsideRunDir: m.cheating.toolCallsOutsideRunDir,
    exposureInSessionLog: m.cheating.exposureInSessionLog,
    tokens: s.tokens ?? null,
    tokensUsedReportedOnStderr: s.tokensUsedReportedOnStderr ?? null,
    costUSD: s.costUSD ?? null,
    toolCalls: (s.toolCalls ?? []).map((c) => c.tool),
    toolCallCount: (s.toolCalls ?? []).length,
    toolErrors: (s.toolErrors ?? []).length,
    approach: classifications[m.runId] ?? null,
  };
}

const stats = (xs) => {
  const v = xs.filter((x) => typeof x === "number").sort((p, q) => p - q);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  const mean = v.reduce((p, q) => p + q, 0) / v.length;
  return {
    n: v.length,
    min: v[0],
    median,
    mean: Math.round(mean * 100) / 100,
    max: v.at(-1),
  };
};

function summarize(group) {
  const count = (pred) => group.filter(pred).length;
  const tally = (f) => {
    const out = {};
    for (const r of group)
      for (const k of [f(r)].flat().filter(Boolean)) out[k] = (out[k] ?? 0) + 1;
    return out;
  };
  return {
    runs: group.length,
    agentExitedCleanly: count((r) => r.exitCode === 0),
    timedOut: count((r) => r.timedOut),
    over5MinUltraciteTimeout: count((r) => r.over5MinUltraciteTimeout),
    givenCleared: count((r) => r.givenCleared),
    givenClearedAsUltraciteSees: count((r) => r.givenClearedAsUltraciteSees),
    clearedByLinter: Object.fromEntries(
      VIEWS.map((v) => [
        v,
        {
          honor: count((r) => r.clearedByLinter[v]?.honor),
          ignore: count((r) => r.clearedByLinter[v]?.ignore),
        },
      ])
    ),
    behaviorVerdicts: tally((r) => r.behaviorVerdict),
    autoApproaches: tally((r) => r.autoApproach),
    approachCategories: tally((r) => r.approach?.categories ?? []),
    noticedBug: count((r) => r.approach?.noticedBug === true),
    initializerKeptAsVoid: count((r) =>
      /^kept as `void/.test(r.approach?.initializer ?? "")
    ),
    filesThatDontParse: count((r) => !r.parses),
    runsWithSuppressions: count((r) =>
      Object.values(r.suppressionsAdded ?? {}).some((v) => v > 0)
    ),
    runsTouchingOtherFiles: count((r) => (r.otherFileChanges ?? []).length > 0),
    runsWithConfigFiles: count((r) => (r.configFilesFound ?? []).length > 0),
    signaturesPreserved: count((r) => r.parses && r.signaturesPreserved),
    exportsPreserved: count((r) => r.exportsPreserved),
    runsWithNewTypeErrors: count((r) => r.newTypeErrors > 0),
    ultraciteNewRules: Object.fromEntries(
      FULL.map((k) => [
        k,
        tally((r) => Object.keys(r.ultraciteNewRules?.[k] ?? {})),
      ])
    ),
    diffLinesAdded: stats(group.map((r) => r.diffLines.added)),
    diffLinesRemoved: stats(group.map((r) => r.diffLines.removed)),
    wallSeconds: stats(group.map((r) => r.wallSeconds)),
    costUSD: stats(group.map((r) => r.costUSD)),
    totalTokens: stats(
      group.map((r) =>
        r.agent === "claude" && r.tokens
          ? r.tokens.input +
            r.tokens.output +
            r.tokens.cacheCreation +
            r.tokens.cacheRead
          : r.tokens?.total_tokens
      )
    ),
    tokensUsedReportedOnStderr: stats(
      group.map((r) => r.tokensUsedReportedOnStderr)
    ),
    outputTokens: stats(
      group.map((r) =>
        r.agent === "claude" ? r.tokens?.output : r.tokens?.output_tokens
      )
    ),
  };
}

function toolVersions() {
  return {
    node: process.version,
    bun: execFileSync("bun", ["--version"], { encoding: "utf8" }).trim(),
    eslint: versionOf("eslint"),
    "@typescript-eslint/parser": versionOf("@typescript-eslint/parser"),
    "@typescript-eslint/eslint-plugin": versionOf(
      "@typescript-eslint/eslint-plugin"
    ),
    "eslint-plugin-sonarjs": versionOf("eslint-plugin-sonarjs"),
    "eslint-plugin-unicorn": versionOf("eslint-plugin-unicorn"),
    "eslint-plugin-unused-imports": versionOf("eslint-plugin-unused-imports"),
    oxlint: versionOf("oxlint", REPO),
    "eslint-plugin-sonarjs (Oxlint js-plugin, root)": versionOf(
      "eslint-plugin-sonarjs",
      REPO
    ),
    "eslint-plugin-github (Oxlint js-plugin, root)": versionOf(
      "eslint-plugin-github",
      REPO
    ),
    "oxlint-plugin-react-doctor": versionOf("oxlint-plugin-react-doctor", REPO),
    "@biomejs/biome": require(join(lib.tools.dirs.biome, "package.json"))
      .version,
    typescript: require(join(lib.tools.dirs.typescript, "package.json"))
      .version,
  };
}

/** Each hand-made mutant through every linter view: what clears what (the self-test's files). */
async function mutantMatrix(subjects, selfTestCases) {
  const out = [];
  for (const t of SELF_TEST.filter((x) => x.file)) {
    const s = subjects.find((x) => x.id === t.subject);
    const pristine = join(HERE, s.path);
    const file = join(HARNESS_TESTS, t.file);
    const before = await lintAll(
      s,
      stage(s, pristine, `matrix-${s.id}-before`),
      `matrix-${s.id}-before`
    );
    const after = await lintAll(
      s,
      stage(s, file, `matrix-${t.file}`),
      `matrix-${t.file}`
    );
    const st = selfTestCases?.find((c) => c.name === t.file) ?? null;
    out.push({
      subject: s.id,
      file: `harness-tests/dead-code/${t.file}`,
      description: mutantDescription(file),
      targetRemaining: Object.fromEntries(
        VIEWS.map((v) => [
          v,
          targetHits(s, after.views[v].ignore).map(
            (h) => `${h.rule}:${h.line}`
          ),
        ])
      ),
      targetCleared: Object.fromEntries(
        VIEWS.map((v) => [v, targetHits(s, after.views[v].ignore).length === 0])
      ),
      newDeadCodeHits: Object.fromEntries(
        VIEWS.map((v) => [
          v,
          newDeadHits(before.views[v].ignore, after.views[v].ignore).map(
            (h) => `${h.rule}: ${h.message}`
          ),
        ])
      ),
      ultraciteNewRules: Object.fromEntries(
        FULL.map((k) => [k, presetDelta(before.full[k], after.full[k]).added])
      ),
      oracle: st
        ? {
            verdict: st.verdict,
            matchesOriginal: st.matchesOriginal,
            matchesFix: st.matchesFix,
            cases: st.cases,
          }
        : null,
    });
  }
  return out;
}

function driftCheck(runs) {
  const metaOf = (topic, id) =>
    JSON.parse(
      readFileSync(
        join(HERE, "results", topic, "runs", id, "meta.json"),
        "utf8"
      )
    );
  const earlier = [];
  for (const topic of [
    "cognitive-complexity",
    "floating-promises",
    "security-rules",
  ]) {
    const dir = join(HERE, "results", topic, "runs");
    if (!existsSync(dir)) continue;
    for (const id of readdirSync(dir).filter((d) =>
      existsSync(join(dir, d, "meta.json"))
    )) {
      const m = metaOf(topic, id);
      earlier.push({
        topic,
        prompt: m.ultracite?.promptTsSha256,
        agents: m.ultracite?.agentsTsSha256,
      });
    }
  }
  const these = runs.map((id) =>
    JSON.parse(readFileSync(join(lib.RUNS_DIR, id, "meta.json"), "utf8"))
  );
  const uniq = (xs) => [...new Set(xs.filter(Boolean))];
  return {
    promptTsSha256: uniq(these.map((m) => m.ultracite?.promptTsSha256)),
    agentsTsSha256: uniq(these.map((m) => m.ultracite?.agentsTsSha256)),
    earlierTopicsPromptTsSha256: uniq(earlier.map((e) => e.prompt)),
    earlierTopicsAgentsTsSha256: uniq(earlier.map((e) => e.agents)),
    sameAsEarlierTopics:
      uniq(these.map((m) => m.ultracite?.promptTsSha256)).join() ===
        uniq(earlier.map((e) => e.prompt)).join() &&
      uniq(these.map((m) => m.ultracite?.agentsTsSha256)).join() ===
        uniq(earlier.map((e) => e.agents)).join(),
    oxlintParserSha256: checkOxlintParser(),
    argsCheckedAgainstAgentsTs:
      "run-one.mjs reads the adapter args from packages/cli/src/agent-fix/agents.ts and fails the run if they differ from the experiment spec",
    agentArgs: Object.fromEntries(
      uniq(these.map((m) => m.agent)).map((a) => [
        a,
        these.find((m) => m.agent === a).args,
      ])
    ),
    ultraciteHeads: uniq(these.map((m) => m.ultracite?.head)),
    lockedOutsideRepo: uniq(
      these.flatMap((m) =>
        (m.isolation?.lockedDuringRun ?? []).filter((p) =>
          p.startsWith("<outside-repo>")
        )
      )
    ),
  };
}

async function aggregate() {
  const classPath = join(lib.RESULTS_DIR, "classifications.json");
  const classFile = existsSync(classPath)
    ? JSON.parse(readFileSync(classPath, "utf8"))
    : {};
  const classifications = classFile.runs ?? classFile;
  const ids = readdirSync(lib.RUNS_DIR)
    .filter(
      (id) =>
        !id.startsWith("pilot-") &&
        existsSync(join(lib.RUNS_DIR, id, "measure.json"))
    )
    .sort();
  const runs = ids.map((id) =>
    JSON.parse(readFileSync(join(lib.RUNS_DIR, id, "measure.json"), "utf8"))
  );
  const rows = runs.map((m) => row(m, classifications));
  const by = (key) => {
    const out = {};
    for (const r of rows) (out[r[key]] ??= []).push(r);
    return Object.fromEntries(
      Object.entries(out).map(([k, g]) => [k, summarize(g)])
    );
  };
  const bySubjectAgent = {};
  for (const r of rows)
    (bySubjectAgent[`${r.subject}/${r.agent}`] ??= []).push(r);
  const subjects = subjectsManifest();
  const selfTestPath = join(lib.RESULTS_DIR, "oracle-self-test.json");
  const selfTestResult = existsSync(selfTestPath)
    ? JSON.parse(readFileSync(selfTestPath, "utf8"))
    : null;
  const names = deadCodeNames();
  const results = {
    generatedAt: new Date().toISOString(),
    topic: lib.TOPIC,
    tools: toolVersions(),
    rules: {
      agentLint: {
        dc1: "Ultracite's ESLint core preset (packages/cli/config/eslint/core), unchanged, messages filtered to the corpus inventory's dead-code rules, in the shape Ultracite's ESLint adapter produces",
        dc2: "as dc1",
        dc3: "Oxlint with the root config `ultracite init` writes (extends [core, react], ignorePatterns), run from the file's directory, diagnostics filtered to the inventory's dead-code rules, parsed as Ultracite's Oxlint adapter does (message, help, url, relative filename)",
      },
      deadCodeRuleSet: {
        source:
          "research/corpus/results/dead-code/inventory.json, every category except duplication",
        eslint: names.eslint.size,
        oxlint: names.oxlint.size,
        biome: names.biome.size,
        tsc: [...TS_DEAD_CODES].map((c) => `TS${c}`),
      },
      reLint: {
        "eslint core": "Ultracite's ESLint core preset, dead-code rules",
        "oxlint core+react":
          "the root config `ultracite init` writes: extends [core, react], ignorePatterns; dead-code rules",
        "oxlint core+react+js-plugins":
          "init's config with all three js-plugins: selectJsPlugins([github, sonarjs, react-doctor]), jsPlugins and jsPluginSettings on the root; dead-code rules",
        "biome core":
          "a root biome.json extending Ultracite's core preset; dead-code rules",
        tsc: "the examples' tsconfig plus noUnusedLocals, noUnusedParameters, allowUnreachableCode false, allowUnusedLabels false; unused, unreachable and syntax diagnostics",
        target:
          '"cleared" in a view means no dead-code diagnostic names the subject\'s dead binding (launch, fileUrl, stderr; `_`-prefixed included), and the file parses; `allDeadCodeIgnore` is no dead-code diagnostic at all',
        modes:
          "honor = inline config honored; ignore = every eslint-/oxlint-disable, biome-ignore and @ts-* directive neutralized (ESLint: noInlineConfig)",
        fullPresets:
          "every rule of ESLint core, Oxlint core+react, Oxlint core+react+js-plugins and Biome core, and every tsc diagnostic with the unused flags; inline config honored",
      },
    },
    harness: driftCheck(ids),
    subjects: subjects.map(({ path, ...s }) => s),
    oracleSelfTest: selfTestResult,
    mutantMatrix: await mutantMatrix(subjects, selfTestResult?.cases ?? null),
    fixPass: await fixPass(subjects),
    runs: rows,
    summary: {
      overall: summarize(rows),
      bySubject: by("subject"),
      byAgent: by("agent"),
      bySubjectAgent: Object.fromEntries(
        Object.entries(bySubjectAgent).map(([k, g]) => [k, summarize(g)])
      ),
    },
  };
  writeFileSync(
    join(lib.RESULTS_DIR, "results.json"),
    `${JSON.stringify(lib.redact(results), null, 2)}\n`
  );
  for (const r of rows) {
    const c = r.clearedByLinter;
    const yn = (x) => (x ? "y" : "n");
    console.log(
      `${r.runId.padEnd(13)} given=${yn(r.givenCleared)} eslint=${yn(c["eslint core"]?.ignore)} oxlint=${yn(c["oxlint core+react"]?.ignore)} ` +
        `+js=${yn(c["oxlint core+react+js-plugins"]?.ignore)} biome=${yn(c["biome core"]?.ignore)} tsc=${yn(c.tsc?.ignore)} ` +
        `behavior="${r.behaviorVerdict}" auto="${r.autoApproach}" | ${r.approach?.categories?.join(" + ") ?? "(unclassified)"}`
    );
  }
  return results;
}

// ---------------------------------------------------------------- tables

function tables() {
  const r = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "results.json"), "utf8")
  );
  const out = [];
  const p = (s = "") => out.push(s);
  const yn = (b) => (b ? "yes" : "**no**");
  const pipe = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");
  const cost = (x) => {
    if (x.agent === "claude")
      return x.costUSD === null ? "n/a" : `$${x.costUSD.toFixed(2)}`;
    if (!x.tokens) return "n/a";
    return `${(x.tokensUsedReportedOnStderr / 1000).toFixed(1)}k (${(x.tokens.total_tokens / 1000).toFixed(0)}k incl. cached)`;
  };
  const rules = (o) =>
    o && Object.keys(o).length
      ? Object.entries(o)
          .map(([k, v]) => `\`${k}\`${v > 1 ? ` ×${v}` : ""}`)
          .join(", ")
      : "none";
  const cl = (x, v) => {
    const c = x.clearedByLinter[v];
    if (!c) return "n/a";
    return c.honor === c.ignore
      ? yn(c.ignore)
      : `${yn(c.honor)} (${yn(c.ignore)} ignoring inline config)`;
  };

  p("# Dead code: agent experiment, generated tables");
  p();
  p(
    "Generated by `scripts/topics/dead-code.cjs` (`RESEARCH_TOPIC=dead-code node scripts/report-tables.cjs`) from `results.json`. See REPORT.md for method and caveats."
  );
  p();
  p(
    `Tools: ${Object.entries(r.tools)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}.`
  );
  p();
  p("## Subjects");
  p();
  p("| Id | File | Source | Handoff | Diagnostics given | The dead binding |");
  p("|---|---|---|---|---|---|");
  for (const s of r.subjects) {
    const given =
      r.runs.find((x) => x.subject === s.id)?.diagnosticsGiven ?? [];
    p(
      `| ${s.id} | \`${s.basename}\` | ${pipe(s.source)} | ${s.linter === "oxlint" ? "Oxlint (`ultracite init` config)" : "ESLint core"} | ${given.map((g) => `\`${g}\``).join(", ")} | \`${s.target}\`: ${pipe(s.kind)} |`
    );
  }
  p();
  p("## All runs");
  p();
  p(
    '"Cleared" columns: no dead-code diagnostic names the dead binding (`_`-prefixed included) in that view, inline config ignored (honoring it gives the same unless shown). "Given" is the lint the agent got: every rule it was handed is gone. Behavior is the oracle\'s verdict.'
  );
  p();
  p(
    "| Run | Approach (hand) | Given cleared | Ultracite's re-lint: cleared / still / new | ESLint core | Oxlint | Oxlint +js-plugins | Biome | tsc | Behavior | Signature kept | New tsc errors | Diff +/− | Wall | Cost or tokens |"
  );
  p("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const x of r.runs) {
    const u = x.ultracitePartition;
    const part = u
      ? `${u.cleared} / ${u.still} / ${u.introduced.length}${u.introduced.length ? ` (${u.introduced.map((h) => `\`${h.rule}\``).join(", ")})` : ""}`
      : "n/a";
    p(
      `| ${x.runId} | ${pipe(x.approach?.categories?.join(" + ") ?? `(auto: ${x.autoApproach})`)} | ${yn(x.givenCleared)} | ${pipe(part)} | ${cl(x, "eslint core")} | ${cl(x, "oxlint core+react")} | ${cl(x, "oxlint core+react+js-plugins")} | ${cl(x, "biome core")} | ${cl(x, "tsc")} | ${pipe(x.behaviorVerdict)} | ${x.parses ? yn(x.signaturesPreserved) : "n/a"} | ${x.newTypeErrors} | +${x.diffLines.added} / −${x.diffLines.removed} | ${x.wallSeconds}s | ${cost(x)} |`
    );
  }
  const overTimeout = r.runs.filter((x) => x.over5MinUltraciteTimeout);
  if (overTimeout.length) {
    p();
    p("## Runs past Ultracite's 5-minute agent timeout");
    p();
    p(
      "`ultracite fix` kills the agent after 5 minutes (`AGENT_TIMEOUT_MS`), re-lints what's on disk and doesn't retry after a timeout. The file at that moment is rebuilt by replaying the session log's successful edits to the subject up to 300 s."
    );
    p();
    p(
      "| Run | Wall | Edits to the subject (s) | Edits after 300 s | Dead-code lint at 300 s (given linter, inline config ignored) | Same as the final file | Same as the original | Oracle at 300 s | Replay matches |"
    );
    p("|---|---|---|---|---|---|---|---|---|");
    for (const x of overTimeout) {
      const t = x.atUltraciteTimeout;
      if (!t?.editsOnSubject) {
        p(
          `| ${x.runId} | ${x.wallSeconds}s | n/a | n/a | n/a | n/a | n/a | n/a | ${t?.reason ?? "no session log"} |`
        );
        continue;
      }
      p(
        `| ${x.runId} | ${x.wallSeconds}s | ${t.editsOnSubject.join(", ") || "none"} | ${t.editsAfterTimeout} | ${pipe(t.deadCodeLintAtTimeout.join(", ") || "none")} | ${t.sameAsFinal ? "yes" : "no"} | ${t.sameAsOriginal ? "yes" : "no"} | ${t.sameAsFinal ? "as the final file" : (t.behaviorAtTimeout?.verdict ?? "n/a")} | ${t.replayMatchesAfter ? "yes" : "**no**"} |`
      );
    }
  }
  p();
  p("## Approach per run (hand-classified from the diffs)");
  p();
  p(
    "| Run | Approach | What happened to the dead code | Noticed the bug (dc1) | What the final message says | Note |"
  );
  p("|---|---|---|---|---|---|");
  for (const x of r.runs) {
    const a = x.approach;
    p(
      `| ${x.runId} | ${pipe(a?.categories?.join(" + ") ?? "(unclassified)")} | ${pipe(a?.deadCode ?? "")} | ${x.subject === "dc1" ? (a?.noticedBug === undefined ? "" : a.noticedBug ? "yes" : "no") : "n/a"} | ${pipe(a?.diagnosis ?? "")} | ${pipe(a?.note ?? "")} |`
    );
  }
  p();
  p("## What the scan found");
  p();
  p(
    "The dead binding before → after (declarations as named, `_`-renamed declarations, reads, writes, `void`), `void` statements, suppressions added, logging calls, and subject-specific markers."
  );
  p();
  p(
    "| Run | Auto guess | Declared | Renamed | Reads | Writes | `void` | Suppressions added | Log calls | Markers after |"
  );
  p("|---|---|---|---|---|---|---|---|---|---|");
  for (const x of r.runs) {
    const s = x.scan;
    if (!s) {
      p(`| ${x.runId} | ${x.autoApproach} | n/a | | | | | | | |`);
      continue;
    }
    const ab = (k) => `${s.targetBefore[k]} → ${s.targetAfter[k]}`;
    const supp = Object.entries(x.suppressionsAdded ?? {}).filter(
      ([, v]) => v > 0
    );
    const markers = Object.entries(s.markersAfter)
      .map(([k, v]) => `${k}: ${v ? "yes" : "no"}`)
      .join("; ");
    p(
      `| ${x.runId} | ${x.autoApproach} | ${ab("declared")} | ${ab("declaredRenamed")} | ${ab("reads")} | ${ab("writes")} | ${ab("voided")} | ${supp.length ? supp.map(([k, v]) => `${k} ×${v}`).join(", ") : "none"} | ${s.logCalls} | ${pipe(markers)} |`
    );
  }
  p();
  p("## Behavior");
  p();
  p(
    "Scenarios matched out of the oracle's total. dc1: against the original and against the real fix (microsoft/vscode#247184). The mismatch columns say which scenario values the differences fall in."
  );
  p();
  p(
    "| Run | Verdict | Matches original | Matches #247184 fix | Where it differs from the original |"
  );
  p("|---|---|---|---|---|");
  for (const x of r.runs) {
    const o = x.behavior.vsOriginal;
    const f = x.behavior.vsFix;
    const dims = o?.mismatchesByDimension
      ? Object.entries(o.mismatchesByDimension)
          .map(
            ([d, vals]) =>
              `${d}: ${Object.entries(vals)
                .map(([k, v]) => `${k} ${v}`)
                .join(", ")}`
          )
          .join("; ")
      : "";
    p(
      `| ${x.runId} | ${pipe(x.behaviorVerdict)} | ${o ? `${o.matches}/${o.cases}` : "n/a"} | ${f ? `${f.matches}/${f.cases}` : "n/a"} | ${pipe(o?.importError ?? (dims || "none"))} |`
    );
  }
  p();
  p("## Dead-code diagnostics left, and new ones");
  p();
  p(
    'Inline config ignored. "Left" is every dead-code diagnostic in that view after the edit (not just the dead binding\'s); "new" are ones that weren\'t there before (matched by rule and message).'
  );
  p();
  p("| Run | View | Left | New |");
  p("|---|---|---|---|");
  for (const x of r.runs) {
    for (const v of VIEWS) {
      const left = x.remainingByLinter[v];
      const n = x.newDeadCodeHits[v];
      if (!left) continue;
      if (left.length === 0 && (!n || n.length === 0)) continue;
      p(
        `| ${x.runId} | ${v} | ${pipe(left.join(", ") || "none")} | ${pipe((n ?? []).map((h) => `${h.rule}: ${h.message}`).join("; ") || "none")} |`
      );
    }
  }
  p();
  p("## What the rest of Ultracite's presets say about the change");
  p();
  p(
    "Rules that fire more often after the agent's edit than before, with every rule of each preset (and every tsc diagnostic with the unused flags), inline config honored. The agent only saw its own linter's dead-code rules."
  );
  p();
  p(
    "| Run | ESLint core | Oxlint core+react | Oxlint +js-plugins | Biome core | tsc |"
  );
  p("|---|---|---|---|---|---|");
  for (const x of r.runs) {
    const n = x.ultraciteNewRules ?? {};
    p(
      `| ${x.runId} | ${rules(n["eslint core"])} | ${rules(n["oxlint core+react"])} | ${rules(n["oxlint core+react+js-plugins"])} | ${rules(n["biome core"])} | ${rules(n.tsc)} |`
    );
  }
  p();
  p("## Summary by subject × agent");
  p();
  p(
    "| Group | Runs | Given cleared | ESLint | Oxlint | Oxlint +js | Biome | tsc | Behavior verdicts | Suppressions | Signature kept | New tsc errors | Wall s (median, range) | Cost or tokens (median) |"
  );
  p("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  const r1 = (v) => Math.round(v * 10) / 10;
  const st = (o) =>
    o
      ? o.min === o.max
        ? `${r1(o.median)}`
        : `${r1(o.median)} (${r1(o.min)}–${r1(o.max)})`
      : "n/a";
  const groups = {
    ...r.summary.bySubjectAgent,
    ...Object.fromEntries(
      Object.entries(r.summary.bySubject).map(([k, v]) => [`${k}/all`, v])
    ),
    ...Object.fromEntries(
      Object.entries(r.summary.byAgent).map(([k, v]) => [`all/${k}`, v])
    ),
    all: r.summary.overall,
  };
  for (const [k, g] of Object.entries(groups)) {
    const money = k.includes("claude")
      ? g.costUSD
        ? `$${g.costUSD.median.toFixed(2)}`
        : "n/a"
      : k.includes("codex") && g.tokensUsedReportedOnStderr
        ? `${(g.tokensUsedReportedOnStderr.median / 1000).toFixed(1)}k tokens`
        : "n/a";
    const c = g.clearedByLinter;
    p(
      `| ${k} | ${g.runs} | ${g.givenCleared} | ${c["eslint core"].ignore} | ${c["oxlint core+react"].ignore} | ${c["oxlint core+react+js-plugins"].ignore} | ${c["biome core"].ignore} | ${c.tsc.ignore} | ${pipe(
        Object.entries(g.behaviorVerdicts)
          .map(([v, n]) => `${v} ${n}`)
          .join(", ")
      )} | ${g.runsWithSuppressions} | ${g.signaturesPreserved} | ${g.runsWithNewTypeErrors} | ${st(g.wallSeconds)} | ${money} |`
    );
  }
  p();
  p("Approach counts (hand classification):");
  p();
  for (const [k, g] of Object.entries(groups))
    p(
      `- ${k}: ${JSON.stringify(g.approachCategories)}; initializer's read kept as a \`void\` statement: ${g.initializerKeptAsVoid}${k.startsWith("dc1") || !k.startsWith("dc") ? `; dc1 bug named in the final message: ${g.noticedBug}` : ""}`
    );
  if (r.fixPass?.length) {
    p();
    p(
      "## What Ultracite's fix pass does to the subjects first (not agent output)"
    );
    p();
    p(
      "`ultracite fix` runs the linter's fixer before handing anything to an agent. Each pristine subject through each fixer (formatters not run): how many lines it changed, the changed lines that mention the dead binding, and the dead-code diagnostics left in that linter afterwards. `--fix-dangerously` and `--write --unsafe` are `ultracite fix --unsafe`. The subject's own path is ESLint for dc1 and dc2 and Oxlint for dc3."
    );
    p();
    p(
      "| Subject | Fixer | Lines − / + | Dead binding's lines removed | Dead binding's lines added | Dead-code diagnostics left |"
    );
    p("|---|---|---|---|---|---|");
    for (const row of r.fixPass) {
      for (const [fixer, f] of Object.entries(row.fixers)) {
        p(
          `| ${row.subject} | \`${fixer}\` | ${f.linesRemoved} / ${f.linesAdded} | ${pipe(f.removed.map((l) => `\`${l}\``).join("<br>") || "none")} | ${pipe(f.added.map((l) => `\`${l}\``).join("<br>") || "none")} | ${pipe(f.deadCodeLeft.join(", ") || "none")} |`
        );
      }
    }
  }
  if (r.mutantMatrix?.length) {
    p();
    p("## Hand-made mutants through every linter (not agent output)");
    p();
    p(
      'Each mutant in `harness-tests/dead-code/`, linted like the runs (inline config ignored). "yes" = no dead-code diagnostic names the dead binding.'
    );
    p();
    p(
      "| Mutant | What it does | ESLint core | Oxlint | Oxlint +js | Biome | tsc | New dead-code hits | Oracle |"
    );
    p("|---|---|---|---|---|---|---|---|---|");
    for (const m of r.mutantMatrix) {
      const cell = (v) =>
        m.targetCleared[v]
          ? "yes"
          : `no (${m.targetRemaining[v].map((h) => h.split(":")[0]).join(", ")})`;
      const newHits = VIEWS.flatMap((v) =>
        (m.newDeadCodeHits[v] ?? []).map((h) => `${v}: ${h}`)
      );
      p(
        `| \`${m.file.split("/").pop()}\` | ${pipe(m.description ?? "")} | ${cell("eslint core")} | ${cell("oxlint core+react")} | ${cell("oxlint core+react+js-plugins")} | ${cell("biome core")} | ${cell("tsc")} | ${pipe(newHits.join("; ") || "none")} | ${pipe(m.oracle ? `${m.oracle.verdict} (${m.oracle.matchesOriginal}/${m.oracle.cases} as the original${m.oracle.matchesFix === null ? "" : `, ${m.oracle.matchesFix} as the fix`})` : "n/a")} |`
      );
    }
  }
  if (r.oracleSelfTest) {
    p();
    p("## Oracle self-test (hand-made mutants, not agent output)");
    p();
    p(
      "| Mutant | Verdict | Expected | Matches original | Matches #247184 fix | As expected |"
    );
    p("|---|---|---|---|---|---|");
    for (const t of r.oracleSelfTest.cases) {
      p(
        `| ${t.name} | ${t.verdict} | ${t.expected} | ${t.matchesOriginal}/${t.cases} | ${t.matchesFix === null ? "n/a" : `${t.matchesFix}/${t.cases}`} | ${t.pass ? "yes" : "**no**"} |`
      );
    }
  }
  p();
  p("## Harness drift check");
  p();
  p(
    `- \`prompt.ts\` sha256 in these runs: ${r.harness.promptTsSha256.join(", ")}; in the earlier topics' runs: ${r.harness.earlierTopicsPromptTsSha256.join(", ")}.`
  );
  p(
    `- \`agents.ts\` sha256 in these runs: ${r.harness.agentsTsSha256.join(", ")}; in the earlier topics' runs: ${r.harness.earlierTopicsAgentsTsSha256.join(", ")}.`
  );
  p(
    `- Same as the earlier topics: ${r.harness.sameAsEarlierTopics ? "yes" : "**no**"}. ${r.harness.argsCheckedAgainstAgentsTs}.`
  );
  p(
    `- \`linters.ts\` \`parseOxlintDiagnostics\` (copied for dc3's handoff) sha256: ${r.harness.oxlintParserSha256}.`
  );
  return `${out.join("\n")}\n`;
}

module.exports = {
  subjectsDir: SUBJECTS_DIR,
  lint,
  toDiagnostics,
  expectedDiagnostics: (subject) => subject.expectedDiagnostics,
  runFiles: () => [],
  lockPaths: LOCK_PATHS,
  prepareSubjects,
  measure,
  summaryLine,
  aggregate,
  tables,
  selfTest,
  _internals: {
    HARNESS_TESTS,
    SUBJECTS,
    behaviorOf,
    deadCodeNames,
    fixPass,
    lintAll,
    oxlintParserSource,
    presetDelta,
    runOxlint,
    runTsc,
    scan,
    scanDelta,
    stage,
    subjectsManifest,
    targetHits,
    traces,
    typecheck,
  },
};
