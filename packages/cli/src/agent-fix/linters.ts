import {
  buildUnresolvableBiomeConfigMessage,
  findUnresolvableBiomeConfig,
  UltraciteSetupError,
} from "../config-resolution";
import { eslintIgnoredFileArgs, toStylelintTargets } from "../linter-args";
import { assertBunCanLint, spawnBun } from "../linters/bun";
import { spawnSync } from "../spawn-sync";
import type { SpawnSyncResult } from "../spawn-sync";
import type { Linter } from "../utils";
import type { Diagnostic, LinterAdapter } from "./types";

const STDERR_TAIL_LENGTH = 500;

/**
 * Linters exit non-zero whenever diagnostics remain, which is the expected
 * state here — only a failure to spawn or a signal kill is an actual error.
 */
// A repo with a few thousand remaining diagnostics can exceed the default
// output buffer and abort the run with ENOBUFS, so raise it explicitly.
const PIPED_MAX_BUFFER = 512 * 1024 * 1024;

const readPiped = (
  command: string,
  result: SpawnSyncResult,
  { optional = false } = {}
): string => {
  // An optional tool that isn't installed is skipped, as in the plain fix flow.
  if (optional && result.errorCode === "ENOENT") {
    return "";
  }

  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }

  if (result.status === null) {
    throw new Error(
      `${command} was killed by signal ${result.signal ?? "unknown"}`
    );
  }

  return String(result.stdout ?? "");
};

const runPiped = (
  command: string,
  args: string[],
  options: { optional?: boolean } = {}
): string =>
  readPiped(
    command,
    spawnSync(command, args, { maxBuffer: PIPED_MAX_BUFFER }),
    options
  );

/**
 * Parse a linter's JSON report. The type argument names the reporter's
 * schema; every field in those schemas is optional and defaulted by the
 * caller, so a payload that doesn't match degrades to empty diagnostics
 * instead of crashing.
 */
const parseJsonOutput = <T>(command: string, stdout: string): T => {
  try {
    // SAFETY: T is a reporter schema whose fields are all optional and
    // defaulted downstream, so an unexpected payload can't be misused.
    return JSON.parse(stdout) as T;
  } catch {
    throw new Error(
      `Failed to parse JSON output from ${command}: ${stdout.slice(0, STDERR_TAIL_LENGTH) || "(empty output)"}`
    );
  }
};

const toTargets = (files: string[], fallback: string): string[] =>
  files.length > 0 ? files : [fallback];

interface OxlintLabel {
  span?: { column?: number; line?: number };
}

interface OxlintDiagnostic {
  code?: string;
  filename?: string;
  help?: string;
  labels?: OxlintLabel[];
  message?: string;
  severity?: string;
  url?: string;
}

interface OxlintReport {
  diagnostics?: OxlintDiagnostic[];
}

// Oxlint reports codes as `plugin(rule)`, e.g. `eslint(no-eval)` or
// `typescript(no-explicit-any)`. The agent gets the name the rule has in the
// config instead: bare for the core ESLint rules, `plugin/rule` otherwise.
const OXLINT_CODE_RE = /^(?<plugin>[\w-]+)\((?<rule>[^)]+)\)$/u;

const toOxlintRuleName = (code: string): string => {
  const match = OXLINT_CODE_RE.exec(code);

  if (!match?.groups) {
    return code;
  }

  const { plugin, rule } = match.groups;

  return plugin === "eslint" ? rule : `${plugin}/${rule}`;
};

// Rule diagnostics carry a code. Of those that don't, everything but an
// unused disable directive is a parse or semantic error.
const UNUSED_DIRECTIVE_RE = /^Unused (?:oxlint|eslint)-(?:disable|enable)/u;

const isOxlintFatal = (diagnostic: OxlintDiagnostic): boolean =>
  !diagnostic.code && !UNUSED_DIRECTIVE_RE.test(diagnostic.message ?? "");

const parseOxlintDiagnostics = (stdout: string): Diagnostic[] => {
  const parsed = parseJsonOutput<OxlintReport>("oxlint", stdout);
  const diagnostics: Diagnostic[] = [];

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
};

// The linter and formatter an Oxlint config pass runs: oxlint and oxfmt, or
// `bun lint` and `bun fmt`, which read the same configs, take the same flags
// and print the same JSON report.
interface OxlintTools {
  format: (args: string[]) => string;
  lint: (args: string[]) => string;
}

