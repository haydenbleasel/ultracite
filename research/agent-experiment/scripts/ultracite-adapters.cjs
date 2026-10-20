// What `ultracite fix --claude/--codex` does around each agent run, mirrored for the harness from
// packages/cli/src/agent-fix/ (added with the accessibility topic, for run-one.mjs's retry loop):
//
//   - the linter adapters' passes (linters.ts): Oxlint's `oxlint --fix`, `oxfmt --write`, then a
//     report-only `oxlint -f json`; Biome's `biome check --write --reporter=json`, with each rule's
//     help from `biome explain`; ESLint's `eslint --fix`, `stylelint --fix` on the style files,
//     `prettier --write`, then a report-only `eslint -f json-with-metadata`, with each rule's help
//     from its docs (added with the sort-keys topic, with the linter-args.ts helpers it uses).
//     `fixAndCollect` runs on the whole project, `verify` on one file.
//   - the parsers that turn each report into Ultracite's Diagnostic shape (linters.ts).
//   - groupByFile, verifySafely, attemptFileFix's retry decision (toRetryIssues, and the issues
//     the agent left for review) and fixFileGroup's tally and notes (index.ts),
//     partitionByRemaining (diff.ts), and the agent timeout, kill grace and final message
//     (run-agent.ts).
//
// The CLI's modules import its own dependencies (execa, clack) and can't run from the harness, so
// the code is copied. Every copied slice of the CLI source is hashed, and `checkSources()` fails a
// new run when one has changed. buildPrompt, buildRetryPrompt, retryIssueOrder and
// parseLeftForReview aren't copied: run-one.mjs imports them from prompt.ts.
//
// The harness runs the linters from this repo with the configs a topic writes (the root config
// `ultracite init` writes, passed with -c / --config-path), because the run directory has no
// node_modules. Each command is otherwise the one linters.ts runs, with the same arguments in the
// same order, from the run directory as the project root.
"use strict";

const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, readFileSync, statSync } = require("node:fs");
const { dirname, extname, join, resolve } = require("node:path");

const lib = require("./lib.cjs");

const REPO = lib.REPO_ROOT;
const CLI = join(REPO, "packages/cli");
const AGENT_FIX = join(CLI, "src/agent-fix");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ---------------------------------------------------------------- the CLI source this mirrors

// `file` is relative to packages/cli/src/agent-fix (`../linter-args.ts` for the helpers in src/).
const sourceSlice = (file, start, end, { inclusive = true } = {}) => {
  const src = readFileSync(join(AGENT_FIX, file), "utf8");
  const a = src.indexOf(start);
  const b = src.indexOf(end, a);
  if (a === -1 || b === -1) {
    throw new Error(`${start.slice(0, 40)} not found in ${file}`);
  }
  return src.slice(a, inclusive ? b + end.length : b);
};
const wholeFile = (file) => readFileSync(join(AGENT_FIX, file), "utf8");

