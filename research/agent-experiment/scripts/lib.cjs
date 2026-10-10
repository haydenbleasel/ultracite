// Shared tooling for the agent experiment. Nothing is installed: ESLint and
// @typescript-eslint/parser are resolved from this repo's packages/cli, and
// eslint-plugin-sonarjs and Biome from its node_modules (read-only), via the corpus
// harness's resolver (research/corpus/scripts/tools.cjs).
"use strict";

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { homedir, tmpdir } = require("node:os");
const { basename, join, resolve } = require("node:path");

const CENSUS_DIR = resolve(__dirname, "../../corpus/scripts");
const tools = require(join(CENSUS_DIR, "tools.cjs"));
const { plugin: census, collector } = require(
  join(CENSUS_DIR, "census-plugin.cjs")
);

const { ESLint, tsParser, sonarjs } = tools.load();
const HERE = resolve(__dirname, "..");
const REPO_ROOT = tools.ULTRACITE;
const AGENT_LIMIT = 15;

// One post's runs and results live in results/<topic>/. Agents run in RUN_ROOT, outside the
// repo, so they don't load its CLAUDE.md or AGENTS.md (or this harness) from a parent
// directory; run-one.mjs copies each run's artifacts back afterwards.
const TOPIC = process.env.RESEARCH_TOPIC ?? "cognitive-complexity";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const RUNS_DIR = join(RESULTS_DIR, "runs");
const RUN_ROOT = resolve(
  process.env.AGENT_EXPERIMENT_RUN_ROOT ??
    join(tmpdir(), "ultracite-agent-experiment", TOPIC)
);

const subjectPath = (subject) => join(HERE, subject.path);

// Lint or tool config an agent might create to silence the rule instead of fixing it.
const CONFIG_FILE =
  /^(eslint\.config\.|\.eslintrc|biome\.jsonc?$|\.oxlintrc|oxlint\.config\.|package\.json$|tsconfig.*\.json$|\.prettierrc|\.sonarlint|sonar-project\.properties$)/;

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

/**
 * Replaces machine-specific paths and session ids in anything written to a committed file,
 * so run artifacts never carry a home directory, temp path or session id.
 */
const redact = (value) => {
  // macOS resolves /tmp and /var through /private, and agents report either form.
  const replacements = [
    [`/private${RUN_ROOT}`, "<run-root>"],
    [RUN_ROOT, "<run-root>"],
    [HERE, "<experiment>"],
    [REPO_ROOT, "<repo>"],
    [`/private${tmpdir()}`, "<tmp>"],
    [tmpdir(), "<tmp>"],
    [homedir(), "~"],
  ];
  const text = replacements.reduce(
    (acc, [from, to]) => acc.split(from).join(to),
    JSON.stringify(value)
  );
  return JSON.parse(text.replace(UUID, "<uuid>"));
};

const parserOptions = {
  parser: tsParser,
  ecmaVersion: "latest",
  sourceType: "module",
};

/**
 * The lint the agent's diagnostic comes from: sonarjs/cognitive-complexity at 15 and nothing
 * else. `honorInlineConfig` true mirrors what Ultracite's re-lint would see (an eslint-disable
 * comment would hide the error); false measures whether the error genuinely cleared.
 */
async function lintCognitive(
  file,
  { honorInlineConfig = true, limit = AGENT_LIMIT } = {}
) {
  const eslint = new ESLint({
    cwd: resolve(file, ".."),
    overrideConfigFile: true,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.ts"],
        languageOptions: parserOptions,
        linterOptions: {
          noInlineConfig: !honorInlineConfig,
          reportUnusedDisableDirectives: "off",
        },
        plugins: { sonarjs },
        rules: { "sonarjs/cognitive-complexity": ["error", limit] },
      },
    ],
  });
  const [result] = await eslint.lintFiles([file]);
  // Round-trip through JSON: identical to what `eslint -f json` prints, which is what
  // Ultracite's ESLint adapter parses.
  return JSON.parse(JSON.stringify(result));
}

/**
 * Ultracite's ESLint adapter (packages/cli/src/agent-fix/linters.ts, parseEslintDiagnostics):
 * { column, file, line, message, raw, rule, severity } — no `help` or `url` for ESLint.
 */
function toUltraciteDiagnostics(result) {
  return (result.messages ?? []).map((message) => ({
    column: message.column ?? 1,
    file: result.filePath,
    line: message.line ?? 1,
    message: message.message ?? "",
    raw: message,
    rule: message.ruleId ?? "eslint",
    severity: message.severity === 2 ? "error" : "warning",
  }));
}

