// What `ultracite fix --claude/--codex` does around each agent run, mirrored for the harness from
// packages/cli/src/agent-fix/ (added with the accessibility topic, for run-one.mjs's retry loop):
//
//   - the linter adapters' passes (linters.ts): Oxlint's `oxlint --fix`, `oxfmt --write`, then a
//     report-only `oxlint -f json`; Biome's `biome check --write --reporter=json`, with each rule's
//     help from `biome explain`. `fixAndCollect` runs on the whole project, `verify` on one file.
//   - the parsers that turn each report into Ultracite's Diagnostic shape (linters.ts).
//   - groupByFile, verifySafely, attemptFileFix's retry condition and fixFileGroup's tally and notes
//     (index.ts), partitionByRemaining (diff.ts), and the agent timeout and kill grace
//     (run-agent.ts).
//
// The CLI's modules import its own dependencies (execa, clack) and can't run from the harness, so
// the code is copied. Every copied slice of the CLI source is hashed, and `checkSources()` fails a
// new run when one has changed. buildPrompt and buildRetryPrompt aren't copied: run-one.mjs imports
// them from prompt.ts.
//
// The harness runs the linters from this repo with the configs a topic writes (the root config
// `ultracite init` writes, passed with -c / --config-path), because the run directory has no
// node_modules. Each command is otherwise the one linters.ts runs, with the same arguments in the
// same order, from the run directory as the project root.
"use strict";

const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const lib = require("./lib.cjs");

const REPO = lib.REPO_ROOT;
const AGENT_FIX = join(REPO, "packages/cli/src/agent-fix");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ---------------------------------------------------------------- the CLI source this mirrors

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

// The hashes of the slices above in the CLI source this mirror was written from (HEAD 367d9085,
// after 40d646a4 "Hand agents fresher, better-described diagnostics").
const EXPECTED = {
  "linters.ts runPiped":
    "71d55a9308a32d1ca5387fadbc54704c72ff9214a02e346a53b3efae2f8f704a",
  "linters.ts oxlint":
    "fe698aa5e07dc7c6bd77bb7327d1f52c60ded6ee112eab1851028d3dd4995f2d",
  "linters.ts biome":
    "8c55adac2bf579da5fb3b0486f6fcd1d0e909384988c0e4ec62abea7571aaa50",
  "index.ts fixFileGroup":
    "d90ea5c8b41d29612714ab1d515d8a97f08d39e1d9ac8a73e2f89f8c354e6a3a",
  "index.ts MAX_AGENT_ATTEMPTS":
    "781710c5106a2adea80aa43611aa7dc9d682b663fd70a82856fdf7822f0dfcb6",
  "run-agent.ts":
    "2bb0ba8d2bb36173a51d59944d48800f58b17d73d72fdcdd54edb3d59e616177",
  "diff.ts": "3c6ce0e339024d72ae459696c9a956c5ecb625953046f3b8af2e3d86196a3140",
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

function parseOxlintDiagnostics(stdout) {
  const parsed = parseJsonOutput("oxlint", stdout);
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
const BIOME_RULE_CATEGORY_RE =
  /^(?<kind>lint|assist)\/[a-zA-Z]+\/(?<rule>[a-zA-Z]+)$/u;
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
    if (!file) {
      continue;
    }
    const category = diagnostic.category ?? "biome";
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
 * the project root the relative path resolves from.
 */
function verifySafely(verify, file, cwd) {
  if (!existsSync(join(cwd, file))) {
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

/** index.ts attemptFileFix: whether Ultracite hands the file back for another attempt. */
function shouldRetry({ remaining, timedOut, attempt, maxAttempts }) {
  const canRetry = !timedOut && attempt < maxAttempts;
  return remaining !== null && remaining.length > 0 && canRetry;
}

/** diff.ts: diagnostics are matched by rule and message only (spans shift with any edit). */
const diagnosticKey = (diagnostic) =>
  `${diagnostic.rule} ${diagnostic.message}`;
function partitionByRemaining(original, remaining) {
  const counts = new Map();
  for (const diagnostic of remaining) {
    const key = diagnosticKey(diagnostic);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cleared = [];
  const still = [];
  for (const diagnostic of original) {
    const key = diagnosticKey(diagnostic);
    const count = counts.get(key) ?? 0;
    if (count > 0) {
      counts.set(key, count - 1);
      still.push(diagnostic);
      continue;
    }
    cleared.push(diagnostic);
  }
  let introduced = 0;
  for (const count of counts.values()) {
    introduced += count;
  }
  return { cleared, introduced, still };
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

/**
 * index.ts fixFileGroup for the first file of a run (nothing cleared earlier) and runAgentFix's
 * outro: what Ultracite prints for the file once the retry loop ends. `issues` are the diagnostics
 * handed over on the first attempt, `agentResult` the last attempt's ({ ok, stderr, timedOut }),
 * `verified` the last verifySafely result.
 */
function fileOutcome({
  agentLabel,
  issues,
  attempts,
  agentResult,
  verified,
  timeoutMs,
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
      if (partition.introduced > 0) {
        notes.push(
          `${partition.introduced} new issue${partition.introduced === 1 ? "" : "s"} reported after the fix.`
        );
      }
      ({ cleared } = partition);
      fixed = cleared.length;
      remaining = partition.still.length + partition.introduced;
    }
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
  biomeBin,
  biomePass,
  checkSources,
  contract,
  fileOutcome,
  groupByFile,
  oxfmtBin,
  oxlintBin,
  oxlintPass,
  parseBiomeDiagnostics,
  parseOxlintDiagnostics,
  partitionByRemaining,
  shouldRetry,
  toOxlintRuleName,
  verifySafely,
};