const SLICES = {
  // runPiped and parseJsonOutput: how each linter is spawned and its JSON read.
  "linters.ts runPiped": () =>
    sourceSlice(
      "linters.ts",
      "const runPiped = ",
      "const toTargets = (files: string[], fallback: string): string[] =>\n  files.length > 0 ? files : [fallback];"
    ),
  // toOxlintRuleName through the Oxlint adapter (parser, pass, verify).
  "linters.ts oxlint": () =>
    sourceSlice(
      "linters.ts",
      "const OXLINT_CODE_RE = ",
      "verify: (file, passthrough) => runOxlintPass([file], passthrough),\n};"
    ),
  // biomeDiagnosticFile through the Biome adapter (URL, explain, parser, pass, verify).
  "linters.ts biome": () =>
    sourceSlice(
      "linters.ts",
      "const biomeDiagnosticFile = ",
      "verify: (file, passthrough) => runBiomePass([file], passthrough),\n};"
    ),
  // The ESLint report's shape through the ESLint adapter (parser, pass, verify). Added with the
  // sort-keys topic.
  "linters.ts eslint": () =>
    sourceSlice(
      "linters.ts",
      "interface EslintMessage {",
      "verify: (file, passthrough) => runEslintPass([file], passthrough),\n};"
    ),
  // The ESLint pass's helpers in src/linter-args.ts: which targets Stylelint gets, and the
  // --no-warn-ignored flag for explicit files.
  "linter-args.ts toStylelintTargets": () =>
    sourceSlice(
      "../linter-args.ts",
      "const STYLE_FILE_GLOB = ",
      "  return targets;\n};"
    ),
  "linter-args.ts eslintIgnoredFileArgs": () =>
    sourceSlice(
      "../linter-args.ts",
      "export const eslintIgnoredFileArgs = (",
      "    : [];"
    ),
  // groupByFile through fixFileGroup: handoff order, failure notes, verifySafely, the retry loop,
  // and the per-file tally.
  "index.ts fixFileGroup": () =>
    sourceSlice(
      "index.ts",
      "const groupByFile = ",
      "/**\n * An earlier file's fix can change what a later file reports",
      { inclusive: false }
    ),
  "index.ts MAX_AGENT_ATTEMPTS": () =>
    sourceSlice("index.ts", "const MAX_AGENT_ATTEMPTS = ", ";"),
  "run-agent.ts": () => wholeFile("run-agent.ts"),
  "diff.ts": () => wholeFile("diff.ts"),
};

// The hashes of the slices above in the CLI source this mirror was written from (9f80955d
// "Judge agent-fix retries by what the previous edit did"; the accessibility runs used 367d9085).
// The ESLint and linter-args.ts slices were added with the sort-keys topic, from f8960ace, where
// every other slice still had the hash below.
const EXPECTED = {
  "linters.ts runPiped":
    "71d55a9308a32d1ca5387fadbc54704c72ff9214a02e346a53b3efae2f8f704a",
  "linters.ts oxlint":
    "63367b0ccedd24c57879ad1205742a240b208fd9752eb65c3a49a254441651ec",
  "linters.ts biome":
    "78ca3a052954ce6bfe9e124fdeea0639b28ddba63bba2fe2016ee136379feb53",
  "linters.ts eslint":
    "a23c0f082fa4af9a97404a85adcb6e1b37e36bf8bc8ae24fba4109df59269c15",
  "linter-args.ts toStylelintTargets":
    "e8f3d1f4ce2e05f2355e1b0508fd07abead391bd44e589ec81529749ff4c4c86",
  "linter-args.ts eslintIgnoredFileArgs":
    "d88aff616f3629e83096f53f82663083cde34e33766d3e309a9d1de125c37932",
  "index.ts fixFileGroup":
    "5ef37d0abc8632451d8d82651fcf14b622330b9019749aea450d53169694468b",
  "index.ts MAX_AGENT_ATTEMPTS":
    "781710c5106a2adea80aa43611aa7dc9d682b663fd70a82856fdf7822f0dfcb6",
  "run-agent.ts":
    "da583d8571a407f166c2a45d25e11dba88cf599da4bd47f661ae8041cea12738",
  "diff.ts": "c164c9834c95764158f9511790b1cfbd2f0944023f06c8af609c54391e40f8c9",
};

/**
 * Hashes every mirrored slice. `strict` (a new run) throws when one differs from EXPECTED;
 * otherwise the differences are returned, so a re-measurement can record them.
 */