const oxlintTools: OxlintTools = {
  format: (args) => runPiped("oxfmt", args),
  lint: (args) => runPiped("oxlint", args),
};

const bunTools: OxlintTools = {
  format: (args) =>
    readPiped(
      "bun fmt",
      spawnBun("fmt", args, { maxBuffer: PIPED_MAX_BUFFER })
    ),
  lint: (args) =>
    readPiped(
      "bun lint",
      spawnBun("lint", args, { maxBuffer: PIPED_MAX_BUFFER })
    ),
};

// Lint fixes first, then the formatter, matching the plain `fix` path: a
// fixer can insert unformatted code and oxfmt is not a diagnostic source, so
// a formatter-first pass would report "no issues" on a file that still fails
// `oxfmt --check`. The diagnostics handed to the agent come from a final
// report-only pass so their line numbers reflect the formatted file.
const runOxlintPass = (
  tools: OxlintTools,
  files: string[],
  passthrough: string[]
): Diagnostic[] => {
  const hasUnsafe = passthrough.includes("--unsafe");
  const filteredPassthrough = passthrough.filter((arg) => arg !== "--unsafe");
  const targets = toTargets(files, ".");

  tools.lint([
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    ...targets,
  ]);

  tools.format(["--write", ...targets]);

  // The JSON reporter goes after the passthrough so a user-supplied format
  // flag can't override it and break the parser.
  const stdout = tools.lint([...filteredPassthrough, "-f", "json", ...targets]);

  return parseOxlintDiagnostics(stdout);
};

const oxlintAdapter: LinterAdapter = {
  fixAndCollect: (files, passthrough) =>
    runOxlintPass(oxlintTools, files, passthrough),
  name: "Oxlint",
  verify: (file, passthrough) =>
    runOxlintPass(oxlintTools, [file], passthrough),
};

const runBunPass = (files: string[], passthrough: string[]): Diagnostic[] => {
  assertBunCanLint();

  return runOxlintPass(bunTools, files, passthrough);
};

const bunAdapter: LinterAdapter = {
  fixAndCollect: runBunPass,
  name: "Bun",
  verify: (file, passthrough) => runBunPass([file], passthrough),
};

interface BiomeDiagnostic {
  category?: string;
  location?: {
    path?: string | { file?: string };
    start?: { column?: number; line?: number };
  };
  message?: string;
  severity?: string;
}

const biomeDiagnosticFile = (diagnostic: BiomeDiagnostic): string | null => {
  const diagnosticPath = diagnostic.location?.path;

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- decoding Biome's JSON reporter, where `location.path` is either a string or a { file } object
  if (typeof diagnosticPath === "string") {
    return diagnosticPath;
  }

  return diagnosticPath?.file ?? null;
};

interface BiomeReport {
  diagnostics?: BiomeDiagnostic[];
}

const BIOME_RULE_CATEGORY_RE =
  /^(?<kind>lint|assist)\/[a-zA-Z]+\/(?<rule>[a-zA-Z]+)$/u;

const UPPERCASE_RE = /[A-Z]/gu;

const parseBiomeRuleCategory = (
  category: string
): { kind: string; rule: string } | null => {
  const groups = BIOME_RULE_CATEGORY_RE.exec(category)?.groups;

  return groups?.kind && groups.rule
    ? { kind: groups.kind, rule: groups.rule }
    : null;
};

// Rule pages are the kebab-cased rule name: noExplicitAny is
// /linter/rules/no-explicit-any, organizeImports /assist/actions/organize-imports.
const biomeRuleUrl = (category: string): string | undefined => {
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
};

const BIOME_HEADING_RE = /^\S/u;

/**
 * The Description section of `biome explain <rule>`: the indented lines
 * between the "Description" heading and the next unindented one.
 */
const parseBiomeExplainDescription = (output: string): string | undefined => {
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
};

const biomeRuleHelp = new Map<string, string>();

/**
 * Biome's JSON reporter leaves `advices` empty for lint rules, so without
 * this an agent gets only the message, e.g. an unnamed "This import is
 * unused." The rule's documentation, from `biome explain`, stands in for the
 * help text Oxlint reports. Best effort and cached per rule: a rule Biome
 * can't explain just goes without.
 */