const SONAR_RE = /Cognitive Complexity from (\d+) to the 0 allowed/;
const CYCLO_RE = /has a complexity of (\d+)\. Maximum allowed is 0\./;
const DEPTH_RE = /Blocks are nested too deeply \((\d+)\)/;
const keyOfMsg = (m) => `${m.line}:${m.column}:${m.endLine}:${m.endColumn}`;

/**
 * Every function in the file (census: ESLint's `:function` selector, the unit sonarjs uses),
 * joined with its sonarjs cognitive score (limit 0; unreported = 0), ESLint core cyclomatic
 * `complexity` (classic, max 0; every function reports) and ESLint core `max-depth` (max 0;
 * the deepest block nesting reported inside the function, 0 if none).
 * Inline config is ignored so suppressed functions are still measured.
 */
async function scoreFunctions(file) {
  const eslint = new ESLint({
    cwd: resolve(file, ".."),
    overrideConfigFile: true,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.ts"],
        languageOptions: parserOptions,
        linterOptions: {
          noInlineConfig: true,
          reportUnusedDisableDirectives: "off",
        },
        plugins: { sonarjs, census },
        rules: {
          "sonarjs/cognitive-complexity": ["error", 0],
          complexity: ["error", { max: 0, variant: "classic" }],
          "max-depth": ["error", { max: 0 }],
          "census/functions": "error",
        },
      },
    ],
  });
  const [result] = await eslint.lintFiles([file]);
  const fatal = result.messages.filter((m) => m.fatal);
  if (fatal.length > 0) {
    return {
      parseError: fatal
        .map((m) => `${m.line}:${m.column} ${m.message}`)
        .join("; "),
      functions: [],
    };
  }
  const entry = collector.get(result.filePath) ?? { functions: [] };
  const fns = entry.functions.map((f) => ({
    name: f.name,
    kind: f.kind,
    startLine: f.startLine,
    endLine: f.endLine,
    lines: f.lines,
    nestedIn:
      f.parentIndex === null ? null : entry.functions[f.parentIndex].name,
    range: f.range,
    headStart: f.headStart,
    bodyStart: f.bodyStart,
    cognitive: 0,
    cyclomatic: null,
    maxDepth: 0,
    biome: null,
    _sonarKey: f.sonarKey,
    _eslintKey: f.eslintKey,
  }));
  const bySonar = new Map(fns.map((f) => [f._sonarKey, f]));
  const byEslint = new Map(fns.map((f) => [f._eslintKey, f]));
  const unmatched = [];
  for (const m of result.messages) {
    if (m.ruleId === "sonarjs/cognitive-complexity") {
      const fn = bySonar.get(keyOfMsg(m));
      if (fn) fn.cognitive = Number(SONAR_RE.exec(m.message)[1]);
      else unmatched.push(m);
    } else if (m.ruleId === "complexity") {
      const fn = byEslint.get(keyOfMsg(m));
      if (fn) fn.cyclomatic = Number(CYCLO_RE.exec(m.message)[1]);
      else unmatched.push(m);
    } else if (m.ruleId === "max-depth") {
      // max-depth reports the block node; attribute it to the innermost function containing it.
      const depth = Number(DEPTH_RE.exec(m.message)[1]);
      const pos = { line: m.line, column: m.column };
      const fn = innermostContaining(fns, pos);
      if (fn) fn.maxDepth = Math.max(fn.maxDepth, depth);
      else unmatched.push(m);
    }
  }
  for (const f of fns) {
    delete f._sonarKey;
    delete f._eslintKey;
  }
  return { parseError: null, functions: fns, unmatched };
}

function innermostContaining(fns, pos) {
  // Functions are in source order; the last one whose line span contains the position and
  // starts before it is the innermost (good enough for these small single files).
  let best = null;
  for (const f of fns) {
    const startsBefore =
      f.headStart.line < pos.line ||
      (f.headStart.line === pos.line && f.headStart.column <= pos.column);
    if (startsBefore && f.endLine >= pos.line) best = f;
  }
  return best;
}

// ---------------------------------------------------------------- Biome (secondary metric)