function checkSources({ strict = true } = {}) {
  const hashes = {};
  const drift = [];
  for (const [name, slice] of Object.entries(SLICES)) {
    hashes[name] = sha256(slice());
    if (hashes[name] !== EXPECTED[name]) {
      drift.push(name);
    }
  }
  if (strict && drift.length > 0) {
    throw new Error(
      `packages/cli/src/agent-fix changed since scripts/ultracite-adapters.cjs was written (${drift.join(", ")}); update the mirror: ${JSON.stringify(hashes)}`
    );
  }
  return {
    drift,
    hashes,
    promptTsSha256: sha256(wholeFile("prompt.ts")),
    agentsTsSha256: sha256(wholeFile("agents.ts")),
    indexTsSha256: sha256(wholeFile("index.ts")),
    lintersTsSha256: sha256(wholeFile("linters.ts")),
    runAgentTsSha256: sha256(wholeFile("run-agent.ts")),
    diffTsSha256: sha256(wholeFile("diff.ts")),
  };
}

const constantMs = (file, name) => {
  const m = new RegExp(`const ${name} = ([\\d_ *]+);`).exec(wholeFile(file));
  if (!m) {
    throw new Error(`${name} not found in ${file}`);
  }
  return m[1]
    .split("*")
    .map((x) => Number(x.trim().replaceAll("_", "")))
    .reduce((a, b) => a * b, 1);
};

/** The retry loop's constants, read from the CLI source. */
function contract() {
  return {
    maxAttempts: constantMs("index.ts", "MAX_AGENT_ATTEMPTS"),
    timeoutMs: constantMs("run-agent.ts", "AGENT_TIMEOUT_MS"),
    killGraceMs: constantMs("run-agent.ts", "KILL_GRACE_MS"),
    outputCap: constantMs("run-agent.ts", "OUTPUT_CAP"),
  };
}

// ---------------------------------------------------------------- tools

const oxlintBin = join(
  dirname(require.resolve("oxlint/package.json", { paths: [REPO] })),
  "bin/oxlint"
);
const oxfmtBin = join(
  dirname(require.resolve("oxfmt/package.json", { paths: [REPO] })),
  "bin/oxfmt"
);
const biomeBin = lib.tools.biomeBin;

// linters.ts PIPED_MAX_BUFFER and runPiped: linters exit non-zero while diagnostics remain, so only a
// spawn failure or a signal is an error.
const PIPED_MAX_BUFFER = 512 * 1024 * 1024;
function runPiped(label, bin, args, cwd) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: PIPED_MAX_BUFFER,
  });
  if (result.error) {
    throw new Error(`Failed to run ${label}: ${result.error.message}`);
  }
  if (result.status === null) {
    throw new Error(
      `${label} was killed by signal ${result.signal ?? "unknown"}`
    );
  }
  return String(result.stdout ?? "");
}

const STDERR_TAIL_LENGTH = 500;
function parseJsonOutput(label, stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(
      `Failed to parse JSON output from ${label}: ${stdout.slice(0, STDERR_TAIL_LENGTH) || "(empty output)"}`
    );
  }
}

const toTargets = (files, fallback) => (files.length > 0 ? files : [fallback]);

// ---------------------------------------------------------------- Oxlint (linters.ts)

const OXLINT_CODE_RE = /^(?<plugin>[\w-]+)\((?<rule>[^)]+)\)$/u;
function toOxlintRuleName(code) {
  const match = OXLINT_CODE_RE.exec(code);
  if (!match?.groups) {
    return code;
  }
  const { plugin, rule } = match.groups;
  return plugin === "eslint" ? rule : `${plugin}/${rule}`;
}
const UNUSED_DIRECTIVE_RE = /^Unused (?:oxlint|eslint)-(?:disable|enable)/u;
const isOxlintFatal = (diagnostic) =>
  !diagnostic.code && !UNUSED_DIRECTIVE_RE.test(diagnostic.message ?? "");

// linters.ts stripOxlintNotice: with nothing to lint, Oxlint prints "No files found to lint…" on
// stdout ahead of its JSON report.
function stripOxlintNotice(stdout) {
  const start = stdout.indexOf("{");
  return start > 0 ? stdout.slice(start) : stdout;
}