const explainBiomeRule = (category: string): string | undefined => {
  const cached = biomeRuleHelp.get(category);
  const parsed = parseBiomeRuleCategory(category);

  if (cached !== undefined || !parsed) {
    return cached;
  }

  const result = spawnSync("biome", ["explain", parsed.rule]);

  const help =
    result.status === 0
      ? parseBiomeExplainDescription(String(result.stdout ?? ""))
      : undefined;

  if (help !== undefined) {
    biomeRuleHelp.set(category, help);
  }

  return help;
};

const parseBiomeDiagnostics = (stdout: string): Diagnostic[] => {
  const parsed = parseJsonOutput<BiomeReport>("biome", stdout);
  const diagnostics: Diagnostic[] = [];

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
};

const runBiomePass = (files: string[], passthrough: string[]): Diagnostic[] => {
  const unresolvableConfig = findUnresolvableBiomeConfig();

  if (unresolvableConfig) {
    throw new UltraciteSetupError(
      buildUnresolvableBiomeConfigMessage(unresolvableConfig)
    );
  }

  // The JSON reporter goes after the passthrough so a user-supplied reporter
  // flag can't override it and break the parser.
  const stdout = runPiped("biome", [
    "check",
    "--write",
    "--no-errors-on-unmatched",
    ...passthrough,
    "--reporter=json",
    ...toTargets(files, "./"),
  ]);

  return parseBiomeDiagnostics(stdout);
};

const biomeAdapter: LinterAdapter = {
  fixAndCollect: runBiomePass,
  name: "Biome",
  verify: (file, passthrough) => runBiomePass([file], passthrough),
};

interface EslintMessage {
  column?: number;
  fatal?: boolean;
  line?: number;
  message?: string;
  ruleId?: string | null;
  severity?: number;
}

interface EslintResult {
  filePath?: string;
  messages?: EslintMessage[];
}

interface EslintRuleMeta {
  docs?: { description?: string; url?: string };
}

// The json-with-metadata formatter: the json formatter's results, plus the
// meta of every rule that reported, which is where the docs live.
interface EslintReport {
  metadata?: { rulesMeta?: Record<string, EslintRuleMeta | undefined> };
  results?: EslintResult[];
}

const parseEslintDiagnostics = (stdout: string): Diagnostic[] => {
  const parsed = parseJsonOutput<EslintReport>("eslint", stdout);
  const rulesMeta = parsed.metadata?.rulesMeta ?? {};
  const diagnostics: Diagnostic[] = [];

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
};

/**
 * Stylelint and Prettier run as plain autofix steps — their issues are not
 * handed to the agent in v1. The order matches the plain fix flow: ESLint,
 * then Stylelint, then Prettier, so every fixer's output gets formatted. A
 * final report-only ESLint pass collects the diagnostics so their line
 * numbers reflect the formatted file.
 */
const runEslintPass = (
  files: string[],
  passthrough: string[]
): Diagnostic[] => {
  const targets = toTargets(files, ".");
  const ignoredFileArgs = eslintIgnoredFileArgs(files, passthrough);

  runPiped("eslint", ["--fix", ...ignoredFileArgs, ...passthrough, ...targets]);

  const stylelintTargets = toStylelintTargets(files);

  if (stylelintTargets.length > 0) {
    runPiped(
      "stylelint",
      ["--fix", "--allow-empty-input", ...stylelintTargets],
      { optional: true }
    );
  }

  runPiped("prettier", ["--write", ...targets]);

  // The JSON reporter goes after the passthrough so a user-supplied format
  // flag can't override it and break the parser.
  const stdout = runPiped("eslint", [
    ...ignoredFileArgs,
    ...passthrough,
    "-f",
    "json-with-metadata",
    ...targets,
  ]);

  return parseEslintDiagnostics(stdout);
};

const eslintAdapter: LinterAdapter = {
  fixAndCollect: runEslintPass,
  name: "ESLint",
  verify: (file, passthrough) => runEslintPass([file], passthrough),
};

const linterAdapters = {
  biome: biomeAdapter,
  bun: bunAdapter,
  eslint: eslintAdapter,
  oxlint: oxlintAdapter,
} satisfies Record<Linter, LinterAdapter>;

export const getLinterAdapter = (linter: Linter): LinterAdapter =>
  linterAdapters[linter];