const BIOME_CONFIG_DIR = join(HERE, "biome-config");
writeFileSync(
  join(BIOME_CONFIG_DIR, "biome.json"),
  `${JSON.stringify(
    {
      root: true,
      vcs: { enabled: false },
      files: { ignoreUnknown: true },
      formatter: { enabled: false },
      assist: { enabled: false },
      linter: {
        enabled: true,
        rules: {
          recommended: false,
          complexity: {
            noExcessiveCognitiveComplexity: {
              level: "error",
              options: { maxAllowedComplexity: 1 },
            },
          },
        },
      },
    },
    null,
    2
  )}\n`
);

/**
 * Biome 2.5.15 noExcessiveCognitiveComplexity at maxAllowedComplexity 1 (the lowest allowed).
 * The file is copied into biome-input/<tag>/ (no config files there) and linted with only our
 * config. `biome-ignore` is neutralised (same length) so suppressed functions are measured.
 * Biome only reports scores > 1, so an unreported function scored 0 or 1.
 */
function biomeScores(file, tag) {
  const dir = join(HERE, "biome-input", tag);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const text = readFileSync(file, "utf8").replace(
    /biome-ignore/g,
    "biome_ignore"
  );
  const copy = join(dir, basename(file));
  writeFileSync(copy, text);
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        tools.biomeBin,
        "lint",
        `--config-path=${BIOME_CONFIG_DIR}`,
        "--reporter=json",
        "--max-diagnostics=none",
        "--only=complexity/noExcessiveCognitiveComplexity",
        copy,
      ],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (error) {
    stdout = error.stdout;
    if (!stdout) throw error;
  }
  const report = JSON.parse(stdout);
  const lines = text.split("\n");
  const scores = [];
  const other = [];
  for (const d of report.diagnostics ?? []) {
    if (d.category !== "lint/complexity/noExcessiveCognitiveComplexity") {
      other.push({ category: d.category, message: d.message });
      continue;
    }
    const m = /Excessive complexity of (\d+) detected/.exec(d.message);
    scores.push({
      score: m ? Number(m[1]) : null,
      pos: normalizePos(lines, d.location?.start),
      message: d.message,
    });
  }
  return { scores, other };
}

// Biome's span for a function on a new line starts at the end of the previous line (leading
// trivia); move such a position to the next non-blank character.
function normalizePos(lines, start) {
  if (!start) return null;
  let { line, column } = start;
  while (
    line <= lines.length &&
    column - 1 >= lines[line - 1].trimEnd().length
  ) {
    line++;
    const first = lines[line - 1]?.search(/\S/) ?? 0;
    column = first === -1 ? Number.POSITIVE_INFINITY : first + 1;
  }
  return { line, column };
}

/** Attach Biome scores to census functions: the diagnostic start lies in the function's head. */
function attachBiome(fns, biome) {
  const unmatched = [];
  for (const s of biome.scores) {
    const fn = s.pos
      ? fns.find((f) => {
          const afterHead =
            s.pos.line > f.headStart.line ||
            (s.pos.line === f.headStart.line &&
              s.pos.column >= f.headStart.column);
          const beforeBody =
            s.pos.line < f.bodyStart.line ||
            (s.pos.line === f.bodyStart.line &&
              s.pos.column <= f.bodyStart.column);
          return afterHead && beforeBody;
        })
      : null;
    if (fn) fn.biome = s.score;
    else unmatched.push(s);
  }
  for (const f of fns) if (f.biome === null) f.biome = "<=1";
  return unmatched;
}

// ---------------------------------------------------------------- Size

/** Non-blank lines (whole file) and code lines (lines holding at least one non-comment token). */
function sizeOf(file) {
  const text = readFileSync(file, "utf8");
  const nonBlank = text.split("\n").filter((l) => l.trim() !== "").length;
  let codeLines = null;
  try {
    const ast = tsParser.parse(text, {
      loc: true,
      range: true,
      tokens: true,
      comment: false,
    });
    const set = new Set();
    for (const t of ast.tokens)
      for (let l = t.loc.start.line; l <= t.loc.end.line; l++) set.add(l);
    codeLines = set.size;
  } catch {
    codeLines = null;
  }
  return { nonBlankLines: nonBlank, codeLines };
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

module.exports = {
  AGENT_LIMIT,
  CONFIG_FILE,
  ESLint,
  HERE,
  REPO_ROOT,
  RESULTS_DIR,
  RUN_ROOT,
  RUNS_DIR,
  TOPIC,
  attachBiome,
  biomeScores,
  lintCognitive,
  redact,
  scoreFunctions,
  sha256,
  sizeOf,
  subjectPath,
  toUltraciteDiagnostics,
  tools,
};