function parseOxlintDiagnostics(stdout) {
  const parsed = parseJsonOutput("oxlint", stripOxlintNotice(stdout));
  const diagnostics = [];
  for (const diagnostic of parsed.diagnostics ?? []) {
    if (!diagnostic.filename) {
      continue;
    }
    const span = diagnostic.labels?.[0]?.span;
    diagnostics.push({
      column: span?.column ?? 1,
      fatal: isOxlintFatal(diagnostic),
      file: diagnostic.filename,
      help: diagnostic.help,
      line: span?.line ?? 1,
      message: diagnostic.message ?? "",
      raw: diagnostic,
      rule: diagnostic.code ? toOxlintRuleName(diagnostic.code) : "oxlint",
      severity: diagnostic.severity ?? "error",
      url: diagnostic.url,
    });
  }
  return diagnostics;
}

/**
 * linters.ts runOxlintPass with no passthrough: `oxlint --fix`, `oxfmt --write`, then `oxlint -f
 * json` on the same targets, from `cwd`. `config` and `fmtConfig` are passed with -c (Ultracite
 * finds the project's own). Returns the diagnostics and the raw report.
 */
function oxlintPass({ cwd, files = [], config, fmtConfig }) {
  const targets = toTargets(files, ".");
  const ox = ["-c", config, "--disable-nested-config"];
  runPiped("oxlint", oxlintBin, [...ox, "--fix", ...targets], cwd);
  runPiped("oxfmt", oxfmtBin, ["-c", fmtConfig, "--write", ...targets], cwd);
  const stdout = runPiped(
    "oxlint",
    oxlintBin,
    [...ox, "-f", "json", ...targets],
    cwd
  );
  return { diagnostics: parseOxlintDiagnostics(stdout), stdout };
}

// ---------------------------------------------------------------- Biome (linters.ts)

function biomeDiagnosticFile(diagnostic) {
  const diagnosticPath = diagnostic.location?.path;
  if (typeof diagnosticPath === "string") {
    return diagnosticPath;
  }
  return diagnosticPath?.file ?? null;
}
// The group can contain digits: `lint/a11y/useAltText`.
const BIOME_RULE_CATEGORY_RE =
  /^(?<kind>lint|assist)\/[a-zA-Z0-9]+\/(?<rule>[a-zA-Z]+)$/u;
const UPPERCASE_RE = /[A-Z]/gu;
function parseBiomeRuleCategory(category) {
  const groups = BIOME_RULE_CATEGORY_RE.exec(category)?.groups;
  return groups?.kind && groups.rule
    ? { kind: groups.kind, rule: groups.rule }
    : null;
}
function biomeRuleUrl(category) {
  const parsed = parseBiomeRuleCategory(category);
  if (!parsed) {
    return undefined;
  }
  const slug = parsed.rule.replaceAll(
    UPPERCASE_RE,
    (letter) => `-${letter.toLowerCase()}`
  );
  const section = parsed.kind === "lint" ? "linter/rules" : "assist/actions";
  return `https://biomejs.dev/${section}/${slug}`;
}
const BIOME_HEADING_RE = /^\S/u;
function parseBiomeExplainDescription(output) {
  const lines = output.split("\n");
  const start = lines.findIndex((line) => line.trim() === "Description");
  if (start === -1) {
    return undefined;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => BIOME_HEADING_RE.test(line));
  const description = (end === -1 ? rest : rest.slice(0, end))
    .map((line) => line.trim())
    .join("\n")
    .trim();
  return description || undefined;
}
const biomeRuleHelp = new Map();
function explainBiomeRule(category) {
  const cached = biomeRuleHelp.get(category);
  const parsed = parseBiomeRuleCategory(category);
  if (cached !== undefined || !parsed) {
    return cached;
  }
  const result = spawnSync(
    process.execPath,
    [biomeBin, "explain", parsed.rule],
    {
      encoding: "utf8",
    }
  );
  const help =
    result.status === 0
      ? parseBiomeExplainDescription(String(result.stdout ?? ""))
      : undefined;
  if (help !== undefined) {
    biomeRuleHelp.set(category, help);
  }
  return help;
}

function parseBiomeDiagnostics(stdout) {
  const parsed = parseJsonOutput("biome", stdout);
  const diagnostics = [];
  for (const diagnostic of parsed.diagnostics ?? []) {
    const file = biomeDiagnosticFile(diagnostic);
    const category = diagnostic.category ?? "biome";
    // An internal error (internalError/io for a file Biome can't write) isn't a lint issue.
    if (!file || category.startsWith("internalError/")) {
      continue;
    }
    diagnostics.push({
      column: diagnostic.location?.start?.column ?? 1,
      fatal: category === "parse",
      file,
      help: explainBiomeRule(category),
      line: diagnostic.location?.start?.line ?? 1,
      message: diagnostic.message ?? "",
      raw: diagnostic,
      rule: category,
      severity: diagnostic.severity ?? "error",
      url: biomeRuleUrl(category),
    });
  }
  return diagnostics;
}

/**
 * linters.ts runBiomePass with no passthrough: `biome check --write --no-errors-on-unmatched
 * --reporter=json` on the targets, from `cwd`. Biome finds its config at the root of `cwd`, as in
 * a project, unless `configDir` is passed with --config-path (then project files such as
 * package.json are looked up next to the config, not in `cwd`). Ultracite's
 * findUnresolvableBiomeConfig check has nothing to check here.
 */
function biomePass({ cwd, files = [], configDir = null }) {
  const stdout = runPiped(
    "biome",
    biomeBin,
    [
      "check",
      "--write",
      "--no-errors-on-unmatched",
      ...(configDir ? [`--config-path=${configDir}`] : []),
      "--reporter=json",
      ...toTargets(files, "./"),
    ],
    cwd
  );
  return { diagnostics: parseBiomeDiagnostics(stdout), stdout };
}

// ---------------------------------------------------------------- ESLint (linters.ts, linter-args.ts)

const binOf = (pkg, rel) =>
  join(dirname(require.resolve(`${pkg}/package.json`, { paths: [CLI] })), rel);
// ESLint, Prettier and Stylelint as `ultracite init --linter eslint` installs them: packages/cli's.
const eslintBin = binOf("eslint", "bin/eslint.js");
const prettierBin = binOf("prettier", "bin/prettier.cjs");
const stylelintBin = binOf("stylelint", "bin/stylelint.mjs");

// linter-args.ts STYLE_FILE_GLOB and toStylelintTargets: Stylelint gets the style files, and a
// style-scoped glob for each directory (the project root when no files are given). `cwd` stands in
// for the CLI's process.cwd(), the project root, when a target is checked for being a directory.
const STYLE_FILE_GLOB = "**/*.{css,scss,less}";
const styleExtensions = [".css", ".scss", ".less"];
const GLOB_SPECIAL_CHARS_RE = /[!()*+?@[\]{|}]/gu;
const escapeGlobPath = (dir) =>
  dir.replaceAll(GLOB_SPECIAL_CHARS_RE, String.raw`\$&`);
const hasExtension = (file, extensions) => {
  const lowered = file.toLowerCase();
  return extensions.some((extension) => lowered.endsWith(extension));
};
const isDirectory = (file, cwd) => {
  try {
    return statSync(resolve(cwd, file)).isDirectory();
  } catch {
    return false;
  }
};
function toStylelintTargets(files, cwd) {
  if (files.length === 0) {
    return [STYLE_FILE_GLOB];
  }
  const targets = [];
  for (const file of files) {
    if (hasExtension(file, styleExtensions)) {
      targets.push(file);
      continue;
    }
    // (The CLI also turns Windows separators into `/` here.)
    if (extname(file) === "" || isDirectory(file, cwd)) {
      const base = file.replace(/\/+$/u, "");
      targets.push(
        base === "." || base === ""
          ? STYLE_FILE_GLOB
          : `${escapeGlobPath(base)}/${STYLE_FILE_GLOB}`
      );
    }
  }
  return targets;
}

/** linter-args.ts eslintIgnoredFileArgs, with no passthrough. */
const eslintIgnoredFileArgs = (files) =>
  files.length > 0 ? ["--no-warn-ignored"] : [];

/**
 * linters.ts parseEslintDiagnostics: the json-with-metadata report, each rule's help and URL from
 * the docs in its meta. ESLint names files by absolute path.
 */
function parseEslintDiagnostics(stdout) {
  const parsed = parseJsonOutput("eslint", stdout);
  const rulesMeta = parsed.metadata?.rulesMeta ?? {};
  const diagnostics = [];
  for (const result of Array.isArray(parsed.results) ? parsed.results : []) {
    if (!result.filePath) {
      continue;
    }
    for (const message of result.messages ?? []) {
      const docs = message.ruleId ? rulesMeta[message.ruleId]?.docs : undefined;
      diagnostics.push({
        column: message.column ?? 1,
        fatal: message.fatal === true,
        file: result.filePath,
        help: docs?.description,
        line: message.line ?? 1,
        message: message.message ?? "",
        raw: message,
        rule: message.ruleId ?? "eslint",
        severity: message.severity === 2 ? "error" : "warning",
        url: docs?.url,
      });
    }
  }
  return diagnostics;
}

/**
 * linters.ts runEslintPass with no passthrough: `eslint --fix`, `stylelint --fix
 * --allow-empty-input` on the style targets (skipped when there are none, as for one .ts file),
 * `prettier --write`, then `eslint -f json-with-metadata`, on the same targets, from `cwd`. The
 * configs are passed with --config (Ultracite's tools find the project's own: the files `ultracite
 * init` writes, which import `ultracite/...`). Returns the diagnostics, the raw report and each
 * step's exit status.
 */
function eslintPass({
  cwd,
  files = [],
  config,
  prettierConfig,
  stylelintConfig,
}) {
  const targets = toTargets(files, ".");
  const ignoredFileArgs = eslintIgnoredFileArgs(files);
  const es = ["--config", config];
  const steps = {};
  const run = (step, label, bin, args) => {
    const result = spawnSync(process.execPath, [bin, ...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: PIPED_MAX_BUFFER,
    });
    if (result.error) {
      throw new Error(`Failed to run ${label}: ${result.error.message}`);
    }
    if (result.status === null) {
      throw new Error(
        `${label} was killed by signal ${result.signal ?? "unknown"}`
      );
    }
    steps[step] = result.status;
    return String(result.stdout ?? "");
  };
  run("eslint --fix", "eslint", eslintBin, [
    ...es,
    "--fix",
    ...ignoredFileArgs,
    ...targets,
  ]);
  const stylelintTargets = toStylelintTargets(files, cwd);
  if (stylelintTargets.length > 0) {
    run("stylelint --fix", "stylelint", stylelintBin, [
      "--config",
      stylelintConfig,
      "--fix",
      "--allow-empty-input",
      ...stylelintTargets,
    ]);
  }
  run("prettier --write", "prettier", prettierBin, [
    "--config",
    prettierConfig,
    "--write",
    ...targets,
  ]);
  const stdout = run("eslint -f json-with-metadata", "eslint", eslintBin, [
    ...es,
    ...ignoredFileArgs,
    "-f",
    "json-with-metadata",
    ...targets,
  ]);
  return { diagnostics: parseEslintDiagnostics(stdout), stdout, steps };
}

// ---------------------------------------------------------------- index.ts and diff.ts

/** index.ts groupByFile: one group per file, in path order. */
function groupByFile(diagnostics) {
  const groups = new Map();
  for (const diagnostic of diagnostics) {
    const issues = groups.get(diagnostic.file);
    if (issues) {
      issues.push(diagnostic);
      continue;
    }
    groups.set(diagnostic.file, [diagnostic]);
  }
  return [...groups.entries()]
    .map(([file, issues]) => ({ file, issues }))
    .toSorted((a, b) => a.file.localeCompare(b.file));
}

/**
 * index.ts verifySafely: a missing file is a failed verification; otherwise the adapter's verify
 * pass, keeping only this file's diagnostics. `verify(file)` is the topic's adapter pass; `cwd` is
 * the project root a relative path resolves from (ESLint's paths are absolute, and resolve to
 * themselves; added with the sort-keys topic, the same as join for a relative path).
 */
function verifySafely(verify, file, cwd) {
  if (!existsSync(resolve(cwd, file))) {
    return { error: "the file no longer exists.", remaining: null };
  }
  try {
    const allRemaining = verify(file);
    return {
      error: null,
      remaining: allRemaining.filter((diagnostic) => diagnostic.file === file),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      remaining: null,
    };
  }
}

/** diff.ts: diagnostics are matched by rule and message only (spans shift with any edit). */
const diagnosticKey = (diagnostic) =>
  `${diagnostic.rule}\u0000${diagnostic.message}`;

/**
 * diff.ts partitionByRemaining: `cleared` and `still` are originals, `introduced` and
 * `stillReported` are the fresh reports (with current line numbers).
 */
function partitionByRemaining(original, remaining) {
  const unmatched = new Map();
  for (const diagnostic of original) {
    const key = diagnosticKey(diagnostic);
    const group = unmatched.get(key);
    if (group) {
      group.push(diagnostic);
      continue;
    }
    unmatched.set(key, [diagnostic]);
  }
  const matched = new Set();
  const introduced = [];
  const stillReported = [];
  for (const diagnostic of remaining) {
    const match = unmatched.get(diagnosticKey(diagnostic))?.shift();
    if (match) {
      matched.add(match);
      stillReported.push(diagnostic);
      continue;
    }
    introduced.push(diagnostic);
  }
  return {
    cleared: original.filter((diagnostic) => !matched.has(diagnostic)),
    introduced,
    still: original.filter((diagnostic) => matched.has(diagnostic)),
    stillReported,
  };
}

/**
 * index.ts toRetryIssues: what's still reported against what the previous attempt was given. A
 * file that no longer parses counts every diagnostic as still reported.
 */
function toRetryIssues(previous, remaining) {
  if (remaining.some((diagnostic) => diagnostic.fatal)) {
    return { introduced: [], still: remaining };
  }
  const { introduced, stillReported } = partitionByRemaining(
    previous,
    remaining
  );
  return { introduced, still: stillReported };
}

/**
 * index.ts attemptFileFix: whether Ultracite hands the file back for another attempt, and with
 * what. `issues` are the ones this attempt was given, `leftForReview` every attempt's
 * parseLeftForReview result so far. Returns the next attempt's RetryIssues (number them with
 * prompt.ts retryIssueOrder), or null for no retry: verification failed, the agent timed out, the
 * attempt limit was reached, or nothing is reported but what the agent left for review.
 */
function nextRetry({
  issues,
  remaining,
  leftForReview,
  timedOut,
  attempt,
  maxAttempts,
}) {
  if (remaining === null || timedOut || attempt >= maxAttempts) {
    return null;
  }
  const { introduced: unresolved } = partitionByRemaining(
    leftForReview.flatMap((entry) => entry.issues),
    remaining
  );
  if (unresolved.length === 0) {
    return null;
  }
  return toRetryIssues(issues, unresolved);
}

/** run-agent.ts: the agent's final message is its stdout, trimmed, keeping the tail. */
function agentOutput(stdout, outputCap) {
  return stdout.trim().slice(-outputCap);
}

const MS_PER_MINUTE = 60_000;
const STDERR_NOTE_LENGTH = 200;
function buildFailureNote(agentLabel, { stderr, timedOut }, timeoutMs) {
  if (timedOut) {
    return `${agentLabel} timed out after ${timeoutMs / MS_PER_MINUTE} minutes.`;
  }
  const stderrTail = stderr.trim().slice(-STDERR_NOTE_LENGTH);
  return `${agentLabel} exited with an error${stderrTail ? `: ${stderrTail}` : "."}`;
}

/** index.ts describeLeftForReview: the line for one attempt's issues left for a person. */
function describeLeftForReview(agentLabel, { explanation, issues }) {
  const summary = `${agentLabel} left ${issues.length} issue${issues.length === 1 ? "" : "s"} for you to decide`;
  return explanation ? `${summary}:\n${explanation}` : `${summary}.`;
}

/**
 * index.ts fixFileGroup for the first file of a run (nothing cleared earlier) and runAgentFix's
 * outro: what Ultracite prints for the file once the retry loop ends. `issues` are the diagnostics
 * handed over on the first attempt, `agentResult` the last attempt's ({ ok, stderr, timedOut }),
 * `verified` the last verifySafely result, `leftForReview` every attempt's parseLeftForReview
 * result ({ explanation, issues }; only the count of issues is read). `notes` ends with one entry
 * per attempt that left issues for review; Ultracite prints the others on one line and each of
 * those on lines of its own.
 */

function fileOutcome({
  agentLabel,
  issues,
  attempts,
  agentResult,
  verified,
  timeoutMs,
  leftForReview = [],
}) {
  const notes = [];
  if (!agentResult.ok) {
    notes.push(buildFailureNote(agentLabel, agentResult, timeoutMs));
  }
  if (attempts > 1) {
    notes.push(`Took ${attempts} attempts.`);
  }
  let fixed;
  let remaining;
  let cleared = [];
  if (verified.remaining === null) {
    notes.push(`Verification failed: ${verified.error}`);
    fixed = 0;
    remaining = issues.length;
  } else {
    const parseError = verified.remaining.find((d) => d.fatal);
    if (parseError) {
      notes.push(
        `The file no longer parses (line ${parseError.line}: ${parseError.message}).`
      );
      fixed = 0;
      remaining = Math.max(issues.length, verified.remaining.length);
    } else {
      const partition = partitionByRemaining(issues, verified.remaining);
      const introduced = partition.introduced.length;
      if (introduced > 0) {
        notes.push(
          `${introduced} new issue${introduced === 1 ? "" : "s"} reported after the fix.`
        );
      }
      ({ cleared } = partition);
      fixed = cleared.length;
      remaining = partition.still.length + introduced;
    }
  }
  for (const entry of leftForReview) {
    notes.push(describeLeftForReview(agentLabel, entry));
  }
  return {
    fixed,
    remaining,
    notes,
    issueFixed: issues.map((issue) => cleared.includes(issue)),
    outro: `Fixed ${fixed} of ${issues.length} issue${issues.length === 1 ? "" : "s"} with ${agentLabel}.`,
    exitCode: remaining > 0 ? 1 : 0,
  };
}

const AGENT_LABELS = { claude: "Claude Code", codex: "Codex" };

module.exports = {
  AGENT_LABELS,
  agentOutput,
  biomeBin,
  biomePass,
  checkSources,
  contract,
  eslintBin,
  eslintPass,
  fileOutcome,
  groupByFile,
  oxfmtBin,
  oxlintBin,
  oxlintPass,
  parseBiomeDiagnostics,
  parseEslintDiagnostics,
  parseOxlintDiagnostics,
  prettierBin,
  stylelintBin,
  toStylelintTargets,
  nextRetry,
  partitionByRemaining,
  toOxlintRuleName,
  verifySafely,
};
